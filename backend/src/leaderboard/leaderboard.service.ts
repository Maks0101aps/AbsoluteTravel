import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface LeaderboardRow {
  rank: number;
  userId: number;
  username: string;
  name: string;
  avatarUrl: string;
  level: number;
  xp: number;
  region: string | null;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes, as per spec
const MAX_LIMIT = 100;

interface CacheEntry {
  expiresAt: number;
  data: unknown;
}

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly cache = new Map<string, CacheEntry>();

  private cached<T>(key: string, produce: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      return Promise.resolve(hit.data as T);
    }
    return produce().then((data) => {
      this.cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
      // Opportunistic cleanup so the map doesn't grow unbounded across regions.
      if (this.cache.size > 200) {
        const now = Date.now();
        for (const [k, v] of this.cache) {
          if (v.expiresAt <= now) this.cache.delete(k);
        }
      }
      return data;
    });
  }

  private toRow(u: { id: number; username: string; name: string; avatar: string; level: number; xp: number; region: string | null }, rank: number): LeaderboardRow {
    return {
      rank,
      userId: u.id,
      username: u.username,
      name: u.name,
      avatarUrl: u.avatar,
      level: u.level,
      xp: u.xp,
      region: u.region,
    };
  }

  /** Top users by XP, globally or within a region. Cached for 5 minutes. */
  top(type: string | undefined, region: string | undefined, rawLimit: string | undefined) {
    const kind = type === 'regional' ? 'regional' : 'global';
    const reg = (region ?? '').trim();
    if (kind === 'regional' && !reg) {
      throw new BadRequestException('Для регіонального рейтингу вкажіть region');
    }
    let limit = Number(rawLimit ?? MAX_LIMIT);
    if (!Number.isInteger(limit) || limit <= 0) limit = MAX_LIMIT;
    limit = Math.min(limit, MAX_LIMIT);

    const key = `top:${kind}:${kind === 'regional' ? reg.toLowerCase() : ''}:${limit}`;
    return this.cached(key, async () => {
      const users = await this.prisma.user.findMany({
        where: kind === 'regional' ? { region: { contains: reg } } : undefined,
        orderBy: [{ xp: 'desc' }, { id: 'asc' }],
        take: limit,
        select: { id: true, username: true, name: true, avatar: true, level: true, xp: true, region: true },
      });
      return users.map((u, i) => this.toRow(u, i + 1));
    });
  }

  /** Current user's rank globally and within their own region. Cached. */
  me(rawUserId: string | undefined) {
    const userId = Number(rawUserId);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException('Не передано ідентифікатор користувача');
    }

    return this.cached(`me:${userId}`, async () => {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, name: true, avatar: true, level: true, xp: true, region: true },
      });
      if (!user) throw new NotFoundException('Користувача не знайдено');

      // Deterministic dense position: ties are broken by id, matching top().
      const ahead = (extra: object) =>
        this.prisma.user.count({
          where: {
            ...extra,
            OR: [{ xp: { gt: user.xp } }, { xp: user.xp, id: { lt: user.id } }],
          },
        });

      const [globalAhead, globalTotal] = await Promise.all([
        ahead({}),
        this.prisma.user.count(),
      ]);

      let regional: { region: string; rank: number; total: number } | null = null;
      if (user.region) {
        const [regionalAhead, regionalTotal] = await Promise.all([
          ahead({ region: user.region }),
          this.prisma.user.count({ where: { region: user.region } }),
        ]);
        regional = { region: user.region, rank: regionalAhead + 1, total: regionalTotal };
      }

      return {
        user: this.toRow(user, globalAhead + 1),
        global: { rank: globalAhead + 1, total: globalTotal },
        regional,
      };
    });
  }
}
