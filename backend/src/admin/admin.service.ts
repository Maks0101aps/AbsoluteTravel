import {
  Injectable,
  OnModuleInit,
  Logger,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma.service';

interface Session {
  adminId: number;
  expiresAt: number;
}

export interface AdminActor {
  id: number;
  login: string;
  name: string;
  isSuper: boolean;
}

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  // In-memory session store: opaque token -> session. Restarting the server
  // clears sessions (admins simply log in again) — acceptable for this app.
  private readonly sessions = new Map<string, Session>();
  private readonly TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

  constructor(private prisma: PrismaService) {}

  // The single, fixed super-admin credentials. Sourced from env so they stay
  // "always the same login and password"; sensible demo defaults otherwise.
  private get superLogin(): string {
    return process.env.ADMIN_LOGIN?.trim() || 'admin';
  }
  private get superPassword(): string {
    return process.env.ADMIN_PASSWORD?.trim() || 'admin123';
  }

  /** Ensure the one super admin always exists and matches the configured creds. */
  async onModuleInit() {
    const login = this.superLogin;
    const password = this.superPassword;
    if (password === 'admin123' || password.length < 12) {
      this.logger.warn(
        'Super-admin ADMIN_PASSWORD is weak or left at the demo default — set a strong value before deploying.',
      );
    }
    const hash = await bcrypt.hash(password, 10);

    const existingSuper = await this.prisma.admin.findFirst({ where: { isSuper: true } });
    if (existingSuper) {
      // Keep the single super admin in sync with the configured credentials.
      await this.prisma.admin.update({
        where: { id: existingSuper.id },
        data: { login, password: hash },
      });
    } else {
      await this.prisma.admin.upsert({
        where: { login },
        update: { password: hash, isSuper: true },
        create: { login, password: hash, name: 'Головний адміністратор', isSuper: true },
      });
    }
    this.logger.log(`Super admin ready (login: "${login}").`);
  }

  private toActor(a: { id: number; login: string; name: string; isSuper: boolean }): AdminActor {
    return { id: a.id, login: a.login, name: a.name, isSuper: a.isSuper };
  }

  // --- Auth ----------------------------------------------------------------

  async login(loginRaw?: string, passwordRaw?: string) {
    const login = (loginRaw ?? '').trim();
    const password = passwordRaw ?? '';
    if (!login || !password) {
      throw new BadRequestException('Введіть логін і пароль');
    }
    const admin = await this.prisma.admin.findUnique({ where: { login } });
    // bcrypt.compare is constant-time; run it even on a miss to blunt timing/
    // user-enumeration signals.
    const ok = await bcrypt.compare(password, admin?.password ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinv');
    if (!admin || !ok) {
      throw new UnauthorizedException('Невірний логін або пароль');
    }

    const token = randomBytes(32).toString('hex');
    this.sessions.set(token, { adminId: admin.id, expiresAt: Date.now() + this.TTL_MS });
    this.sweep();
    return { token, admin: this.toActor(admin) };
  }

  logout(token?: string) {
    if (token) this.sessions.delete(token);
    return { ok: true };
  }

  /** Resolve the admin behind a session token, or throw 401. */
  async requireAdmin(token?: string): Promise<AdminActor> {
    if (!token) throw new UnauthorizedException('Потрібна авторизація адміністратора');
    const session = this.sessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
      this.sessions.delete(token);
      throw new UnauthorizedException('Сесія завершилася — увійдіть знову');
    }
    const admin = await this.prisma.admin.findUnique({ where: { id: session.adminId } });
    if (!admin) {
      this.sessions.delete(token);
      throw new UnauthorizedException('Адміністратора не знайдено');
    }
    return this.toActor(admin);
  }

  async me(token?: string) {
    return this.requireAdmin(token);
  }

  // --- Admin account management --------------------------------------------

  async listAdmins(token?: string) {
    await this.requireAdmin(token);
    const admins = await this.prisma.admin.findMany({ orderBy: [{ isSuper: 'desc' }, { createdAt: 'asc' }] });
    return admins.map((a) => this.toActor(a));
  }

  async createAdmin(token: string | undefined, body: { login?: string; password?: string; name?: string }) {
    const actor = await this.requireAdmin(token);

    const login = (body.login ?? '').trim();
    const password = body.password ?? '';
    const name = (body.name ?? '').trim() || login;

    if (login.length < 3) throw new BadRequestException('Логін має містити щонайменше 3 символи');
    if (password.length < 6) throw new BadRequestException('Пароль має містити щонайменше 6 символів');
    if (login.toLowerCase() === this.superLogin.toLowerCase()) {
      throw new ConflictException('Цей логін зарезервовано для головного адміністратора');
    }
    const existing = await this.prisma.admin.findUnique({ where: { login } });
    if (existing) throw new ConflictException('Адміністратор з таким логіном вже існує');

    const hash = await bcrypt.hash(password, 10);
    const created = await this.prisma.admin.create({
      data: { login, password: hash, name, isSuper: false, createdBy: actor.name },
    });
    return this.toActor(created);
  }

  async deleteAdmin(token: string | undefined, id: number) {
    const actor = await this.requireAdmin(token);
    const target = await this.prisma.admin.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Адміністратора не знайдено');
    if (target.isSuper) {
      throw new ForbiddenException('Головного адміністратора видалити не можна');
    }
    if (target.id === actor.id) {
      throw new ForbiddenException('Не можна видалити власний акаунт');
    }
    await this.prisma.admin.delete({ where: { id } });
    // Invalidate any live sessions belonging to the removed admin.
    for (const [tok, s] of this.sessions) {
      if (s.adminId === id) this.sessions.delete(tok);
    }
    return { ok: true, id };
  }

  // Drop expired sessions opportunistically.
  private sweep() {
    const now = Date.now();
    for (const [tok, s] of this.sessions) {
      if (s.expiresAt < now) this.sessions.delete(tok);
    }
  }
}
