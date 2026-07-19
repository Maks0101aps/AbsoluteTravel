import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EconomyService } from './economy.service';
import { PrismaService } from '../prisma.service';

describe('EconomyService', () => {
  let prisma: any;
  let service: EconomyService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
      },
      coinTransaction: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn((argOrFn: any) => {
        if (typeof argOrFn === 'function') return argOrFn(prisma);
        return Promise.all(argOrFn);
      }),
    };
    service = new EconomyService(prisma as unknown as PrismaService);
  });

  describe('wallet', () => {
    it('404s for an unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.wallet(1)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a falsy/NaN userId', async () => {
      await expect(service.wallet(0)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.wallet(NaN)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns coins, parsed unlockedItems and recent transactions', async () => {
      prisma.user.findUnique.mockResolvedValue({ coins: 500, unlockedItems: '["gold","ocean"]' });
      prisma.coinTransaction.findMany.mockResolvedValue([{ id: 1, amount: 100 }]);
      await expect(service.wallet(1)).resolves.toEqual({
        coins: 500,
        unlockedItems: ['gold', 'ocean'],
        transactions: [{ id: 1, amount: 100 }],
      });
    });

    it('treats malformed unlockedItems JSON as an empty list', async () => {
      prisma.user.findUnique.mockResolvedValue({ coins: 0, unlockedItems: 'not-json' });
      prisma.coinTransaction.findMany.mockResolvedValue([]);
      const result = await service.wallet(1);
      expect(result.unlockedItems).toEqual([]);
    });
  });

  describe('earn', () => {
    it('404s for an unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.earn({ userId: 1, reason: 'profile_complete' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects an unrecognised reward reason', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, coins: 0 });
      await expect(service.earn({ userId: 1, reason: 'made_up' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('is idempotent: a reason already paid out awards 0 the second time', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, coins: 200 });
      prisma.coinTransaction.findFirst.mockResolvedValue({ id: 5 });
      await expect(service.earn({ userId: 1, reason: 'profile_complete' })).resolves.toEqual({ coins: 200, awarded: 0 });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('pays out and records a transaction on first claim', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, coins: 0 });
      prisma.coinTransaction.findFirst.mockResolvedValue(null);
      prisma.user.update.mockResolvedValue({ coins: 200 });
      prisma.coinTransaction.create.mockResolvedValue({ id: 1 });

      await expect(service.earn({ userId: 1, reason: 'profile_complete' })).resolves.toEqual({ coins: 200, awarded: 200 });
    });
  });

  describe('purchase', () => {
    it('404s for an unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.purchase({ userId: 1, itemId: 'gold' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects an unknown item id', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1 });
      await expect(service.purchase({ userId: 1, itemId: 'not-a-real-item' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects buying an item already owned', async () => {
      prisma.user.findUnique.mockResolvedValue({ coins: 9999, unlockedItems: '["gold"]' });
      await expect(service.purchase({ userId: 1, itemId: 'gold' })).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects when the balance-checked debit affects 0 rows (insufficient funds)', async () => {
      prisma.user.findUnique.mockResolvedValue({ coins: 10, unlockedItems: '[]' });
      prisma.user.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.purchase({ userId: 1, itemId: 'gold' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('debits coins and unlocks the item on success', async () => {
      prisma.user.findUnique.mockResolvedValue({ coins: 1000, unlockedItems: '[]' });
      prisma.user.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.update.mockResolvedValue({ coins: 500 });
      prisma.coinTransaction.create.mockResolvedValue({});

      const result = await service.purchase({ userId: 1, itemId: 'gold' });
      expect(result).toEqual({ coins: 500, unlockedItems: ['gold'] });
    });
  });

  describe('casesState', () => {
    it('extracts opened one-time case ids from transaction reasons', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1 });
      prisma.coinTransaction.findMany.mockResolvedValue([]);
      const result = await service.casesState(1);
      expect(result.openedCaseIds).toEqual([]);
    });
  });

  describe('openCase', () => {
    it('rejects an unknown case id', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, coins: 0, unlockedItems: '[]' });
      await expect(service.openCase({ userId: 1, caseId: 'not-a-case' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects opening a paid case without enough coins', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, coins: 0, unlockedItems: '[]' });
      await expect(service.openCase({ userId: 1, caseId: 'starter' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('opens a case, deducts cost, and grants the reward', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, coins: 1000, unlockedItems: '[]' });
      prisma.user.update.mockResolvedValue({ coins: 950 });
      prisma.coinTransaction.create.mockResolvedValue({});

      const result = await service.openCase({ userId: 1, caseId: 'starter' });
      expect(result.caseId).toBe('starter');
      expect(result.coins).toBe(950);
      expect(typeof result.duplicate).toBe('boolean');
    });

    it('refunds half cost when the reward is a duplicate', async () => {
      // Owning every possible starter reward guarantees the roll is a duplicate.
      const { CASES } = jest.requireActual('./cases');
      const allItemIds = CASES.starter.rewards.map((r: any) => r.itemId);
      prisma.user.findUnique.mockResolvedValue({ id: 1, coins: 1000, unlockedItems: JSON.stringify(allItemIds) });
      prisma.user.update.mockResolvedValue({ coins: 975 });
      prisma.coinTransaction.create.mockResolvedValue({});

      const result = await service.openCase({ userId: 1, caseId: 'starter' });
      expect(result.duplicate).toBe(true);
      expect(result.compensation).toBe(25); // floor(50 / 2)
    });
  });

  describe('leaderboard', () => {
    it('returns the top users ordered by coins', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 1, coins: 999 }]);
      await expect(service.leaderboard()).resolves.toEqual([{ id: 1, coins: 999 }]);
      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { coins: 'desc' }, take: 20 }));
    });
  });
});
