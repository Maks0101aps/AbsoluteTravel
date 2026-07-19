import { Injectable, BadRequestException, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma.service';
import { MailService } from '../mail/mail.service';
import { generateUniqueFriendCode } from '../friends/friend-code.util';

// How long a fresh verification link stays valid.
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

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

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  private sanitize(user: any) {
    const { password, googleId, unlockedItems, profile, verificationToken, verificationTokenExpires, ...rest } = user;
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
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const friendCode = await generateUniqueFriendCode(this.prisma);
    const user = await this.prisma.user.create({
      data: {
        username,
        email,
        password: hashed,
        city,
        region,
        name: username,
        isVerified: false,
        verificationToken,
        verificationTokenExpires: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
        friendCode,
      },
    });

    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT ?? '3000'}`;
    const verifyUrl = `${backendUrl}/api/auth/verify-email?token=${verificationToken}`;
    await this.mail.sendVerificationEmail(user.email, user.name, verifyUrl);

    return { user: this.sanitize(user), requiresVerification: true };
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

    if (!user.isVerified) {
      throw new UnauthorizedException('Підтвердіть свою електронну пошту перед входом. Перевірте вашу поштову скриньку.');
    }

    return { user: this.sanitize(user) };
  }

  async verifyEmail(rawToken: string) {
    const token = (rawToken ?? '').trim();
    if (!token) {
      throw new BadRequestException('Відсутній токен підтвердження');
    }

    const user = await this.prisma.user.findUnique({ where: { verificationToken: token } });
    if (!user || !user.verificationTokenExpires || user.verificationTokenExpires < new Date()) {
      throw new BadRequestException('Посилання для підтвердження недійсне або застаріле');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, verificationToken: null, verificationTokenExpires: null },
    });

    return { ok: true };
  }

  // Mailtrap's sandbox SMTP (used in local dev) never delivers to a real
  // inbox — it only captures mail into Mailtrap's own testing UI. Until this
  // project is pointed at a real "Email Sending" SMTP relay, this endpoint
  // lets local development skip clicking the (undeliverable) link so the
  // rest of the app can still be exercised end-to-end. Disabled whenever
  // NODE_ENV is explicitly 'production'.
  async devVerify(rawEmail: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Недоступно в продакшені');
    }
    const email = (rawEmail ?? '').trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Введіть електронну пошту');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('Користувача не знайдено');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, verificationToken: null, verificationTokenExpires: null },
    });

    return { ok: true };
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
          // Google already vouches for this email, and the account may have
          // been sitting unverified from an abandoned local registration.
          where: { id: existingByEmail.id },
          data: { googleId, isVerified: true },
        });
      } else {
        const username = await this.generateUsernameFromEmail(email);
        const displayName = (payload?.name ?? username).trim();
        const friendCode = await generateUniqueFriendCode(this.prisma);
        user = await this.prisma.user.create({
          data: {
            username,
            email,
            googleId,
            name: displayName,
            avatar: payload?.picture ?? undefined,
            isVerified: true,
            friendCode,
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
