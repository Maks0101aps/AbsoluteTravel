import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { PrismaService } from '../prisma.service';
import { PresenceService } from '../realtime/presence.service';
import { PushService } from '../push/push.service';

describe('FriendsService', () => {
  let prisma: any;
  let presence: jest.Mocked<Pick<PresenceService, 'isOnline' | 'lastSeenAt' | 'emitToUser'>>;
  let push: jest.Mocked<Pick<PushService, 'notifyIfAway'>>;
  let service: FriendsService;

  const user = (id: number, extra: Partial<any> = {}) => ({
    id,
    username: `user${id}`,
    name: `User ${id}`,
    avatar: '/a.svg',
    level: 1,
    xp: 0,
    region: null,
    city: null,
    profile: null,
    ...extra,
  });

  beforeEach(() => {
    prisma = {
      friend: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };
    presence = { isOnline: jest.fn().mockReturnValue(false), lastSeenAt: jest.fn().mockReturnValue(null), emitToUser: jest.fn() };
    push = { notifyIfAway: jest.fn().mockResolvedValue(undefined) };
    service = new FriendsService(
      prisma as unknown as PrismaService,
      presence as unknown as PresenceService,
      push as unknown as PushService,
    );
  });

  describe('areFriends', () => {
    it('is false when comparing a user to themself', async () => {
      await expect(service.areFriends(1, 1)).resolves.toBe(false);
      expect(prisma.friend.findFirst).not.toHaveBeenCalled();
    });

    it('is true when an ACCEPTED edge exists in either direction', async () => {
      prisma.friend.findFirst.mockResolvedValue({ id: 1 });
      await expect(service.areFriends(1, 2)).resolves.toBe(true);
    });

    it('is false when no edge exists', async () => {
      prisma.friend.findFirst.mockResolvedValue(null);
      await expect(service.areFriends(1, 2)).resolves.toBe(false);
    });
  });

  describe('friendIds', () => {
    it('maps each edge to the OTHER user id', async () => {
      prisma.friend.findMany.mockResolvedValue([
        { senderId: 1, receiverId: 2 },
        { senderId: 3, receiverId: 1 },
      ]);
      await expect(service.friendIds(1)).resolves.toEqual([2, 3]);
    });

    it('returns an empty array with no friends', async () => {
      prisma.friend.findMany.mockResolvedValue([]);
      await expect(service.friendIds(1)).resolves.toEqual([]);
    });
  });

  describe('sendRequest', () => {
    it('rejects a missing/invalid userId', async () => {
      await expect(service.sendRequest({})).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a stale session whose user no longer exists', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.sendRequest({ userId: 1, targetUserId: 2 })).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects when neither targetUserId, username, nor friendCode is given', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1 });
      await expect(service.sendRequest({ userId: 1 })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a self-request', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1 });
      await expect(service.sendRequest({ userId: 1, targetUserId: 1 })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('404s when the username does not resolve to a user', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce(null);
      await expect(service.sendRequest({ userId: 1, username: 'ghost' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('404s when the friend code does not resolve to a user', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce(null);
      await expect(service.sendRequest({ userId: 1, friendCode: 'ABC123' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('404s when the resolved target user no longer exists', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 1 }) // requireExistingUser
        .mockResolvedValueOnce(null); // target lookup by id (targetUserId path)
      await expect(service.sendRequest({ userId: 1, targetUserId: 2 })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects when already ACCEPTED friends', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce({ id: 2 });
      prisma.friend.findFirst.mockResolvedValue({ id: 9, status: 'ACCEPTED' });
      await expect(service.sendRequest({ userId: 1, targetUserId: 2 })).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects a duplicate outgoing PENDING request', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce({ id: 2 });
      prisma.friend.findFirst.mockResolvedValue({ id: 9, status: 'PENDING', senderId: 1, receiverId: 2 });
      await expect(service.sendRequest({ userId: 1, targetUserId: 2 })).rejects.toBeInstanceOf(ConflictException);
    });

    it('auto-accepts when the target already sent a PENDING request', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce({ id: 2 });
      prisma.friend.findFirst.mockResolvedValue({ id: 9, status: 'PENDING', senderId: 2, receiverId: 1 });
      prisma.friend.findUnique.mockResolvedValue({
        id: 9,
        status: 'PENDING',
        senderId: 2,
        receiverId: 1,
        sender: user(2),
        receiver: user(1),
      });
      prisma.friend.update.mockResolvedValue({ id: 9, status: 'ACCEPTED' });

      const result = await service.sendRequest({ userId: 1, targetUserId: 2 });
      expect(result).toMatchObject({ id: 9, status: 'ACCEPTED' });
      expect(push.notifyIfAway).toHaveBeenCalled(); // accepted-notification path
    });

    it('re-opens a DECLINED edge as a fresh PENDING request', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce({ id: 2 });
      prisma.friend.findFirst.mockResolvedValue({ id: 9, status: 'DECLINED', senderId: 2, receiverId: 1 });
      prisma.friend.update.mockResolvedValue({
        id: 9,
        status: 'PENDING',
        createdAt: new Date(),
        sender: user(1),
        receiver: user(2),
      });

      const result = await service.sendRequest({ userId: 1, targetUserId: 2 });
      expect(result).toMatchObject({ id: 9, status: 'PENDING' });
      expect(presence.emitToUser).toHaveBeenCalledWith(2, 'friends:request', expect.any(Object));
      expect(push.notifyIfAway).toHaveBeenCalledWith(2, expect.objectContaining({ tag: 'friend-request:1' }));
    });

    it('creates a brand new PENDING request when no edge exists', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce({ id: 2 });
      prisma.friend.findFirst.mockResolvedValue(null);
      prisma.friend.create.mockResolvedValue({
        id: 10,
        status: 'PENDING',
        createdAt: new Date(),
        sender: user(1),
        receiver: user(2),
      });

      const result = await service.sendRequest({ userId: 1, targetUserId: 2 });
      expect(result).toMatchObject({ id: 10, status: 'PENDING' });
      expect(prisma.friend.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { senderId: 1, receiverId: 2 } }),
      );
    });

    it('resolves the target via username when targetUserId is absent', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 1 }) // requireExistingUser
        .mockResolvedValueOnce({ id: 2 }) // username lookup
        .mockResolvedValueOnce({ id: 2 }); // target-exists re-check
      prisma.friend.findFirst.mockResolvedValue(null);
      prisma.friend.create.mockResolvedValue({ id: 11, status: 'PENDING', createdAt: new Date(), sender: user(1), receiver: user(2) });

      await service.sendRequest({ userId: 1, username: 'traveler' });
      expect(prisma.friend.create).toHaveBeenCalled();
    });
  });

  describe('accept', () => {
    it('404s when the request does not exist', async () => {
      prisma.friend.findUnique.mockResolvedValue(null);
      await expect(service.accept(1, 5)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('forbids anyone but the receiver from accepting', async () => {
      prisma.friend.findUnique.mockResolvedValue({ id: 1, receiverId: 2, status: 'PENDING' });
      await expect(service.accept(1, 5)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('is idempotent when the request is already ACCEPTED', async () => {
      prisma.friend.findUnique.mockResolvedValue({
        id: 1,
        receiverId: 5,
        status: 'ACCEPTED',
        sender: user(2),
        receiver: user(5),
      });
      const result = await service.accept(1, 5);
      expect(result.status).toBe('ACCEPTED');
      expect(prisma.friend.update).not.toHaveBeenCalled();
    });

    it('rejects accepting a DECLINED/removed request', async () => {
      prisma.friend.findUnique.mockResolvedValue({ id: 1, receiverId: 5, status: 'DECLINED', sender: user(2), receiver: user(5) });
      await expect(service.accept(1, 5)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('accepts a PENDING request and notifies the sender', async () => {
      prisma.friend.findUnique.mockResolvedValue({
        id: 1,
        senderId: 2,
        receiverId: 5,
        status: 'PENDING',
        sender: user(2),
        receiver: user(5),
      });
      prisma.friend.update.mockResolvedValue({ id: 1, status: 'ACCEPTED' });

      const result = await service.accept(1, 5);
      expect(result).toMatchObject({ id: 1, status: 'ACCEPTED' });
      expect(presence.emitToUser).toHaveBeenCalledWith(2, 'friends:accepted', expect.any(Object));
      expect(push.notifyIfAway).toHaveBeenCalledWith(2, expect.objectContaining({ tag: 'friend-accepted:5' }));
    });
  });

  describe('remove', () => {
    it('404s on a missing edge', async () => {
      prisma.friend.findUnique.mockResolvedValue(null);
      await expect(service.remove(1, 5)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('forbids removing an edge you are not part of', async () => {
      prisma.friend.findUnique.mockResolvedValue({ id: 1, senderId: 2, receiverId: 3, status: 'ACCEPTED' });
      await expect(service.remove(1, 5)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('declines (soft) an incoming PENDING request instead of deleting it', async () => {
      prisma.friend.findUnique.mockResolvedValue({ id: 1, senderId: 2, receiverId: 5, status: 'PENDING' });
      const result = await service.remove(1, 5);
      expect(prisma.friend.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: 'DECLINED' } });
      expect(prisma.friend.delete).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: true, id: 1 });
    });

    it('hard-deletes an accepted friendship', async () => {
      prisma.friend.findUnique.mockResolvedValue({ id: 1, senderId: 5, receiverId: 2, status: 'ACCEPTED' });
      await service.remove(1, 5);
      expect(prisma.friend.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(presence.emitToUser).toHaveBeenCalledWith(2, 'friends:removed', { id: 1, by: 5 });
    });
  });

  describe('list', () => {
    it('returns the OTHER side of each accepted edge with presence data', async () => {
      prisma.friend.findMany.mockResolvedValue([
        { id: 1, createdAt: new Date(), senderId: 5, receiverId: 2, sender: user(5), receiver: user(2) },
        { id: 2, createdAt: new Date(), senderId: 3, receiverId: 5, sender: user(3), receiver: user(5) },
      ]);
      const result = await service.list(5);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(2);
      expect(result[1].id).toBe(3);
    });
  });

  describe('incomingRequests', () => {
    it('maps pending edges to sender info', async () => {
      prisma.friend.findMany.mockResolvedValue([{ id: 1, createdAt: new Date(), sender: user(2) }]);
      const result = await service.incomingRequests(5);
      expect(result[0].sender.id).toBe(2);
    });
  });

  describe('search', () => {
    it('returns [] for a too-short query without hitting the DB', async () => {
      await expect(service.search(1, 'a')).resolves.toEqual([]);
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it('returns [] when no users match', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      await expect(service.search(1, 'nobody')).resolves.toEqual([]);
    });

    it('annotates each result with its relation to the caller', async () => {
      prisma.user.findMany.mockResolvedValue([user(2), user(3)]);
      prisma.friend.findMany.mockResolvedValue([
        { id: 1, senderId: 1, receiverId: 2, status: 'ACCEPTED' },
        { id: 2, senderId: 3, receiverId: 1, status: 'PENDING' },
      ]);
      const result = await service.search(1, 'traveler');
      expect(result.find((r: any) => r.id === 2)?.relation).toBe('friends');
      expect(result.find((r: any) => r.id === 3)?.relation).toBe('incoming');
    });
  });

  describe('findByCode', () => {
    it('rejects an empty code', async () => {
      await expect(service.findByCode(1, '')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('404s when no user has that code', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findByCode(1, 'ZZZZZZ')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('404s when the code belongs to the caller themself', async () => {
      prisma.user.findUnique.mockResolvedValue(user(1));
      await expect(service.findByCode(1, 'AAA111')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('resolves a valid code with relation "none" when no edge exists', async () => {
      prisma.user.findUnique.mockResolvedValue(user(2));
      prisma.friend.findFirst.mockResolvedValue(null);
      const result = await service.findByCode(1, 'aaa111');
      expect(result.relation).toBe('none');
      expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { friendCode: 'AAA111' } }));
    });
  });

  describe('myCode', () => {
    it('404s when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.myCode(1)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the friend code', async () => {
      prisma.user.findUnique.mockResolvedValue({ friendCode: 'AAA111' });
      await expect(service.myCode(1)).resolves.toEqual({ friendCode: 'AAA111' });
    });
  });
});
