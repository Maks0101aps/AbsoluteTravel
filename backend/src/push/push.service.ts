import { Injectable, Logger } from '@nestjs/common';
import webpush from 'web-push';
import { PrismaService } from '../prisma.service';
import { PresenceService } from '../realtime/presence.service';

export interface PushPayload {
  title: string;
  body: string;
  /** In-app path to open on click (defaults to '/'). */
  url?: string;
  /** Collapses same-tag notifications so a chat doesn't stack ten times. */
  tag?: string;
  icon?: string;
}

interface StoredSubscription {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private enabled = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly presence: PresenceService,
  ) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject =
      process.env.VAPID_SUBJECT || 'mailto:admin@absolutetravel.app';
    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.enabled = true;
    } else {
      this.logger.warn(
        'VAPID keys not set — web push disabled. Set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY.',
      );
    }
  }

  isEnabled() {
    return this.enabled;
  }

  getPublicKey(): string | null {
    return this.enabled ? (process.env.VAPID_PUBLIC_KEY ?? null) : null;
  }

  /** Upsert a browser subscription for a user (unique by endpoint). */
  async saveSubscription(
    userId: number,
    sub: { endpoint: string; keys: { p256dh: string; auth: string } },
    userAgent?: string,
  ) {
    if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
      return { ok: false as const };
    }
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      create: {
        userId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        userAgent: userAgent?.slice(0, 255),
      },
      // Re-subscribing may hand the endpoint to a different account on a shared
      // device, so move it and refresh the (rotatable) keys.
      update: {
        userId,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        userAgent: userAgent?.slice(0, 255),
      },
    });
    return { ok: true as const };
  }

  async removeSubscription(endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return { ok: true as const };
  }

  /** Send to every device of a user; prune endpoints the push service rejects. */
  async notify(userId: number, payload: PushPayload) {
    if (!this.enabled) return;
    const subs = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });
    await this.sendToAll(subs, payload);
  }

  /**
   * Only push when the user has no live socket open — if they're connected the
   * in-app realtime layer already surfaced it, and a duplicate OS notification
   * would be noise.
   */
  async notifyIfAway(userId: number, payload: PushPayload) {
    if (this.presence.isOnline(userId)) return;
    await this.notify(userId, payload);
  }

  /** Broadcast to all subscribers (used by the walk-reminder cron). */
  async notifyAllSubscribers(payload: PushPayload) {
    if (!this.enabled) return 0;
    const subs = await this.prisma.pushSubscription.findMany();
    await this.sendToAll(subs, payload);
    return subs.length;
  }

  private async sendToAll(subs: StoredSubscription[], payload: PushPayload) {
    const body = JSON.stringify(payload);
    const dead: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body,
          );
        } catch (err: unknown) {
          const status = (err as { statusCode?: number })?.statusCode;
          // 404/410 = subscription gone for good; drop it. Other errors are
          // transient (network, rate limit) and the row is kept for a retry.
          if (status === 404 || status === 410) dead.push(s.endpoint);
          else
            this.logger.warn(
              `push send failed (${status ?? 'unknown'}) for ${s.endpoint.slice(0, 40)}…`,
            );
        }
      }),
    );
    if (dead.length) {
      await this.prisma.pushSubscription.deleteMany({
        where: { endpoint: { in: dead } },
      });
      this.logger.log(`pruned ${dead.length} expired push subscription(s)`);
    }
  }
}
