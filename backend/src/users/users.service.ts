import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { FriendsService } from '../friends/friends.service';
import { PresenceService } from '../realtime/presence.service';

// What a profile page shows about a traveler. Deliberately excludes email,
// coins, unlockedItems and the live location — those are the owner's business.
export interface PublicProfileDto {
  id: number;
  username: string;
  name: string;
  avatar: string;
  level: number;
  xp: number;
  rank: string;
  city: string | null;
  region: string | null;
  createdAt: Date;
  online: boolean;
  lastSeenAt: string | null;
  profile: unknown | null;
  stats: { cells: number; places: number; friends: number };
  // Viewer's relationship with this user — drives the action button
  // ("Написати" for friends, "Додати в друзі" otherwise). 'self' when
  // viewing your own profile.
  relation: 'self' | 'none' | 'friends' | 'outgoing' | 'incoming' | 'declined';
  // The friendship edge id, when one exists — needed to accept/cancel.
  friendshipId: number | null;
  // Whether the viewer may read this user's wall (friends-only; always true
  // for self). The wall endpoint enforces this independently.
  canSeeWall: boolean;
}

@Injectable()
export class UsersService {
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

  /**
   * A user's public profile as seen by `viewerId`. The profile itself is
   * visible to any signed-in traveler; only the wall is friends-gated (see
   * `canSeeWall` and WallService).
   */
  async publicProfile(rawId: unknown, rawViewerId: unknown): Promise<PublicProfileDto> {
    const id = this.parseId(rawId, 'id');
    const viewerId = this.parseId(rawViewerId, 'viewerId');

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        name: true,
        avatar: true,
        level: true,
        xp: true,
        rank: true,
        city: true,
        region: true,
        createdAt: true,
        profile: true,
      },
    });
    if (!user) throw new NotFoundException('Користувача не знайдено');

    const [cells, places, friendCount] = await Promise.all([
      this.prisma.visitedCell.count({ where: { userId: id } }),
      this.prisma.checkmark.count({ where: { userId: id } }),
      this.prisma.friend.count({
        where: { status: 'ACCEPTED', OR: [{ senderId: id }, { receiverId: id }] },
      }),
    ]);

    let relation: PublicProfileDto['relation'] = 'self';
    let friendshipId: number | null = null;
    if (viewerId !== id) {
      const edge = await this.prisma.friend.findFirst({
        where: {
          OR: [
            { senderId: viewerId, receiverId: id },
            { senderId: id, receiverId: viewerId },
          ],
        },
      });
      relation = 'none';
      if (edge) {
        friendshipId = edge.id;
        if (edge.status === 'ACCEPTED') relation = 'friends';
        else if (edge.status === 'PENDING') relation = edge.senderId === viewerId ? 'outgoing' : 'incoming';
        else relation = 'declined';
      }
    }

    let customization: unknown = null;
    if (user.profile) {
      try {
        customization = JSON.parse(user.profile);
      } catch {
        // malformed blob: render the profile without customization
      }
    }

    const { profile: _raw, ...rest } = user;
    return {
      ...rest,
      online: this.presence.isOnline(id),
      lastSeenAt: this.presence.lastSeenAt(id)?.toISOString() ?? null,
      profile: customization,
      stats: { cells, places, friends: friendCount },
      relation,
      friendshipId,
      canSeeWall: relation === 'self' || relation === 'friends',
    };
  }

  /**
   * Save the owner's display name, avatar and (optionally) the full
   * customization blob. The blob is stored verbatim as JSON: it is the
   * client-authored ProfileCustomization shape and nothing server-side reads
   * its fields, so validation here is limited to size and JSON-ness.
   */
  async updateProfile(rawUserId: unknown, rawName: unknown, rawAvatar: unknown, profile?: unknown) {
    const userId = this.parseId(rawUserId, 'userId');
    const name = String(rawName ?? '').trim();
    const avatar = String(rawAvatar ?? '').trim();
    if (!name) {
      throw new BadRequestException('Ім’я не може бути порожнім');
    }
    // A stale client session can carry a user id that no longer exists in the
    // DB. Guard first so that turns into a clean 404 rather than a raw Prisma
    // P2025 500 (matches the not-found handling across the app).
    const exists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Користувача не знайдено');

    let profileJson: string | undefined;
    if (profile !== undefined && profile !== null) {
      if (typeof profile !== 'object') {
        throw new BadRequestException('Некоректні дані профілю');
      }
      profileJson = JSON.stringify(profile);
      // Custom avatars are data URLs and dominate the size here; the wizard
      // already downscales them (see frontend/src/data/imageUtils.ts).
      if (profileJson.length > 2_000_000) {
        throw new BadRequestException('Профіль завеликий — зменште зображення');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name, avatar, ...(profileJson !== undefined ? { profile: profileJson } : {}) },
      select: { id: true },
    });
    return { ok: true, userId: user.id };
  }
}
