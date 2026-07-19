import { Injectable, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma.service';

export interface RegisterDto {
  username?: string;
  email?: string;
  password?: string;
  city?: string;
  region?: string;
}

export interface LoginDto {
  email?: string;
  password?: string;
}

export interface GoogleAuthDto {
  // ID token ("credential") returned by Google Identity Services on the client.
  credential?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class AuthService {
  private googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  constructor(private prisma: PrismaService) {}

  private sanitize(user: any) {
    const { password, googleId, unlockedItems, profile, ...rest } = user;
    let items: string[] = [];
    try {
      const parsed = JSON.parse(unlockedItems ?? '[]');
      if (Array.isArray(parsed)) items = parsed;
    } catch {
      // leave empty on malformed data
    }
    // profile is null for users who never finished the wizard; the client then
    // routes them into it (see Root.tsx).
    let customization: unknown = undefined;
    if (profile) {
      try {
        customization = JSON.parse(profile);
      } catch {
        // malformed blob: treat as "no profile yet" rather than failing login
      }
    }
    return { ...rest, unlockedItems: items, profile: customization };
  }

  async register(dto: RegisterDto) {
    const username = (dto.username ?? '').trim();
    const email = (dto.email ?? '').trim().toLowerCase();
    const password = dto.password ?? '';
    const city = (dto.city ?? '').trim();
    const region = (dto.region ?? '').trim();

    if (username.length < 3) {
      throw new BadRequestException('Ім’я користувача має містити щонайменше 3 символи');
    }
    if (!EMAIL_RE.test(email)) {
      throw new BadRequestException('Введіть коректну електронну пошту');
    }
    if (password.length < 8) {
      throw new BadRequestException('Пароль має містити щонайменше 8 символів');
    }
    if (!region) {
      throw new BadRequestException('Оберіть область');
    }
    if (!city) {
      throw new BadRequestException('Оберіть місто');
    }

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      throw new ConflictException(
        existing.email === email
          ? 'Користувач з такою поштою вже існує'
          : 'Це ім’я користувача вже зайняте',
      );
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        username,
        email,
        password: hashed,
        city,
        region,
        name: username,
      },
    });

    return { user: this.sanitize(user) };
  }

  async login(dto: LoginDto) {
    const email = (dto.email ?? '').trim().toLowerCase();
    const password = dto.password ?? '';

    if (!email || !password) {
      throw new BadRequestException('Введіть пошту та пароль');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      throw new UnauthorizedException('Невірна пошта або пароль');
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Невірна пошта або пароль');
    }

    return { user: this.sanitize(user) };
  }

  async loginWithGoogle(dto: GoogleAuthDto) {
    const credential = dto.credential ?? '';
    if (!credential) {
      throw new BadRequestException('Відсутній токен Google');
    }

    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Не вдалося перевірити токен Google');
    }

    const email = (payload?.email ?? '').trim().toLowerCase();
    const googleId = payload?.sub;
    if (!googleId || !email) {
      throw new UnauthorizedException('Google не надав необхідні дані профілю');
    }

    let user = await this.prisma.user.findUnique({ where: { googleId } });
    let isNew = false;
    if (!user) {
      // A local account may already exist with this email — link it instead
      // of creating a duplicate.
      const existingByEmail = await this.prisma.user.findUnique({ where: { email } });
      if (existingByEmail) {
        user = await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: { googleId },
        });
      } else {
        const username = await this.generateUsernameFromEmail(email);
        const displayName = (payload?.name ?? username).trim();
        user = await this.prisma.user.create({
          data: {
            username,
            email,
            googleId,
            name: displayName,
            avatar: payload?.picture ?? undefined,
          },
        });
        isNew = true;
      }
    }

    return { user: this.sanitize(user), isNew };
  }

  // Derives a unique username from the local part of the Google account's
  // email (e.g. "jane.doe@gmail.com" -> "jane.doe", disambiguated with a
  // numeric suffix on collision).
  private async generateUsernameFromEmail(email: string): Promise<string> {
    const base = (email.split('@')[0] || 'user').replace(/[^a-zA-Z0-9_.]/g, '').slice(0, 20) || 'user';
    let candidate = base;
    let suffix = 0;
    while (await this.prisma.user.findUnique({ where: { username: candidate } })) {
      suffix += 1;
      candidate = `${base}${suffix}`;
    }
    return candidate;
  }
}
