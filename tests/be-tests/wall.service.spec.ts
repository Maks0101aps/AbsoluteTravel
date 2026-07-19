import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { WallService } from './wall.service';
import { PrismaService } from '../prisma.service';
import { FriendsService } from '../friends/friends.service';

describe('WallService', () => {
  let prisma: { wallPost: { findMany: jest.Mock } };
  let friends: { areFriends: jest.Mock };
  let service: WallService;

  beforeEach(() => {
    prisma = { wallPost: { findMany: jest.fn() } };
    friends = { areFriends: jest.fn() };
    service = new WallService(prisma as unknown as PrismaService, friends as unknown as FriendsService);
  });

  it('rejects a missing userId', async () => {
    await expect(service.listForUser(NaN, 1)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a missing requesterId', async () => {
    await expect(service.listForUser(1, NaN)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows the owner to view their own wall without a friendship check', async () => {
    prisma.wallPost.findMany.mockResolvedValue([]);
    await service.listForUser(1, 1);
    expect(friends.areFriends).not.toHaveBeenCalled();
  });

  it('rejects a non-friend viewing someone else’s wall', async () => {
    friends.areFriends.mockResolvedValue(false);
    await expect(service.listForUser(1, 2)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a friend to view the wall', async () => {
    friends.areFriends.mockResolvedValue(true);
    prisma.wallPost.findMany.mockResolvedValue([]);
    await expect(service.listForUser(1, 2)).resolves.toEqual({ posts: [], nextCursor: null });
  });

  it('maps rows to WallPostDto and flags hasMore via nextCursor', async () => {
    const rows = Array.from({ length: 21 }, (_, i) => ({
      id: 100 - i,
      type: 'checkmark',
      placeId: 5,
      cellId: null,
      photo: null,
      xpAwarded: 20,
      createdAt: new Date('2026-01-01'),
      checkmark: { place: { name: 'Test Place' } },
    }));
    prisma.wallPost.findMany.mockResolvedValue(rows);

    const result = await service.listForUser(1, 1);
    expect(result.posts).toHaveLength(20);
    expect(result.posts[0].placeName).toBe('Test Place');
    expect(result.nextCursor).toBe(rows[19].id);
  });

  it('nextCursor is null when there is no next page', async () => {
    prisma.wallPost.findMany.mockResolvedValue([
      { id: 1, type: 'x', placeId: null, cellId: null, photo: null, xpAwarded: 0, createdAt: new Date(), checkmark: null },
    ]);
    const result = await service.listForUser(1, 1);
    expect(result.nextCursor).toBeNull();
  });
});
