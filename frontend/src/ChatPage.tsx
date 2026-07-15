import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getChatHistory,
  getFriends,
  getUnreadCounts,
  markChatRead,
  sendChatMessage,
  type ChatMessage,
  type FriendEntry,
} from './api';
import { currentSocket, getSocket } from './socket';
import { UserAvatar } from './UserCard';

const CREAM = '#F4F1E8';
const PANEL = '#0B2B20';
const READ_BLUE = '#5BB8F5';

interface ChatPageProps {
  userId: number;
  accent?: string;
  // Open this friend's thread immediately (e.g. from "Написати" buttons).
  initialFriendId?: number | null;
}

// Payload shape of the gateway's chat:message / chat:sent events.
interface WireMessage {
  id: number;
  from: number;
  to: number;
  text: string;
  createdAt: string;
  readAt: string | null;
}

function wireToMessage(w: WireMessage): ChatMessage {
  return { id: w.id, senderId: w.from, receiverId: w.to, text: w.text, createdAt: w.createdAt, readAt: w.readAt };
}

/** Append with de-duplication by id (WS echo + REST fallback can overlap). */
function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map<number, ChatMessage>();
  for (const m of prev) byId.set(m.id, m);
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function ChatPage({ userId, accent = '#3FA66B', initialFriendId = null }: ChatPageProps) {
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [activeId, setActiveId] = useState<number | null>(initialFriendId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [input, setInput] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<number | null>(activeId);
  activeIdRef.current = activeId;

  const activeFriend = useMemo(() => friends.find((f) => f.id === activeId) ?? null, [friends, activeId]);

  const loadFriends = useCallback(() => {
    getFriends(userId).then(setFriends).catch(() => {});
    getUnreadCounts(userId).then(setUnread).catch(() => {});
  }, [userId]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  useEffect(() => {
    if (initialFriendId) setActiveId(initialFriendId);
  }, [initialFriendId]);

  // Load the thread when the active friend changes; mark it read.
  useEffect(() => {
    if (!activeId) return;
    setMessages([]);
    setError(null);
    getChatHistory(userId, activeId)
      .then(({ messages: msgs, hasMore: more }) => {
        setMessages(msgs);
        setHasMore(more);
      })
      .catch((e: any) => setError(e.message));
    markChatRead(userId, activeId).catch(() => {});
    setUnread((prev) => ({ ...prev, [activeId]: 0 }));
  }, [userId, activeId]);

  // WebSocket wiring: live messages, read receipts, connection state.
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    getSocket(userId).then((socket) => {
      if (disposed) return;
      setWsConnected(socket.connected);

      const onConnect = () => setWsConnected(true);
      const onDisconnect = () => setWsConnected(false);

      const onMessage = (w: WireMessage) => {
        const msg = wireToMessage(w);
        if (activeIdRef.current === msg.senderId) {
          setMessages((prev) => mergeMessages(prev, [msg]));
          // Thread is open — mark it read right away so the sender sees ✓✓.
          markChatRead(userId, msg.senderId).catch(() => {});
        } else {
          setUnread((prev) => ({ ...prev, [msg.senderId]: (prev[msg.senderId] ?? 0) + 1 }));
        }
      };

      // Echo of our own sends (covers other tabs of the same account too).
      const onSent = (w: WireMessage) => {
        if (activeIdRef.current === w.to) {
          setMessages((prev) => mergeMessages(prev, [wireToMessage(w)]));
        }
      };

      const onRead = ({ messageIds }: { by: number; messageIds: number[] }) => {
        const readAt = new Date().toISOString();
        const ids = new Set(messageIds);
        setMessages((prev) => prev.map((m) => (ids.has(m.id) && !m.readAt ? { ...m, readAt } : m)));
      };

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      socket.on('chat:message', onMessage);
      socket.on('chat:sent', onSent);
      socket.on('chat:read', onRead);
      cleanup = () => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('chat:message', onMessage);
        socket.off('chat:sent', onSent);
        socket.off('chat:read', onRead);
      };
    });
    return () => {
      disposed = true;
      cleanup();
    };
  }, [userId]);

  // Polling fallback: when the socket is down, refresh the open thread and
  // the unread badges every 5 seconds so chat still works.
  useEffect(() => {
    if (wsConnected) return;
    const timer = setInterval(() => {
      getUnreadCounts(userId).then(setUnread).catch(() => {});
      const fid = activeIdRef.current;
      if (fid) {
        getChatHistory(userId, fid)
          .then(({ messages: msgs }) => setMessages((prev) => mergeMessages(prev, msgs)))
          .catch(() => {});
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [wsConnected, userId]);

  // Keep the thread scrolled to the newest message.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, activeId]);

  const loadOlder = () => {
    if (!activeId || messages.length === 0) return;
    getChatHistory(userId, activeId, 50, messages[0].id)
      .then(({ messages: older, hasMore: more }) => {
        setMessages((prev) => mergeMessages(prev, older));
        setHasMore(more);
      })
      .catch(() => {});
  };

  const send = async () => {
    const text = input.trim();
    if (!text || !activeId || sending) return;
    setSending(true);
    setError(null);
    try {
      const socket = currentSocket();
      if (socket?.connected) {
        const ack = await socket.timeout(5000).emitWithAck('chat:send', { toUserId: activeId, text });
        if (!ack?.ok) throw new Error(ack?.error ?? 'Не вдалося надіслати');
        setMessages((prev) =>
          mergeMessages(prev, [
            { id: ack.id, senderId: userId, receiverId: activeId, text, createdAt: ack.createdAt, readAt: null },
          ]),
        );
      } else {
        // REST fallback while the WebSocket is disconnected.
        const msg = await sendChatMessage(userId, activeId, text);
        setMessages((prev) => mergeMessages(prev, [msg]));
      }
      setInput('');
    } catch (e: any) {
      setError(e.message ?? 'Не вдалося надіслати повідомлення');
    } finally {
      setSending(false);
    }
  };

  const totalUnread = Object.values(unread).reduce((s, n) => s + n, 0);

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", color: CREAM }}>
      <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.22em', color: accent, marginBottom: '10px' }}>
        ЧАТ
      </div>
      <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: 'clamp(24px, 3vw, 34px)', margin: '0 0 18px' }}>
        Розмови з друзями
        {!wsConnected && (
          <span style={{ marginLeft: '12px', fontSize: '12px', fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: '#E0A54E', background: 'rgba(224,165,78,0.15)', border: '1px solid rgba(224,165,78,0.4)', borderRadius: '999px', padding: '4px 10px', verticalAlign: 'middle' }}>
            офлайн-режим · оновлення кожні 5 с
          </span>
        )}
      </h2>

      <div style={{ display: 'flex', gap: '18px', alignItems: 'stretch', height: 'clamp(440px, 62vh, 640px)' }}>
        {/* sidebar: friends with unread badges */}
        <div style={{ flex: '0 0 264px', minWidth: '220px', background: PANEL, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.09)', overflowY: 'auto', padding: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(244,241,232,0.45)', padding: '6px 8px 10px' }}>
            ДРУЗІ {totalUnread > 0 && <span style={{ color: accent }}>· {totalUnread} нових</span>}
          </div>
          {friends.length === 0 && (
            <div style={{ fontSize: '13px', color: 'rgba(244,241,232,0.5)', padding: '8px' }}>
              Немає друзів для листування. Додай їх у вкладці «Друзі».
            </div>
          )}
          {friends.map((f) => {
            const n = unread[f.id] ?? 0;
            const isActive = f.id === activeId;
            return (
              <button
                key={f.id}
                onClick={() => setActiveId(f.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  textAlign: 'left',
                  background: isActive ? `${accent}22` : 'transparent',
                  border: `1px solid ${isActive ? `${accent}66` : 'transparent'}`,
                  borderRadius: '12px',
                  padding: '9px 10px',
                  cursor: 'pointer',
                  color: CREAM,
                  fontFamily: "'Manrope', sans-serif",
                }}
              >
                <UserAvatar user={f} size={36} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
                  <span style={{ display: 'block', fontSize: '11px', color: f.online ? accent : 'rgba(244,241,232,0.4)' }}>
                    {f.online ? 'онлайн' : 'офлайн'}
                  </span>
                </span>
                {n > 0 && (
                  <span style={{ background: accent, color: '#071F16', fontSize: '11px', fontWeight: 800, borderRadius: '999px', padding: '2px 8px', flex: '0 0 auto' }}>
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* thread */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: '#081E15', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.09)' }}>
          {!activeFriend ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(244,241,232,0.45)', fontSize: '14px', padding: '20px', textAlign: 'center' }}>
              Обери друга ліворуч, щоб почати розмову 💬
            </div>
          ) : (
            <>
              {/* thread header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <UserAvatar user={activeFriend} size={38} />
                <div>
                  <div style={{ fontSize: '14.5px', fontWeight: 700 }}>{activeFriend.name}</div>
                  <div style={{ fontSize: '11.5px', color: activeFriend.online ? accent : 'rgba(244,241,232,0.45)' }}>
                    {activeFriend.online ? 'онлайн' : 'був(ла) нещодавно'} · Рівень {activeFriend.level}
                  </div>
                </div>
              </div>

              {/* messages */}
              <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {hasMore && (
                  <button
                    onClick={loadOlder}
                    style={{ alignSelf: 'center', background: 'rgba(255,255,255,0.07)', color: 'rgba(244,241,232,0.7)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '999px', padding: '6px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginBottom: '6px' }}
                  >
                    Показати старіші
                  </button>
                )}
                {messages.map((m) => {
                  const mine = m.senderId === userId;
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                      <div
                        style={{
                          maxWidth: '72%',
                          background: mine ? accent : PANEL,
                          color: mine ? '#071F16' : CREAM,
                          border: mine ? 'none' : '1px solid rgba(255,255,255,0.09)',
                          borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          padding: '9px 13px',
                          fontSize: '13.5px',
                          lineHeight: 1.5,
                          wordBreak: 'break-word',
                        }}
                      >
                        {m.text}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', opacity: 0.75, marginLeft: '8px', whiteSpace: 'nowrap' }}>
                          {formatTime(m.createdAt)}
                          {mine && (
                            // Read receipt: grey ✓ = delivered, blue ✓✓ = read.
                            <span title={m.readAt ? 'Прочитано' : 'Надіслано'} style={{ color: m.readAt ? READ_BLUE : 'rgba(7,31,22,0.55)', fontWeight: 800, letterSpacing: '-2px' }}>
                              {m.readAt ? '✓✓' : '✓'}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {error && (
                <div style={{ margin: '0 18px 8px', padding: '8px 12px', borderRadius: '9px', fontSize: '12.5px', background: 'rgba(217,83,79,0.15)', border: '1px solid rgba(217,83,79,0.5)', color: '#E58784' }}>
                  {error}
                </div>
              )}

              {/* input */}
              <div style={{ display: 'flex', gap: '10px', padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder={`Повідомлення для ${activeFriend.name}…`}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: PANEL,
                    border: '1px solid rgba(255,255,255,0.14)',
                    borderRadius: '12px',
                    padding: '12px 15px',
                    color: CREAM,
                    fontSize: '14px',
                    fontFamily: "'Manrope', sans-serif",
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => void send()}
                  disabled={sending || !input.trim()}
                  style={{
                    background: accent,
                    color: '#071F16',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '0 22px',
                    fontSize: '14px',
                    fontWeight: 800,
                    cursor: sending || !input.trim() ? 'default' : 'pointer',
                    opacity: sending || !input.trim() ? 0.55 : 1,
                    fontFamily: "'Manrope', sans-serif",
                  }}
                >
                  {sending ? '…' : 'Надіслати'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
