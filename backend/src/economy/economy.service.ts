import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { priceOf, reasonReward } from './catalog';

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
    await this.getUserOrThrow(userId);

    const price = priceOf(itemId);
    if (price === null) {
      throw new BadRequestException('Невідомий товар');
    }

    // Re-read, check and debit inside one transaction. Previously the balance
    // was checked against a row read earlier and `unlockedItems` was written
    // back wholesale, so two purchases racing each other could both clear the
    // same balance (driving coins negative), and the second could drop the
    // first item from the list while still charging for it.
    return await this.prisma.$transaction(async (tx) => {
      const fresh = await tx.user.findUnique({
        where: { id: userId },
        select: { coins: true, unlockedItems: true },
      });
      if (!fresh) throw new NotFoundException('Користувача не знайдено');

      const owned = parseUnlocked(fresh.unlockedItems);
      if (owned.includes(itemId)) {
        throw new ConflictException('Вже придбано');
      }

      // Conditional debit: the balance test and the decrement are a single
      // statement, so it cannot be satisfied by coins another purchase has
      // already spent. count === 0 means the funds went away underneath us.
      const debited = await tx.user.updateMany({
        where: { id: userId, coins: { gte: price } },
        data: { coins: { decrement: price } },
      });
      if (debited.count === 0) {
        throw new BadRequestException('Не вистачає монет');
      }

      const nextOwned = [...owned, itemId];
      const updated = await tx.user.update({
        where: { id: userId },
        data: { unlockedItems: JSON.stringify(nextOwned) },
      });
      await tx.coinTransaction.create({
        data: { userId, amount: -price, reason: `purchase:${itemId}` },
      });

      return { coins: updated.coins, unlockedItems: nextOwned };
    });
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
