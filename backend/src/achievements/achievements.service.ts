import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { levelFromXp } from '../leveling';
import {
  ALL_ACHIEVEMENTS,
  REGULAR,
  WEEKLY,
  findAchievement,
  isoWeekKey,
  startOfIsoWeek,
  type AchievementDef,
  type Metric,
} from './achievements.catalog';

export interface ClaimDto {
  userId?: number;
  key?: string;
}

// The full progress snapshot for a user — every metric the catalog references.
type Metrics = Record<Metric, number>;

export interface AchievementView extends AchievementDef {
  progress: number; // current metric value (clamped to threshold for the bar)
  value: number; // raw metric value
  completed: boolean; // value >= threshold
  claimed: boolean; // reward already taken for the current period
  claimable: boolean; // completed && !claimed
}

@Injectable()
export class AchievementsService {
  constructor(private prisma: PrismaService) {}

  private async getUserOrThrow(userId: number) {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('Не вказано користувача');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Користувача не знайдено');
    return user;
  }

  // Compute every metric in one place from the user's real activity.
  private async computeMetrics(userId: number): Promise<Metrics> {
    const weekStart = startOfIsoWeek();

    const [user, checkmarks, cellsUnlocked, cellsThisWeek, friends, friendsThisWeek, coinAgg, coinWeekAgg] =
      await Promise.all([
        this.prisma.user.findUnique({ where: { id: userId }, select: { level: true } }),
        this.prisma.checkmark.findMany({
          where: { userId },
          select: { createdAt: true, place: { select: { region: true, category: true, difficulty: true } } },
        }),
        this.prisma.visitedCell.count({ where: { userId } }),
        this.prisma.visitedCell.count({ where: { userId, visitedAt: { gte: weekStart } } }),
        this.prisma.friend.count({
          where: { status: 'ACCEPTED', OR: [{ senderId: userId }, { receiverId: userId }] },
        }),
        this.prisma.friend.count({
          where: {
            status: 'ACCEPTED',
            createdAt: { gte: weekStart },
            OR: [{ senderId: userId }, { receiverId: userId }],
          },
        }),
        this.prisma.coinTransaction.aggregate({
          where: { userId, amount: { gt: 0 } },
          _sum: { amount: true },
        }),
        this.prisma.coinTransaction.aggregate({
          where: { userId, amount: { gt: 0 }, createdAt: { gte: weekStart } },
          _sum: { amount: true },
        }),
      ]);

    const weekMarks = checkmarks.filter((c) => c.createdAt >= weekStart);
    const regions = new Set(checkmarks.map((c) => c.place.region));
    const regionsThisWeek = new Set(weekMarks.map((c) => c.place.region));
    const categories = new Set(checkmarks.map((c) => c.place.category));

    return {
      placesVisited: checkmarks.length,
      cellsUnlocked,
      regionsVisited: regions.size,
      categoriesVisited: categories.size,
      friends,
      level: user?.level ?? 1,
      coinsEarned: coinAgg._sum.amount ?? 0,
      hardVisits: checkmarks.filter((c) => (c.place.difficulty ?? 1) >= 3).length,
      extremeVisits: checkmarks.filter((c) => (c.place.difficulty ?? 1) >= 4).length,
      placesThisWeek: weekMarks.length,
      cellsThisWeek,
      regionsThisWeek: regionsThisWeek.size,
      coinsThisWeek: coinWeekAgg._sum.amount ?? 0,
      friendsThisWeek,
    };
  }

  private periodOf(def: AchievementDef): string {
    return def.weekly ? isoWeekKey() : 'once';
  }

  private viewOf(def: AchievementDef, metrics: Metrics, claimedKeys: Set<string>): AchievementView {
    const value = metrics[def.metric] ?? 0;
    const completed = value >= def.threshold;
    const claimed = claimedKeys.has(`${def.key}:${this.periodOf(def)}`);
    return {
      ...def,
      value,
      progress: Math.min(value, def.threshold),
      completed,
      claimed,
      claimable: completed && !claimed,
    };
  }

  /** All achievements with this user's progress + claim state. */
  async list(userId: number) {
    await this.getUserOrThrow(userId);
    const metrics = await this.computeMetrics(userId);

    const claims = await this.prisma.achievementClaim.findMany({
      where: { userId },
      select: { achievementKey: true, periodKey: true },
    });
    const claimedKeys = new Set(claims.map((c) => `${c.achievementKey}:${c.periodKey}`));

    const weekly = WEEKLY.map((d) => this.viewOf(d, metrics, claimedKeys));
    const regular = REGULAR.map((d) => this.viewOf(d, metrics, claimedKeys));

    return {
      weekly,
      regular,
      weekKey: isoWeekKey(),
      claimableCount: [...weekly, ...regular].filter((a) => a.claimable).length,
    };
  }

  /** Claim a completed achievement's reward (XP + coins). Idempotent per period. */
  async claim(dto: ClaimDto) {
    const userId = Number(dto.userId);
    const key = (dto.key ?? '').trim();
    await this.getUserOrThrow(userId);

    const def = findAchievement(key);
    if (!def) throw new BadRequestException('Невідоме досягнення');

    const metrics = await this.computeMetrics(userId);
    const value = metrics[def.metric] ?? 0;
    if (value < def.threshold) {
      throw new BadRequestException('Досягнення ще не виконано');
    }

    const periodKey = this.periodOf(def);

    // Already claimed for this period? Return current wallet unchanged.
    const existing = await this.prisma.achievementClaim.findUnique({
      where: { userId_achievementKey_periodKey: { userId, achievementKey: key, periodKey } },
    });
    if (existing) {
      const fresh = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { coins: true, xp: true, level: true },
      });
      return {
        awarded: false,
        xpAwarded: 0,
        coinsAwarded: 0,
        coins: fresh?.coins ?? 0,
        xp: fresh?.xp ?? 0,
        level: fresh?.level ?? 1,
        leveledUp: false,
      };
    }

    // Grant XP + coins and record the claim + a coin transaction, all atomically.
    const reason = `achievement:${key}${def.weekly ? `:${periodKey}` : ''}`;
    const result = await this.prisma.$transaction(async (tx) => {
      const before = await tx.user.findUnique({
        where: { id: userId },
        select: { level: true },
      });
      const updated = await tx.user.update({
        where: { id: userId },
        data: { xp: { increment: def.xp }, coins: { increment: def.coins } },
        select: { coins: true, xp: true, level: true },
      });
      const newLevel = levelFromXp(updated.xp);
      if (newLevel !== updated.level) {
        await tx.user.update({ where: { id: userId }, data: { level: newLevel } });
      }
      await tx.achievementClaim.create({
        data: { userId, achievementKey: key, periodKey, xpAwarded: def.xp, coinsAwarded: def.coins },
      });
      await tx.coinTransaction.create({ data: { userId, amount: def.coins, reason } });
      return {
        coins: updated.coins,
        xp: updated.xp,
        level: newLevel,
        leveledUp: newLevel > (before?.level ?? newLevel),
      };
    });

    return {
      awarded: true,
      xpAwarded: def.xp,
      coinsAwarded: def.coins,
      ...result,
    };
  }
}

export { ALL_ACHIEVEMENTS };
