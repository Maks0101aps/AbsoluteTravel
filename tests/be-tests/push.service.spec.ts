import webpush from 'web-push';
import { PushService } from './push.service';
import { PrismaService } from '../prisma.service';
import { PresenceService } from '../realtime/presence.service';

jest.mock('web-push', () => ({
  __esModule: true,
  default: {
    setVapidDetails: jest.fn(),
    sendNotification: jest.fn(),
  },
}));

describe('PushService', () => {
  const OLD_ENV = process.env;
  let prisma: jest.Mocked<Pick<PrismaService, 'pushSubscription'>> & {
    pushSubscription: {
      upsert: jest.Mock;
      deleteMany: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let presence: jest.Mocked<Pick<PresenceService, 'isOnline'>>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...OLD_ENV,
      VAPID_PUBLIC_KEY: 'pub-key',
      VAPID_PRIVATE_KEY: 'priv-key',
      VAPID_SUBJECT: 'mailto:test@example.com',
    };
    prisma = {
      pushSubscription: {
        upsert: jest.fn().mockResolvedValue(undefined),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as any;
    presence = { isOnline: jest.fn().mockReturnValue(false) };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  function makeService() {
    return new PushService(prisma as unknown as PrismaService, presence as unknown as PresenceService);
  }

  it('is disabled and reports no public key when VAPID env vars are missing', () => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    const svc = makeService();
    expect(svc.isEnabled()).toBe(false);
    expect(svc.getPublicKey()).toBeNull();
  });

  it('is enabled and configures webpush when VAPID env vars are present', () => {
    const svc = makeService();
    expect(svc.isEnabled()).toBe(true);
    expect(svc.getPublicKey()).toBe('pub-key');
    expect(webpush.setVapidDetails).toHaveBeenCalledWith('mailto:test@example.com', 'pub-key', 'priv-key');
  });

  describe('saveSubscription', () => {
    it('rejects a malformed subscription without touching the DB', async () => {
      const svc = makeService();
      const result = await svc.saveSubscription(1, { endpoint: '', keys: { p256dh: '', auth: '' } });
      expect(result).toEqual({ ok: false });
      expect(prisma.pushSubscription.upsert).not.toHaveBeenCalled();
    });

    it('upserts a valid subscription keyed by endpoint', async () => {
      const svc = makeService();
      const sub = { endpoint: 'https://push.example/abc', keys: { p256dh: 'p', auth: 'a' } };
      const result = await svc.saveSubscription(1, sub, 'Mozilla/5.0');
      expect(result).toEqual({ ok: true });
      expect(prisma.pushSubscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { endpoint: sub.endpoint } }),
      );
    });
  });

  describe('removeSubscription', () => {
    it('deletes by endpoint', async () => {
      const svc = makeService();
      const result = await svc.removeSubscription('https://push.example/abc');
      expect(result).toEqual({ ok: true });
      expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: { endpoint: 'https://push.example/abc' },
      });
    });
  });

  describe('notify', () => {
    it('does nothing when push is disabled', async () => {
      delete process.env.VAPID_PUBLIC_KEY;
      const svc = makeService();
      await svc.notify(1, { title: 't', body: 'b' });
      expect(prisma.pushSubscription.findMany).not.toHaveBeenCalled();
    });

    it('sends to every subscription of the user', async () => {
      prisma.pushSubscription.findMany.mockResolvedValue([
        { id: 1, endpoint: 'e1', p256dh: 'p', auth: 'a' },
        { id: 2, endpoint: 'e2', p256dh: 'p', auth: 'a' },
      ]);
      (webpush.sendNotification as jest.Mock).mockResolvedValue(undefined);
      const svc = makeService();
      await svc.notify(1, { title: 't', body: 'b' });
      expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
    });

    it('prunes subscriptions that the push service reports as gone (404/410)', async () => {
      prisma.pushSubscription.findMany.mockResolvedValue([{ id: 1, endpoint: 'dead', p256dh: 'p', auth: 'a' }]);
      (webpush.sendNotification as jest.Mock).mockRejectedValue({ statusCode: 410 });
      const svc = makeService();
      await svc.notify(1, { title: 't', body: 'b' });
      expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({ where: { endpoint: { in: ['dead'] } } });
    });

    it('keeps a subscription after a transient (non-404/410) failure', async () => {
      prisma.pushSubscription.findMany.mockResolvedValue([{ id: 1, endpoint: 'flaky', p256dh: 'p', auth: 'a' }]);
      (webpush.sendNotification as jest.Mock).mockRejectedValue({ statusCode: 500 });
      const svc = makeService();
      await svc.notify(1, { title: 't', body: 'b' });
      expect(prisma.pushSubscription.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('notifyIfAway', () => {
    it('skips sending when the user has an open socket', async () => {
      presence.isOnline.mockReturnValue(true);
      const svc = makeService();
      await svc.notifyIfAway(1, { title: 't', body: 'b' });
      expect(prisma.pushSubscription.findMany).not.toHaveBeenCalled();
    });

    it('sends when the user has no open socket', async () => {
      presence.isOnline.mockReturnValue(false);
      prisma.pushSubscription.findMany.mockResolvedValue([]);
      const svc = makeService();
      await svc.notifyIfAway(1, { title: 't', body: 'b' });
      expect(prisma.pushSubscription.findMany).toHaveBeenCalledWith({ where: { userId: 1 } });
    });
  });

  describe('notifyAllSubscribers', () => {
    it('returns 0 and sends nothing when disabled', async () => {
      delete process.env.VAPID_PUBLIC_KEY;
      const svc = makeService();
      const count = await svc.notifyAllSubscribers({ title: 't', body: 'b' });
      expect(count).toBe(0);
    });

    it('broadcasts to every stored subscription and returns the count', async () => {
      prisma.pushSubscription.findMany.mockResolvedValue([
        { id: 1, endpoint: 'e1', p256dh: 'p', auth: 'a' },
        { id: 2, endpoint: 'e2', p256dh: 'p', auth: 'a' },
        { id: 3, endpoint: 'e3', p256dh: 'p', auth: 'a' },
      ]);
      (webpush.sendNotification as jest.Mock).mockResolvedValue(undefined);
      const svc = makeService();
      const count = await svc.notifyAllSubscribers({ title: 'Walk!', body: 'Go outside' });
      expect(count).toBe(3);
      expect(webpush.sendNotification).toHaveBeenCalledTimes(3);
    });
  });
});
