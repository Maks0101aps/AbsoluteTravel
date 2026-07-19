import { AppService } from './app.service';
import { PrismaService } from './prisma.service';

describe('AppService', () => {
  let prisma: {
    user: { findMany: jest.Mock };
    destination: { findMany: jest.Mock };
    achievement: { findMany: jest.Mock };
  };
  let service: AppService;

  beforeEach(() => {
    prisma = {
      user: { findMany: jest.fn() },
      destination: { findMany: jest.fn() },
      achievement: { findMany: jest.fn() },
    };
    service = new AppService(prisma as unknown as PrismaService);
  });

  describe('getLandingData', () => {
    it('picks "Олексій" as the demo current user when present', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 1, name: 'Марія' },
        { id: 2, name: 'Олексій' },
      ]);
      prisma.destination.findMany.mockResolvedValue([]);
      prisma.achievement.findMany.mockResolvedValue([]);

      const data = await service.getLandingData();
      expect(data.currentUser?.name).toBe('Олексій');
      expect(data.friends).toEqual([{ id: 1, name: 'Марія' }]);
    });

    it('falls back to the first user when "Олексій" is absent', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 1, name: 'Хтось' }]);
      prisma.destination.findMany.mockResolvedValue([]);
      prisma.achievement.findMany.mockResolvedValue([]);

      const data = await service.getLandingData();
      expect(data.currentUser?.name).toBe('Хтось');
      expect(data.friends).toEqual([]);
    });

    it('handles an empty user table gracefully', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.destination.findMany.mockResolvedValue([]);
      prisma.achievement.findMany.mockResolvedValue([]);

      const data = await service.getLandingData();
      expect(data.currentUser).toBeUndefined();
      expect(data.friends).toEqual([]);
    });
  });

  it('getUsers passes through the achievements include', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 1 }]);
    await expect(service.getUsers()).resolves.toEqual([{ id: 1 }]);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: expect.any(Object) }),
    );
  });

  it('getDestinations delegates to prisma', async () => {
    prisma.destination.findMany.mockResolvedValue([{ id: 1 }]);
    await expect(service.getDestinations()).resolves.toEqual([{ id: 1 }]);
  });

  it('getAchievements delegates to prisma', async () => {
    prisma.achievement.findMany.mockResolvedValue([{ id: 1 }]);
    await expect(service.getAchievements()).resolves.toEqual([{ id: 1 }]);
  });
});
