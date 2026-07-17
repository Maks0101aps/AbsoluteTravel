import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { FriendsService } from '../friends/friends.service';
import { PresenceService } from '../realtime/presence.service';

const MAX_TEXT_LENGTH = 2000;
const DEFAULT_PAGE = 50;

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly friends: FriendsService,
    private readonly presence: PresenceService,
  ) {}

  private parseId(raw: unknown, what: string): number {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException(`Некоректний ідентифікатор: ${what}`);
    }
    return id;
  }

  private async requireFriendship(userId: number, friendId: number) {
    if (!(await this.friends.areFriends(userId, friendId))) {
      throw new ForbiddenException('Листування доступне лише між друзями');
    }
  }

  /**
   * The chat sidebar: the people this user can actually message, i.e. their
   * accepted friends. Threads with non-friends are unreachable (history and
   * send both require friendship), so listing anyone else would only offer
   * conversations that 403 on open.
   */
  async conversations(rawUserId: unknown) {
    const userId = this.parseId(rawUserId, 'userId');
    const friendIds = await this.friends.friendIds(userId);
    if (friendIds.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: { id: { in: friendIds } },
      select: {
        id: true,
        username: true,
        name: true,
        avatar: true,
        level: true,
        xp: true,
        region: true,
        city: true,
      },
    });

    return users.map((u) => ({
      ...u,
      online: this.presence.isOnline(u.id),
      lastSeenAt: this.presence.lastSeenAt(u.id)?.toISOString() ?? null,
    }));
  }

  /** Message history with a friend, newest page by default, keyset pagination. */
  async history(rawUserId: unknown, rawFriendId: unknown, rawLimit?: unknown, rawBefore?: unknown) {
    const userId = this.parseId(rawUserId, 'userId');
    const friendId = this.parseId(rawFriendId, 'friendId');
    await this.requireFriendship(userId, friendId);

    let limit = Number(rawLimit ?? DEFAULT_PAGE);
    if (!Number.isInteger(limit) || limit <= 0) limit = DEFAULT_PAGE;
    limit = Math.min(limit, 100);

    const before = rawBefore !== undefined && rawBefore !== null && rawBefore !== ''
      ? this.parseId(rawBefore, 'before')
      : null;

    const messages = await this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId },
        ],
        ...(before ? { id: { lt: before } } : {}),
      },
      orderBy: { id: 'desc' },
      take: limit,
    });

    // Oldest first for rendering; hasMore lets the client page backwards.
    return { messages: messages.reverse(), hasMore: messages.length === limit };
  }

  /** Persist and deliver a message. Used by both REST fallback and the gateway. */
  async send(rawUserId: unknown, rawFriendId: unknown, rawText: unknown) {
    const userId = this.parseId(rawUserId, 'userId');
    const friendId = this.parseId(rawFriendId, 'friendId');
    const text = String(rawText ?? '').trim();
    if (!text) throw new BadRequestException('Повідомлення не може бути порожнім');
    const isVoice = text.startsWith('[voice:');
    const limit = isVoice ? 500000 : MAX_TEXT_LENGTH;
    if (text.length > limit) {
      throw new BadRequestException(
        isVoice
          ? 'Голосове повідомлення занадто довге'
          : `Повідомлення задовге (максимум ${MAX_TEXT_LENGTH} символів)`,
      );
    }
    // A stale client session (userId from before a DB reseed) would otherwise
    // fail requireFriendship silently as "not friends" or crash Message.create
    // on the foreign key — surface it as an auth error instead.
    const sender = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!sender) throw new UnauthorizedException('Сесія недійсна — увійдіть у систему ще раз');
    await this.requireFriendship(userId, friendId);

    const message = await this.prisma.message.create({
      data: { senderId: userId, receiverId: friendId, text },
    });

    // Deliver in real time to the recipient and echo to the sender's other tabs.
    const wire = {
      id: message.id,
      from: message.senderId,
      to: message.receiverId,
      text: message.text,
      createdAt: message.createdAt.toISOString(),
      readAt: null as string | null,
    };
    this.presence.emitToUser(friendId, 'chat:message', wire);
    this.presence.emitToUser(userId, 'chat:sent', wire);

    return message;
  }

  /** Mark all messages from friendId as read; notify the sender (read receipts). */
  async markRead(rawUserId: unknown, rawFriendId: unknown) {
    const userId = this.parseId(rawUserId, 'userId');
    const friendId = this.parseId(rawFriendId, 'friendId');

    const unread = await this.prisma.message.findMany({
      where: { senderId: friendId, receiverId: userId, readAt: null },
      select: { id: true },
    });
    if (unread.length === 0) return { ok: true, read: 0 };

    const ids = unread.map((m) => m.id);
    const readAt = new Date();
    await this.prisma.message.updateMany({
      where: { id: { in: ids } },
      data: { readAt },
    });

    this.presence.emitToUser(friendId, 'chat:read', {
      by: userId,
      messageIds: ids,
      readAt: readAt.toISOString(),
    });

    return { ok: true, read: ids.length };
  }

  /** Unread message counts per friend — powers the sidebar badges. */
  async unreadCounts(rawUserId: unknown) {
    const userId = this.parseId(rawUserId, 'userId');
    const groups = await this.prisma.message.groupBy({
      by: ['senderId'],
      where: { receiverId: userId, readAt: null },
      _count: { _all: true },
    });
    const counts: Record<number, number> = {};
    for (const g of groups) counts[g.senderId] = g._count._all;
    return counts;
  }
}
