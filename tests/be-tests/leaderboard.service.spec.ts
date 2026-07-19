import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { PrismaService } from '../prisma.service';

describe('LeaderboardService', () => {
  let prisma: any;
  let service: LeaderboardService;

  const row = (id: number, xp: number, region: string | null = null) => ({
    id,
    username: `u${id}`,
    name: `User ${id}`,
    avatar: '/a.svg',
    level: 1,
    xp,
    region,
    _count: { visitedCells: 3, checkmarks: 1 },
  });

  beforeEach(() => {
    prisma = {
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
      },
    };
    service = new LeaderboardService(prisma as unknown as PrismaService);
  });

  describe('top', () => {
    it('defaults to the global leaderboard and ranks users by XP order', async () => {
      prisma.user.findMany.mockResolvedValue([row(1, 500), row(2, 300)]);
      const result = await service.top(undefined, undefined, undefined);
      expect(result).toEqual([
        expect.objectContaining({ rank: 1, userId: 1, xp: 500 }),
        expect.objectContaining({ rank: 2, userId: 2, xp: 300 }),
      ]);
      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: undefined }));
    });

    it('requires a region for the regional leaderboard', async () => {
      expect(() => service.top('regional', undefined, undefined)).toThrow(BadRequestException);
      expect(() => service.top('regional', '  ', undefined)).toThrow(BadRequestException);
    });

    it('filters by region when requesting the regional board', async () => {
      prisma.user.findMany.mockResolvedValue([row(1, 200, 'Львівська область')]);
      await service.top('regional', 'Львівська область', undefined);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { region: { contains: 'Львівська область' } } }),
      );
    });

    it('clamps an out-of-range or invalid limit to the max', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      await service.top(undefined, undefined, '9999');
      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));

      await service.top(undefined, undefined, 'not-a-number');
      expect(prisma.user.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ take: 100 }));
    });

    it('caches identical queries instead of hitting the DB twice', async () => {
      prisma.user.findMany.mockResolvedValue([row(1, 100)]);
      await service.top(undefined, undefined, '10');
      await service.top(undefined, undefined, '10');
      expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
    });

    it('does not share cache entries between global and regional queries', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      await service.top(undefined, undefined, '10');
      await service.top('regional', 'Київська область', '10');
      expect(prisma.user.findMany).toHaveBeenCalledTimes(2);
    });
  });

  describe('me', () => {
    it('rejects a missing/invalid userId', () => {
      expect(() => service.me(undefined)).toThrow(BadRequestException);
      expect(() => service.me('not-a-number')).toThrow(BadRequestException);
    });

    it('404s when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.me('1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('computes a global-only rank when the user has no region', async () => {
      prisma.user.findUnique.mockResolvedValue(row(1, 400, null));
      prisma.user.count.mockResolvedValue(3); // globalAhead call, then globalTotal below overrides

      // First count() call = "ahead" (3 users with more XP), second = total.
      prisma.user.count.mockResolvedValueOnce(3).mockResolvedValueOnce(50);

      const result = await service.me('1');
      expect(result.global).toEqual({ rank: 4, total: 50 });
      expect(result.regional).toBeNull();
    });

    it('also computes a regional rank when the user has a region', async () => {
      prisma.user.findUnique.mockResolvedValue(row(1, 400, 'Одеська область'));
      prisma.user.count
        .mockResolvedValueOnce(1) // globalAhead
        .mockResolvedValueOnce(20) // globalTotal
        .mockResolvedValueOnce(0) // regionalAhead
        .mockResolvedValueOnce(5); // regionalTotal

      const result = await service.me('1');
      expect(result.regional).toEqual({ region: 'Одеська область', rank: 1, total: 5 });
    });

    it('caches per-user lookups', async () => {
      prisma.user.findUnique.mockResolvedValue(row(1, 400, null));
      prisma.user.count.mockResolvedValue(0);
      await service.me('1');
      await service.me('1');
      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
    });
  });
});
