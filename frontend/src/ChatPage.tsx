import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getChatHistory,
  getFriends,
  getUnreadCounts,
  markChatRead,
  sendChatMessage,
  askAdvisor,
  getAdvisorStatus,
  type ChatMessage,
  type FriendEntry,
  type AdvisorTurn,
  type AuthUser,
} from './api';
import { currentSocket, getSocket } from './socket';
import { UserAvatar } from './UserCard';
import { Icon, type IconName } from './icons';
import { useViewport } from './useViewport';

const CREAM = '#F4F1E8';
const PANEL = '#0B2B20';
const READ_BLUE = '#5BB8F5';

interface ChatPageProps {
  userId: number;
  user?: AuthUser;
  accent?: string;
  // Open this friend's thread immediately (e.g. from "Написати" buttons).
  initialFriendId?: number | 'advisor' | null;
  hideSidebar?: boolean;
}

interface QuickTopic {
  key: string;
  label: string;
  icon: IconName;
  prompt: string;
}

const QUICK_TOPICS: QuickTopic[] = [
  { key: 'packing', label: 'Що взяти з собою', icon: 'backpack', prompt: 'Допоможи скласти список речей у подорож.' },
  { key: 'where', label: 'Куди поїхати', icon: 'compass', prompt: 'Порадь цікаві напрямки для подорожі Україною.' },
  { key: 'route', label: 'Скласти маршрут', icon: 'map', prompt: 'Допоможи спланувати маршрут на кілька днів.' },
  { key: 'food', label: 'Що скуштувати', icon: 'flame', prompt: 'Які локальні страви варто скуштувати і де?' },
  { key: 'budget', label: 'Бюджет поїздки', icon: 'coin', prompt: 'Як розрахувати бюджет на подорож і заощадити?' },
  { key: 'season', label: 'Коли їхати', icon: 'sun', prompt: 'Підкажи найкращий час для поїздки.' },
  { key: 'safety', label: 'Безпека', icon: 'shield', prompt: 'Дай поради щодо безпечної подорожі.' },
];

function FormattedText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        const bullet = /^[-*•]\s+/.test(trimmed);
        if (!trimmed) return <div key={i} style={{ height: '6px' }} />;
        if (bullet) {
          return (
            <div key={i} style={{ display: 'flex', gap: '8px', margin: '2px 0' }}>
              <span style={{ opacity: 0.6 }}>•</span>
              <span>{trimmed.replace(/^[-*•]\s+/, '')}</span>
            </div>
          );
        }
        return (
          <div key={i} style={{ margin: '3px 0' }}>
            {trimmed}
          </div>
        );
      })}
    </>
  );
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

function VoiceMessagePlayer({ text, mine }: { text: string; mine: boolean }) {
  const match = text.match(/^\[voice:(data:audio\/[^\]]+)\]$/);
  const audioUrl = match ? match[1] : '';
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(audio.duration || 0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!playing) return;
    let animationFrameId: number;
    const updateProgress = () => {
      if (audioRef.current && !audioRef.current.paused) {
        setCurrentTime(audioRef.current.currentTime);
        animationFrameId = requestAnimationFrame(updateProgress);
      }
    };
    animationFrameId = requestAnimationFrame(updateProgress);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [playing]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setPlaying(true);
    }
  };

  const handleSeek = (val: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = val;
    setCurrentTime(val);
  };

  const formatSec = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const color = mine ? '#071F16' : '#F4F1E8';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '220px', padding: '4px 0' }}>
      <button
        onClick={toggle}
        style={{
          background: mine ? 'rgba(7,31,22,0.12)' : 'rgba(255,255,255,0.12)',
          border: 'none',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: color,
          flex: '0 0 auto',
        }}
      >
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="4" y="4" width="4" height="16" rx="1" />
            <rect x="16" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21" />
          </svg>
        )}
      </button>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <input
          type="range"
          min={0}
          max={duration || 100}
          step="any"
          value={currentTime}
          onChange={(e) => handleSeek(Number(e.target.value))}
          style={{
            width: '100%',
            accentColor: color,
            height: '4px',
            cursor: 'pointer',
            background: mine ? 'rgba(7,31,22,0.2)' : 'rgba(255,255,255,0.2)',
            borderRadius: '2px',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: color, opacity: 0.8 }}>
          <span>{formatSec(currentTime)}</span>
          <span>{formatSec(duration)}</span>
        </div>
      </div>
    </div>
  );
}

function ChatPage({ userId, user, accent = '#3FA66B', initialFriendId = null, hideSidebar = false }: ChatPageProps) {
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [activeId, setActiveId] = useState<number | 'advisor' | null>(initialFriendId);
  const { isNarrow } = useViewport();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [input, setInput] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<number | 'advisor' | null>(activeId);
  activeIdRef.current = activeId;

  // AI Advisor state
  const [advisorAvailable, setAdvisorAvailable] = useState<boolean | null>(null);
  const [advisorMessages, setAdvisorMessages] = useState<AdvisorTurn[]>(() => {
    try {
      const stored = localStorage.getItem(`absolute_travel_advisor_history_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [gpsPosition, setGpsPosition] = useState<{ lat: number; lng: number } | null>(null);

  // Track current GPS coordinates in real-time
  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setGpsPosition({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => {
          console.warn('Geolocation watch failed or denied', err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, []);

  const [isHolding, setIsHolding] = useState(false);
  const pressStartTimeRef = useRef<number>(0);
  const isHoldingRef = useRef<boolean>(false);
  const buttonRectRef = useRef<DOMRect | null>(null);
  const shouldSendRef = useRef<boolean>(true);

  const activeFriend = useMemo(() => {
    if (activeId === 'advisor') return null;
    return friends.find((f) => f.id === activeId) ?? null;
  }, [friends, activeId]);

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

  useEffect(() => {
    try {
      localStorage.setItem(`absolute_travel_advisor_history_${userId}`, JSON.stringify(advisorMessages));
    } catch (e) {
      console.error('Failed to save advisor history', e);
    }
  }, [advisorMessages, userId]);

  useEffect(() => {
    getAdvisorStatus()
      .then((s) => setAdvisorAvailable(s.available))
      .catch(() => setAdvisorAvailable(null));
  }, []);

  // Keep the thread scrolled to the newest message for AI too.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [advisorMessages.length, advisorLoading]);

  // Load the thread when the active friend changes; mark it read.
  useEffect(() => {
    if (!activeId || activeId === 'advisor') return;
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
      if (fid && fid !== 'advisor') {
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

  useEffect(() => {
    const handleGlobalRelease = (e: MouseEvent | TouchEvent) => {
      if (!isHoldingRef.current) return;

      const elapsed = Date.now() - pressStartTimeRef.current;
      if (elapsed > 350) {
        // It was a hold! We stop and decide whether to send or cancel.
        let clientX = 0;
        let clientY = 0;
        if ('changedTouches' in e && e.changedTouches.length > 0) {
          clientX = e.changedTouches[0].clientX;
          clientY = e.changedTouches[0].clientY;
        } else if ('clientX' in e) {
          clientX = e.clientX;
          clientY = e.clientY;
        }

        let shouldSend = true;
        if (buttonRectRef.current) {
          const rect = buttonRectRef.current;
          // If they dragged left by more than 40px, or moved vertically by more than 80px, we cancel
          const draggedLeft = clientX < rect.left - 40;
          const draggedFar = Math.abs(clientY - (rect.top + rect.height / 2)) > 80 || Math.abs(clientX - (rect.left + rect.width / 2)) > 120;
          
          if (draggedLeft || draggedFar) {
            shouldSend = false;
          }
        }

        stopRecording(shouldSend);
      } else {
        // It was a quick click! We reset holding state but keep recording.
        setIsHolding(false);
        isHoldingRef.current = false;
      }
    };

    window.addEventListener('mouseup', handleGlobalRelease);
    window.addEventListener('touchend', handleGlobalRelease, { passive: true });

    return () => {
      window.removeEventListener('mouseup', handleGlobalRelease);
      window.removeEventListener('touchend', handleGlobalRelease);
    };
  }, []);

  const handleMicPressStart = (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    if ('button' in e && e.button !== 0) return;
    
    if (e.cancelable) {
      e.preventDefault();
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    buttonRectRef.current = rect;
    pressStartTimeRef.current = Date.now();
    isHoldingRef.current = true;
    setIsHolding(true);
    
    void startRecording();
  };

  const loadOlder = () => {
    if (!activeId || activeId === 'advisor' || messages.length === 0) return;
    getChatHistory(userId, activeId, 50, messages[0].id)
      .then(({ messages: older, hasMore: more }) => {
        setMessages((prev) => mergeMessages(prev, older));
        setHasMore(more);
      })
      .catch(() => {});
  };

  const startRecording = async () => {
    try {
      shouldSendRef.current = true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        if (shouldSendRef.current && audioChunksRef.current.length > 0) {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64data = reader.result as string;
            void sendVoiceMessage(base64data);
          };
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 10) {
            setTimeout(() => stopRecording(true), 0);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Не вдалося отримати доступ до мікрофона');
      setIsRecording(false);
      setIsHolding(false);
      isHoldingRef.current = false;
    }
  };

  const stopRecording = (shouldSend: boolean) => {
    shouldSendRef.current = shouldSend;
    setIsHolding(false);
    isHoldingRef.current = false;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (!shouldSend) {
        audioChunksRef.current = [];
      }
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const sendVoiceMessage = async (base64data: string) => {
    if (!activeId || activeId === 'advisor') return;
    setSending(true);
    setError(null);
    const text = `[voice:${base64data}]`;
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
        const msg = await sendChatMessage(userId, activeId, text);
        setMessages((prev) => mergeMessages(prev, [msg]));
      }
    } catch (e: any) {
      setError(e.message ?? 'Не вдалося надіслати голосове повідомлення');
    } finally {
      setSending(false);
    }
  };

  const sendAdvisor = async (text: string, topic?: string) => {
    const message = text.trim();
    if (!message || advisorLoading || advisorAvailable === false) return;

    const history = advisorMessages.slice(-12);
    const nextMessages: AdvisorTurn[] = [...advisorMessages, { role: 'user', text: message }];
    setAdvisorMessages(nextMessages);
    setInput('');
    setError(null);
    setAdvisorLoading(true);

    try {
      const { reply } = await askAdvisor({
        message,
        topic,
        history,
        lat: gpsPosition?.lat ?? undefined,
        lng: gpsPosition?.lng ?? undefined,
        city: user?.city ?? undefined,
        region: user?.region ?? undefined,
      });
      setAdvisorMessages((cur) => [...cur, { role: 'model', text: reply }]);
    } catch (e: any) {
      setError(e?.message ?? 'Не вдалося отримати відповідь від ШІ-порадника');
    } finally {
      setAdvisorLoading(false);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || !activeId || activeId === 'advisor' || sending) return;
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

  // Only the phone layout has somewhere to go back to; the advisor tab has no list.
  const backButton =
    isNarrow && !hideSidebar ? (
      <button
        onClick={() => setActiveId(null)}
        aria-label="Назад до списку чатів"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          flex: '0 0 auto',
          marginLeft: '-4px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: CREAM,
          fontSize: '18px',
          lineHeight: 1,
          cursor: 'pointer',
        }}
      >
        ‹
      </button>
    ) : null;

  // On phones the list and the thread can't sit side by side, so they take turns:
  // the list is the default view and picking someone swaps to their thread.
  const showSidebar = !hideSidebar && (!isNarrow || activeId === null);
  const showThread = !isNarrow || activeId !== null || hideSidebar;

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", color: CREAM, height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ display: 'flex', gap: '0', alignItems: 'stretch', flex: 1, minHeight: 0 }}>
        {/* sidebar: friends with unread badges */}
        {showSidebar && (
          <div style={{ flex: isNarrow ? '1 1 auto' : '0 0 280px', minWidth: isNarrow ? 0 : '220px', minHeight: 0, background: PANEL, borderRight: isNarrow ? 'none' : '1px solid rgba(255,255,255,0.09)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            
            {/* Section: ШІ-Порадник */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
              <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(244,241,232,0.45)' }}>
                ШІ-ПОРАДНИК
              </span>
            </div>
            <div style={{ padding: '10px 10px 4px', flexShrink: 0 }}>
              <button
                onClick={() => setActiveId('advisor')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  textAlign: 'left',
                  background: activeId === 'advisor' ? `${accent}22` : 'transparent',
                  border: `1px solid ${activeId === 'advisor' ? `${accent}66` : 'transparent'}`,
                  borderRadius: '12px',
                  padding: '9px 10px',
                  cursor: 'pointer',
                  color: CREAM,
                  fontFamily: "'Manrope', sans-serif",
                  marginBottom: '4px',
                }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: `${accent}1F`,
                  border: `1px solid ${accent}55`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon name="compass" size={20} stroke={accent} strokeWidth={1.8} />
                </div>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Порадник Absolute Travel</span>
                  <span style={{ display: 'block', fontSize: '11px', color: advisorAvailable ? accent : 'rgba(244,241,232,0.4)' }}>
                    {advisorAvailable ? 'активний' : 'недоступний'}
                  </span>
                </span>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
              <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(244,241,232,0.45)' }}>
                ДРУЗІ {totalUnread > 0 && <span style={{ color: accent }}>· {totalUnread} нових</span>}
              </span>
              {!wsConnected && (
                <span title="офлайн-режим · оновлення кожні 5 с" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#E0A54E', background: 'rgba(224,165,78,0.15)', border: '1px solid rgba(224,165,78,0.4)', borderRadius: '999px', padding: '2px 8px' }}>
                  офлайн
                </span>
              )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
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
                      marginBottom: '4px',
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
          </div>
        )}

        {/* thread */}
        {showThread && (
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#081E15' }}>
          {activeId === null ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(244,241,232,0.45)', fontSize: '14px', padding: '20px', textAlign: 'center' }}>
              Обери друга ліворуч або ШІ-порадника, щоб почати розмову 💬
            </div>
          ) : (
            <>
              {/* thread header */}
              {activeId === 'advisor' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {backButton}
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: `${accent}1F`,
                    border: `1.5px solid ${accent}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Icon name="compass" size={20} stroke={accent} strokeWidth={1.8} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14.5px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Порадник Absolute Travel</div>
                    <div style={{ fontSize: '11.5px', color: advisorAvailable ? accent : 'rgba(244,241,232,0.45)' }}>
                      {advisorAvailable ? 'активний' : 'недоступний'} · ШІ-порадник
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {backButton}
                  {activeFriend && <UserAvatar user={activeFriend} size={38} />}
                  {activeFriend && (
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '14.5px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeFriend.name}</div>
                      <div style={{ fontSize: '11.5px', color: activeFriend.online ? accent : 'rgba(244,241,232,0.45)' }}>
                        {activeFriend.online ? 'онлайн' : 'був(ла) нещодавно'} · Рівень {activeFriend.level}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* messages */}
              <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeId === 'advisor' ? (
                  advisorMessages.length === 0 && !advisorLoading ? (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'rgba(244,241,232,0.5)', gap: '12px', padding: '20px' }}>
                      <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '14px',
                        background: `${accent}1F`,
                        border: `1px solid ${accent}55`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Icon name="compass" size={26} stroke={accent} strokeWidth={1.7} />
                      </div>
                      <div style={{ fontSize: '14px', maxWidth: '320px', lineHeight: 1.6 }}>
                        Привіт! Я — твій ШІ-порадник з подорожей Україною. Обери тему нижче або напиши своє запитання.
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {advisorMessages.map((m, i) => {
                        const isUser = m.role === 'user';
                        return (
                          <div key={i} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                            <div
                              style={{
                                maxWidth: '82%',
                                background: isUser ? accent : PANEL,
                                color: isUser ? '#071F16' : CREAM,
                                border: isUser ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                padding: '11px 15px',
                                fontSize: '13.5px',
                                lineHeight: 1.6,
                                fontWeight: isUser ? 600 : 400,
                              }}
                            >
                              {isUser ? m.text : <FormattedText text={m.text} />}
                            </div>
                          </div>
                        );
                      })}
                      {advisorLoading && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                          <div style={{
                            background: PANEL,
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '16px 16px 16px 4px',
                            padding: '13px 16px',
                            color: 'rgba(244,241,232,0.6)',
                            fontSize: '13px',
                          }}>
                            <span className="at-typing">Порадник друкує…</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  <>
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
                            {m.text.startsWith('[voice:data:audio/') ? (
                              <VoiceMessagePlayer text={m.text} mine={mine} />
                            ) : (
                              m.text
                            )}
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
                  </>
                )}
              </div>

              {/* Suggestions Quick Chips */}
              {activeId === 'advisor' && (
                <div style={{
                  display: 'flex',
                  overflowX: 'auto',
                  gap: '8px',
                  padding: '8px 14px',
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  background: 'rgba(7,31,22,0.2)',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}>
                  <style>{`
                    div::-webkit-scrollbar { display: none; }
                  `}</style>
                  {QUICK_TOPICS.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => sendAdvisor(t.prompt, t.key)}
                      disabled={advisorLoading || advisorAvailable === false}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '7px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: 'rgba(244,241,232,0.85)',
                        borderRadius: '999px',
                        padding: '8px 14px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: (advisorLoading || advisorAvailable === false) ? 'default' : 'pointer',
                        opacity: (advisorLoading || advisorAvailable === false) ? 0.6 : 1,
                        fontFamily: "'Manrope', sans-serif",
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      <Icon name={t.icon} size={14} stroke={accent} strokeWidth={1.9} />
                      {t.label}
                    </button>
                  ))}
                </div>
              )}

              {error && (
                <div style={{ margin: '0 18px 8px', padding: '8px 12px', borderRadius: '9px', fontSize: '12.5px', background: 'rgba(217,83,79,0.15)', border: '1px solid rgba(217,83,79,0.5)', color: '#E58784' }}>
                  {error}
                </div>
              )}

              {/* input */}
              <div style={{ display: 'flex', gap: '10px', padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.08)', alignItems: 'center', position: 'relative' }}>
                
                {/* Emoji Picker Popover */}
                {showEmojiPicker && (
                  <div style={{
                    position: 'absolute',
                    bottom: '68px',
                    left: '14px',
                    background: '#0B2B20',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    padding: '10px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    zIndex: 10,
                  }}>
                    {['⛰️', '🌲', '🎒', '🏕️', '🧭', '🗺️', '🚗', '✈️', '💬', '👍', '❤️', '😂', '🎉', '🤩', '👋', '🔥', '✨', '🇺🇦'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setInput((prev) => prev + emoji);
                          setShowEmojiPicker(false);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          fontSize: '20px',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* Emoji button */}
                {!isRecording && (
                  <button
                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: showEmojiPicker ? accent : 'rgba(244,241,232,0.6)',
                      cursor: 'pointer',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      transition: 'color 0.2s, background 0.2s',
                    }}
                  >
                    <Icon name="smile" size={22} />
                  </button>
                )}

                {isRecording ? (
                  <>
                    <style>{`
                      @keyframes recPulse {
                        0% { opacity: 0.3; }
                        50% { opacity: 1; }
                        100% { opacity: 0.3; }
                      }
                    `}</style>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      flex: 1,
                      padding: '12px 15px',
                      background: PANEL,
                      border: '1px solid rgba(255,255,255,0.14)',
                      borderRadius: '12px',
                    }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        background: '#d9534f',
                        borderRadius: '50%',
                        animation: 'recPulse 1.5s infinite',
                      }} />
                      <span style={{ color: CREAM, fontSize: '13.5px', fontFamily: "'Manrope', sans-serif" }}>
                        Запис голосу… {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                        {isHolding && (
                          <span style={{ opacity: 0.7, fontSize: '12px', marginLeft: '6px' }}>
                            (відпустіть для надсилання, проведіть вліво для скасування)
                          </span>
                        )}
                      </span>
                    </div>

                    <button
                      onClick={() => stopRecording(false)}
                      style={{
                        background: 'rgba(217,83,79,0.15)',
                        border: '1px solid rgba(217,83,79,0.4)',
                        borderRadius: '12px',
                        padding: '12px 18px',
                        color: '#E58784',
                        cursor: 'pointer',
                        fontSize: '13.5px',
                        fontWeight: 700,
                        fontFamily: "'Manrope', sans-serif",
                      }}
                    >
                      Скасувати
                    </button>
                    <button
                      onClick={() => stopRecording(true)}
                      style={{
                        background: accent,
                        color: '#071F16',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '12px 18px',
                        cursor: 'pointer',
                        fontSize: '13.5px',
                        fontWeight: 800,
                        fontFamily: "'Manrope', sans-serif",
                      }}
                    >
                      Надіслати
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (activeId === 'advisor') {
                            void sendAdvisor(input);
                          } else {
                            void send();
                          }
                        }
                      }}
                      placeholder={activeId === 'advisor' ? 'Запитайте ШІ-порадника…' : activeFriend ? `Повідомлення для ${activeFriend.name}…` : 'Повідомлення…'}
                      disabled={activeId === 'advisor' ? (advisorAvailable === false || advisorLoading) : false}
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

                    {/* Mic button (hide for AI Advisor) */}
                    {activeId !== 'advisor' && (
                      <button
                        onMouseDown={handleMicPressStart}
                        onTouchStart={handleMicPressStart}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'rgba(244,241,232,0.6)',
                          cursor: 'pointer',
                          padding: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          touchAction: 'none',
                        }}
                      >
                        <Icon name="mic" size={22} />
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (activeId === 'advisor') {
                          void sendAdvisor(input);
                        } else {
                          void send();
                        }
                      }}
                      disabled={activeId === 'advisor' ? (advisorLoading || !input.trim() || advisorAvailable === false) : (sending || !input.trim())}
                      style={{
                        background: accent,
                        color: '#071F16',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '12px 22px',
                        fontSize: '14px',
                        fontWeight: 800,
                        cursor: (activeId === 'advisor' ? (advisorLoading || !input.trim() || advisorAvailable === false) : (sending || !input.trim())) ? 'default' : 'pointer',
                        opacity: (activeId === 'advisor' ? (advisorLoading || !input.trim() || advisorAvailable === false) : (sending || !input.trim())) ? 0.55 : 1,
                        fontFamily: "'Manrope', sans-serif",
                      }}
                    >
                      {activeId === 'advisor' ? (advisorLoading ? '…' : 'Надіслати') : (sending ? '…' : 'Надіслати')}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

export default ChatPage;
