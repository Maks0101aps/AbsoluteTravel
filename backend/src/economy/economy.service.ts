import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { priceOf, reasonReward } from './catalog';
import { CASES, pickReward } from './cases';

// NOTE: there is no auth token in this app yet — the client sends its own userId,
// matching the trust model of the existing auth flow. Hardening (JWT/session) is
// tracked as a follow-up; see the plan's security note.
export interface EarnDto {
  userId?: number;
  reason?: string;
}

export interface PurchaseDto {
  userId?: number;
  itemId?: string;
}

export interface OpenCaseDto {
  userId?: number;
  caseId?: string;
}

// Marker reason recorded once a one-time (free) case has been opened.
const caseOpenReason = (caseId: string) => `caseopen:${caseId}`;

function parseUnlocked(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

@Injectable()
export class EconomyService {
  constructor(private prisma: PrismaService) {}

  private async getUserOrThrow(userId: number) {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('Не вказано користувача');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Користувача не знайдено');
    return user;
  }

  async wallet(userId: number) {
    const user = await this.getUserOrThrow(userId);
    const transactions = await this.prisma.coinTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return {
      coins: user.coins,
      unlockedItems: parseUnlocked(user.unlockedItems),
      transactions,
    };
  }

  async earn(dto: EarnDto) {
    const userId = Number(dto.userId);
    const reason = (dto.reason ?? '').trim();
    const user = await this.getUserOrThrow(userId);

    const amount = reasonReward(reason);
    if (amount <= 0) {
      throw new BadRequestException('Невідома причина нарахування');
    }

    // One-off rewards (profile_complete, first_login, achievement:<id>) are paid once.
    // Add repeatable reasons to this allowlist if/when they exist.
    const existing = await this.prisma.coinTransaction.findFirst({
      where: { userId, reason },
    });
    if (existing) {
      return { coins: user.coins, awarded: 0 };
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { coins: { increment: amount } },
      }),
      this.prisma.coinTransaction.create({
        data: { userId, amount, reason },
      }),
    ]);

    return { coins: updated.coins, awarded: amount };
  }

  async purchase(dto: PurchaseDto) {
    const userId = Number(dto.userId);
    const itemId = (dto.itemId ?? '').trim();
    const user = await this.getUserOrThrow(userId);

    const price = priceOf(itemId);
    if (price === null) {
      throw new BadRequestException('Невідомий товар');
    }

    const owned = parseUnlocked(user.unlockedItems);
    if (owned.includes(itemId)) {
      throw new ConflictException('Вже придбано');
    }
    if (user.coins < price) {
      throw new BadRequestException('Не вистачає монет');
    }

    const nextOwned = [...owned, itemId];
    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          coins: { decrement: price },
          unlockedItems: JSON.stringify(nextOwned),
        },
      }),
      this.prisma.coinTransaction.create({
        data: { userId, amount: -price, reason: `purchase:${itemId}` },
      }),
    ]);

    return { coins: updated.coins, unlockedItems: nextOwned };
  }

  // Which one-time cases (currently just the free starter) a user has consumed.
  async casesState(userId: number) {
    await this.getUserOrThrow(userId);
    const oneTimeIds = Object.values(CASES)
      .filter((c) => c.oneTime)
      .map((c) => c.id);
    const opened = await this.prisma.coinTransaction.findMany({
      where: { userId, reason: { in: oneTimeIds.map(caseOpenReason) } },
      select: { reason: true },
    });
    const openedCaseIds = opened.map((t) => t.reason.replace('caseopen:', ''));
    return { openedCaseIds };
  }

  async openCase(dto: OpenCaseDto) {
    const userId = Number(dto.userId);
    const caseId = (dto.caseId ?? '').trim();
    const user = await this.getUserOrThrow(userId);

    const caseDef = CASES[caseId];
    if (!caseDef) throw new BadRequestException('Невідомий кейс');

    // One-time (free) case: block a second open.
    if (caseDef.oneTime) {
      const already = await this.prisma.coinTransaction.findFirst({
        where: { userId, reason: caseOpenReason(caseId) },
      });
      if (already) throw new ConflictException('Цей кейс вже відкрито');
    }

    if (caseDef.cost > 0 && user.coins < caseDef.cost) {
      throw new BadRequestException('Не вистачає монет');
    }

    const reward = pickReward(caseDef);
    const owned = parseUnlocked(user.unlockedItems);
    const duplicate = owned.includes(reward.itemId);
    const nextOwned = duplicate ? owned : [...owned, reward.itemId];

    // Duplicate rewards can't be granted twice, so refund half the case cost.
    const compensation = duplicate ? Math.floor(caseDef.cost / 2) : 0;
    const coinDelta = -caseDef.cost + compensation;

    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(coinDelta !== 0 ? { coins: { increment: coinDelta } } : {}),
          unlockedItems: JSON.stringify(nextOwned),
        },
      }),
      // Always record the open (also serves as the one-time "consumed" marker).
      this.prisma.coinTransaction.create({
        data: { userId, amount: coinDelta, reason: caseOpenReason(caseId) },
      }),
    ]);

    return {
      caseId,
      itemId: reward.itemId,
      rarity: reward.rarity,
      duplicate,
      compensation,
      coins: updated.coins,
      unlockedItems: nextOwned,
    };
  }

  async leaderboard() {
    const users = await this.prisma.user.findMany({
      orderBy: { coins: 'desc' },
      take: 20,
      select: {
        id: true,
        name: true,
        avatar: true,
        level: true,
        coins: true,
        rank: true,
        region: true,
      },
    });
    return users;
  }
}
