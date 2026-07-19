import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PresenceService } from '../realtime/presence.service';
import { PushService } from '../push/push.service';

export interface SendFriendRequestDto {
  userId?: number;
  targetUserId?: number;
  username?: string;
  friendCode?: string;
}

// Friend codes are generated uppercase; normalize any user/QR input to match.
function normalizeFriendCode(raw: string): string {
  return raw.trim().toUpperCase();
}

// Public shape of a user inside friends/search responses.
const FRIEND_USER_SELECT = {
  id: true,
  username: true,
  name: true,
  avatar: true,
  level: true,
  xp: true,
  region: true,
  city: true,
  profile: true,
} as const;

@Injectable()
export class FriendsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly presence: PresenceService,
    private readonly push: PushService,
  ) {}

  private requireUserId(raw: unknown): number {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('Не передано ідентифікатор користувача');
    }
    return id;
  }

  // Unpacks the same avatarId/customAvatar/frameId/color blob UsersService's
  // publicProfile exposes, so a friend's actual equipped avatar+frame can be
  // drawn on the map/mini-profile instead of just their default `avatar`
  // image — this is what the map's friend markers need frame data for.
  private withPresence<T extends { id: number; profile?: string | null }>(
    user: T,
  ) {
    const { profile: rawProfile, ...rest } = user;
    let customization: {
      avatarId?: string;
      customAvatar?: string;
      frameId?: string;
      color?: string;
      backgroundId?: string;
    } | null = null;
    if (rawProfile) {
      try {
        customization = JSON.parse(rawProfile);
      } catch {
        customization = null;
      }
    }
    return {
      ...rest,
      avatarId: customization?.avatarId,
      customAvatar: customization?.customAvatar,
      frameId: customization?.frameId,
      color: customization?.color,
      backgroundId: customization?.backgroundId,
      online: this.presence.isOnline(user.id),
      lastSeenAt: this.presence.lastSeenAt(user.id)?.toISOString() ?? null,
    };
  }

  /** True when the two users have an ACCEPTED friendship edge. */
  async areFriends(a: number, b: number): Promise<boolean> {
    if (a === b) return false;
    const edge = await this.prisma.friend.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { senderId: a, receiverId: b },
          { senderId: b, receiverId: a },
        ],
      },
      select: { id: true },
    });
    return edge !== null;
  }

  /** Ids of all accepted friends of the user. */
  async friendIds(userId: number): Promise<number[]> {
    const edges = await this.prisma.friend.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      select: { senderId: true, receiverId: true },
    });
    return edges.map((e) =>
      e.senderId === userId ? e.receiverId : e.senderId,
    );
  }

  /**
   * Confirms the caller's userId still refers to a real account. A stale
   * client session (e.g. localStorage pointing at an id from before a DB
   * reseed) would otherwise hit a raw foreign-key error on insert.
   */
  private async requireExistingUser(userId: number): Promise<void> {
    const exists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!exists) {
      throw new UnauthorizedException(
        'Сесія недійсна — увійдіть у систему ще раз',
      );
    }
  }

  async sendRequest(dto: SendFriendRequestDto) {
    const userId = this.requireUserId(dto.userId);
    await this.requireExistingUser(userId);

    let targetId: number | null = null;
    if (dto.targetUserId !== undefined) {
      targetId = this.requireUserId(dto.targetUserId);
    } else if (dto.username) {
      const target = await this.prisma.user.findUnique({
        where: { username: dto.username.trim() },
        select: { id: true },
      });
      if (!target)
        throw new NotFoundException('Користувача з таким іменем не знайдено');
      targetId = target.id;
    } else if (dto.friendCode) {
      const target = await this.prisma.user.findUnique({
        where: { friendCode: normalizeFriendCode(dto.friendCode) },
        select: { id: true },
      });
      if (!target) throw new NotFoundException('Користувача з таким кодом не знайдено');
      targetId = target.id;
    } else {
      throw new BadRequestException(
        'Вкажіть користувача, якому надіслати запит',
      );
    }

    if (targetId === userId) {
      throw new BadRequestException('Не можна надіслати запит самому собі');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('Користувача не знайдено');

    const existing = await this.prisma.friend.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: targetId },
          { senderId: targetId, receiverId: userId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new ConflictException('Ви вже друзі');
      }
      if (existing.status === 'PENDING') {
        // The other side already asked first — accept instead of duplicating.
        if (existing.receiverId === userId) {
          return this.accept(existing.id, userId);
        }
        throw new ConflictException('Запит уже надіслано');
      }
      // DECLINED: allow a fresh attempt, re-pointing the edge at the new sender.
      const updated = await this.prisma.friend.update({
        where: { id: existing.id },
        data: {
          senderId: userId,
          receiverId: targetId,
          status: 'PENDING',
          createdAt: new Date(),
        },
        include: {
          receiver: { select: FRIEND_USER_SELECT },
          sender: { select: FRIEND_USER_SELECT },
        },
      });
      this.presence.emitToUser(targetId, 'friends:request', {
        id: updated.id,
        sender: this.withPresence(updated.sender),
        createdAt: updated.createdAt,
      });
      void this.push.notifyIfAway(targetId, {
        title: 'Нова заявка в друзі 👋',
        body: `${updated.sender.name} хоче додати вас у друзі`,
        url: '/',
        tag: `friend-request:${userId}`,
      });
      return {
        id: updated.id,
        status: updated.status,
        receiver: this.withPresence(updated.receiver),
      };
    }

    const created = await this.prisma.friend.create({
      data: { senderId: userId, receiverId: targetId },
      include: {
        receiver: { select: FRIEND_USER_SELECT },
        sender: { select: FRIEND_USER_SELECT },
      },
    });

    // Real-time nudge for the receiver's requests inbox.
    this.presence.emitToUser(targetId, 'friends:request', {
      id: created.id,
      sender: this.withPresence(created.sender),
      createdAt: created.createdAt,
    });
    void this.push.notifyIfAway(targetId, {
      title: 'Нова заявка в друзі 👋',
      body: `${created.sender.name} хоче додати вас у друзі`,
      url: '/',
      tag: `friend-request:${userId}`,
    });

    return {
      id: created.id,
      status: created.status,
      receiver: this.withPresence(created.receiver),
    };
  }

  async accept(friendId: number, rawUserId: unknown) {
    const userId = this.requireUserId(rawUserId);
    const edge = await this.prisma.friend.findUnique({
      where: { id: friendId },
      include: {
        sender: { select: FRIEND_USER_SELECT },
        receiver: { select: FRIEND_USER_SELECT },
      },
    });
    if (!edge) throw new NotFoundException('Запит не знайдено');
    if (edge.receiverId !== userId) {
      throw new ForbiddenException('Прийняти запит може лише його отримувач');
    }
    if (edge.status === 'ACCEPTED') {
      return {
        id: edge.id,
        status: edge.status,
        friend: this.withPresence(edge.sender),
      };
    }
    if (edge.status !== 'PENDING') {
      throw new BadRequestException('Цей запит уже не активний');
    }

    const updated = await this.prisma.friend.update({
      where: { id: edge.id },
      data: { status: 'ACCEPTED' },
    });

    // Tell the original sender their request was accepted.
    this.presence.emitToUser(edge.senderId, 'friends:accepted', {
      id: edge.id,
      friend: this.withPresence(edge.receiver),
    });
    void this.push.notifyIfAway(edge.senderId, {
      title: 'Заявку прийнято 🎉',
      body: `${edge.receiver.name} тепер ваш друг`,
      url: '/',
      tag: `friend-accepted:${edge.receiverId}`,
    });

    return {
      id: updated.id,
      status: updated.status,
      friend: this.withPresence(edge.sender),
    };
  }

  /** Remove a friend, cancel an outgoing request, or decline an incoming one. */
  async remove(friendId: number, rawUserId: unknown) {
    const userId = this.requireUserId(rawUserId);
    const edge = await this.prisma.friend.findUnique({
      where: { id: friendId },
    });
    if (!edge) throw new NotFoundException('Запис не знайдено');
    if (edge.senderId !== userId && edge.receiverId !== userId) {
      throw new ForbiddenException('Це не ваш запис у списку друзів');
    }

    if (edge.status === 'PENDING' && edge.receiverId === userId) {
      // Declining keeps the row so the UI can distinguish "declined" later.
      await this.prisma.friend.update({
        where: { id: edge.id },
        data: { status: 'DECLINED' },
      });
    } else {
      await this.prisma.friend.delete({ where: { id: edge.id } });
    }

    const otherId = edge.senderId === userId ? edge.receiverId : edge.senderId;
    this.presence.emitToUser(otherId, 'friends:removed', {
      id: edge.id,
      by: userId,
    });

    return { ok: true, id: edge.id };
  }

  /** All accepted friends with presence, level, xp, avatar. */
  async list(rawUserId: unknown) {
    const userId = this.requireUserId(rawUserId);
    const edges = await this.prisma.friend.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: { select: FRIEND_USER_SELECT },
        receiver: { select: FRIEND_USER_SELECT },
      },
      orderBy: { createdAt: 'asc' },
    });

    return edges.map((e) => {
      const other = e.senderId === userId ? e.receiver : e.sender;
      return {
        friendshipId: e.id,
        since: e.createdAt,
        ...this.withPresence(other),
      };
    });
  }

  /** Incoming pending requests. */
  async incomingRequests(rawUserId: unknown) {
    const userId = this.requireUserId(rawUserId);
    const edges = await this.prisma.friend.findMany({
      where: { receiverId: userId, status: 'PENDING' },
      include: { sender: { select: FRIEND_USER_SELECT } },
      orderBy: { createdAt: 'desc' },
    });
    return edges.map((e) => ({
      id: e.id,
      createdAt: e.createdAt,
      sender: this.withPresence(e.sender),
    }));
  }

  /** Search users by username/name and annotate the relationship state. */
  async search(rawUserId: unknown, query: string) {
    const userId = this.requireUserId(rawUserId);
    const q = (query ?? '').trim();
    if (q.length < 2) return [];

    const users = await this.prisma.user.findMany({
      where: {
        id: { not: userId },
        OR: [{ username: { contains: q } }, { name: { contains: q } }],
      },
      select: FRIEND_USER_SELECT,
      take: 10,
      orderBy: { xp: 'desc' },
    });
    if (users.length === 0) return [];

    const ids = users.map((u) => u.id);
    const edges = await this.prisma.friend.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: { in: ids } },
          { receiverId: userId, senderId: { in: ids } },
        ],
      },
    });

    return users.map((u) => {
      const edge = edges.find(
        (e) =>
          (e.senderId === userId && e.receiverId === u.id) ||
          (e.receiverId === userId && e.senderId === u.id),
      );
      let relation: 'none' | 'friends' | 'outgoing' | 'incoming' | 'declined' =
        'none';
      if (edge) {
        if (edge.status === 'ACCEPTED') relation = 'friends';
        else if (edge.status === 'PENDING')
          relation = edge.senderId === userId ? 'outgoing' : 'incoming';
        else relation = 'declined';
      }
      return {
        ...this.withPresence(u),
        relation,
        friendshipId: edge?.id ?? null,
      };
    });
  }

  /**
   * Exact-match lookup by friend code (username-search's fast counterpart).
   * Throws 404 on no match rather than returning null — an empty Nest JSON
   * body is ambiguous with an empty object over HTTP, so "not found" needs
   * its own status rather than a null-shaped 200.
   */
  async findByCode(rawUserId: unknown, rawCode: string) {
    const userId = this.requireUserId(rawUserId);
    const code = normalizeFriendCode(rawCode ?? '');
    if (!code) throw new BadRequestException('Вкажіть код друга');

    const u = await this.prisma.user.findUnique({
      where: { friendCode: code },
      select: FRIEND_USER_SELECT,
    });
    if (!u || u.id === userId) throw new NotFoundException('Користувача з таким кодом не знайдено');

    const edge = await this.prisma.friend.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: u.id },
          { receiverId: userId, senderId: u.id },
        ],
      },
    });
    let relation: 'none' | 'friends' | 'outgoing' | 'incoming' | 'declined' = 'none';
    if (edge) {
      if (edge.status === 'ACCEPTED') relation = 'friends';
      else if (edge.status === 'PENDING') relation = edge.senderId === userId ? 'outgoing' : 'incoming';
      else relation = 'declined';
    }
    return { ...this.withPresence(u), relation, friendshipId: edge?.id ?? null };
  }

  /** The caller's own friend code, for display/QR generation. */
  async myCode(rawUserId: unknown) {
    const userId = this.requireUserId(rawUserId);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { friendCode: true } });
    if (!user) throw new NotFoundException('Користувача не знайдено');
    return { friendCode: user.friendCode };
  }
}
