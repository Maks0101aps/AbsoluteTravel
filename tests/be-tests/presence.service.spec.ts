import { PresenceService } from './presence.service';

describe('PresenceService', () => {
  let presence: PresenceService;

  beforeEach(() => {
    presence = new PresenceService();
  });

  it('a user is offline before any socket registers', () => {
    expect(presence.isOnline(1)).toBe(false);
    expect(presence.onlineUserIds()).toEqual([]);
  });

  it('registering a socket marks the user online', () => {
    presence.register(1, 'sock-a');
    expect(presence.isOnline(1)).toBe(true);
    expect(presence.onlineUserIds()).toEqual([1]);
  });

  it('userForSocket resolves the owning user', () => {
    presence.register(7, 'sock-x');
    expect(presence.userForSocket('sock-x')).toBe(7);
    expect(presence.userForSocket('unknown-sock')).toBeNull();
  });

  it('a user with multiple open sockets stays online until all disconnect', () => {
    presence.register(2, 'sock-1');
    presence.register(2, 'sock-2');
    expect(presence.isOnline(2)).toBe(true);

    presence.unregister('sock-1');
    expect(presence.isOnline(2)).toBe(true);

    presence.unregister('sock-2');
    expect(presence.isOnline(2)).toBe(false);
  });

  it('unregister returns the userId that owned the socket, or null if unknown', () => {
    presence.register(3, 'sock-y');
    expect(presence.unregister('sock-y')).toBe(3);
    expect(presence.unregister('sock-y')).toBeNull(); // already removed
    expect(presence.unregister('never-registered')).toBeNull();
  });

  it('lastSeenAt is null before the user is ever seen, and set after register/unregister', () => {
    expect(presence.lastSeenAt(9)).toBeNull();
    presence.register(9, 'sock-z');
    expect(presence.lastSeenAt(9)).toBeInstanceOf(Date);
  });

  it('touch updates lastSeenAt without requiring a socket', () => {
    presence.touch(5);
    const seen = presence.lastSeenAt(5);
    expect(seen).toBeInstanceOf(Date);
  });

  it('emitToUser is a no-op when no server has been attached', () => {
    presence.register(1, 'sock-a');
    expect(() => presence.emitToUser(1, 'test:event', { foo: 'bar' })).not.toThrow();
  });

  it('emitToUser is a no-op for a user with no open sockets', () => {
    const fakeServer = { to: jest.fn().mockReturnThis(), emit: jest.fn() } as any;
    presence.setServer(fakeServer);
    presence.emitToUser(999, 'test:event', {});
    expect(fakeServer.to).not.toHaveBeenCalled();
  });

  it('emitToUser broadcasts to every open socket of the user', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    const fakeServer = { to } as any;
    presence.setServer(fakeServer);

    presence.register(4, 'sock-1');
    presence.register(4, 'sock-2');
    presence.emitToUser(4, 'chat:message', { text: 'hi' });

    expect(to).toHaveBeenCalledTimes(2);
    expect(to).toHaveBeenCalledWith('sock-1');
    expect(to).toHaveBeenCalledWith('sock-2');
    expect(emit).toHaveBeenCalledWith('chat:message', { text: 'hi' });
  });
});
