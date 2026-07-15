import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { FriendsService } from '../friends/friends.service';
import { PresenceService } from '../realtime/presence.service';

export interface LiveLocation {
  userId: number;
  lat: number;
  lng: number;
  updatedAt: string; // ISO
}

// Positions older than this are dropped from broadcasts entirely; the
// frontend additionally greys out anything older than 5 minutes.
const STALE_MS = 30 * 60 * 1000;

@Injectable()
export class LocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly friends: FriendsService,
    private readonly presence: PresenceService,
  ) {}

  // Last known position per userId. In-memory by design: live positions are
  // ephemeral and must not survive a server restart (privacy).
  private readonly store = new Map<number, LiveLocation>();

  private parseId(raw: unknown, what: string): number {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException(`Некоректний ідентифікатор: ${what}`);
    }
    return id;
  }

  /** Store the user's last known position (called from the gateway). */
  update(userId: number, rawLat: unknown, rawLng: unknown): LiveLocation {
    const lat = Number(rawLat);
    const lng = Number(rawLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      throw new BadRequestException('Некоректні координати');
    }
    const loc: LiveLocation = {
      userId,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      updatedAt: new Date().toISOString(),
    };
    this.store.set(userId, loc);
    return loc;
  }

  forget(userId: number) {
    this.store.delete(userId);
  }

  private freshLocation(userId: number): LiveLocation | null {
    const loc = this.store.get(userId);
    if (!loc) return null;
    if (Date.now() - Date.parse(loc.updatedAt) > STALE_MS) {
      this.store.delete(userId);
      return null;
    }
    return loc;
  }

  /**
   * Fresh, visible locations of the user's friends — the payload of the
   * periodic `friends:locations` broadcast.
   */
  async friendsLocations(userId: number): Promise<LiveLocation[]> {
    const ids = await this.friends.friendIds(userId);
    if (ids.length === 0) return [];

    const candidates = ids
      .map((id) => this.freshLocation(id))
      .filter((l): l is LiveLocation => l !== null);
    if (candidates.length === 0) return [];

    // Respect the per-user visibility toggle.
    const visible = await this.prisma.user.findMany({
      where: { id: { in: candidates.map((l) => l.userId) }, locationVisible: true },
      select: { id: true },
    });
    const visibleIds = new Set(visible.map((u) => u.id));
    return candidates.filter((l) => visibleIds.has(l.userId));
  }

  /** REST: a single friend's last known location, friends-only (403 otherwise). */
  async locationFor(rawViewerId: unknown, rawTargetId: unknown): Promise<LiveLocation> {
    const viewerId = this.parseId(rawViewerId, 'viewerId');
    const targetId = this.parseId(rawTargetId, 'id');

    if (viewerId !== targetId) {
      const allowed = await this.friends.areFriends(viewerId, targetId);
      if (!allowed) {
        throw new ForbiddenException('Локацію можуть бачити лише друзі');
      }
      const target = await this.prisma.user.findUnique({
        where: { id: targetId },
        select: { locationVisible: true },
      });
      if (!target || !target.locationVisible) {
        throw new ForbiddenException('Користувач приховав свою локацію');
      }
    }

    const loc = this.freshLocation(targetId);
    if (!loc) throw new NotFoundException('Локація невідома');
    return loc;
  }

  /** Toggle whether friends can see this user's live position. */
  async setVisibility(rawUserId: unknown, visible: unknown) {
    const userId = this.parseId(rawUserId, 'userId');
    const value = visible === true || visible === 'true';
    // A stale client session can carry a user id that no longer exists in the
    // DB. Guard first so that turns into a clean 404 rather than a raw Prisma
    // P2025 500 (matches the not-found handling elsewhere in this service).
    const exists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Користувача не знайдено');
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { locationVisible: value },
      select: { id: true, locationVisible: true },
    });
    // Hiding takes effect immediately: drop the stored position too.
    if (!value) this.store.delete(userId);
    return { userId: user.id, visible: user.locationVisible };
  }

  async updateProfile(rawUserId: unknown, rawName: unknown, rawAvatar: unknown) {
    const userId = this.parseId(rawUserId, 'userId');
    const name = String(rawName ?? '').trim();
    const avatar = String(rawAvatar ?? '').trim();
    if (!name) {
      throw new BadRequestException('Ім’я не може бути порожнім');
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name, avatar },
    });
    return { ok: true, userId: user.id };
  }

  /**
   * Push fresh friend locations to every connected user. Called on a 10s
   * interval by the gateway, and opportunistically after location updates.
   */
  async broadcastToOnlineUsers() {
    const online = this.presence.onlineUserIds();
    for (const userId of online) {
      try {
        const locations = await this.friendsLocations(userId);
        this.presence.emitToUser(userId, 'friends:locations', locations);
      } catch {
        // One user's failure must not stop the broadcast loop.
      }
    }
  }
}
