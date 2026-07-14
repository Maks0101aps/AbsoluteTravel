import { Injectable, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  private sanitize(user: any) {
    const { password, unlockedItems, ...rest } = user;
    let items: string[] = [];
    try {
      const parsed = JSON.parse(unlockedItems ?? '[]');
      if (Array.isArray(parsed)) items = parsed;
    } catch {
      // leave empty on malformed data
    }
    return { ...rest, unlockedItems: items };
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
    if (!user) {
      throw new UnauthorizedException('Невірна пошта або пароль');
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Невірна пошта або пароль');
    }

    return { user: this.sanitize(user) };
  }
}
