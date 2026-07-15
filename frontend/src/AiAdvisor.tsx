import { useEffect, useRef, useState } from 'react';
import { askAdvisor, getAdvisorStatus, type AdvisorTurn, type AuthUser } from './api';
import { Icon, type IconName } from './icons';

const CREAM = '#F4F1E8';
const BG = '#071F16';

interface AiAdvisorProps {
  accent?: string;
  user?: AuthUser;
  userName?: string;
}

interface QuickTopic {
  key: string;
  label: string;
  icon: IconName;
  prompt: string;
}

// Quick-start chips. `key` matches the backend TOPIC_HINTS map; `prompt` is the
// message shown in the chat and sent to the advisor.
const QUICK_TOPICS: QuickTopic[] = [
  { key: 'packing', label: 'Що взяти з собою', icon: 'backpack', prompt: 'Допоможи скласти список речей у подорож.' },
  { key: 'where', label: 'Куди поїхати', icon: 'compass', prompt: 'Порадь цікаві напрямки для подорожі Україною.' },
  { key: 'route', label: 'Скласти маршрут', icon: 'map', prompt: 'Допоможи спланувати маршрут на кілька днів.' },
  { key: 'food', label: 'Що скуштувати', icon: 'flame', prompt: 'Які локальні страви варто скуштувати і де?' },
  { key: 'budget', label: 'Бюджет поїздки', icon: 'coin', prompt: 'Як розрахувати бюджет на подорож і заощадити?' },
  { key: 'season', label: 'Коли їхати', icon: 'sun', prompt: 'Підкажи найкращий час для поїздки.' },
  { key: 'safety', label: 'Безпека', icon: 'shield', prompt: 'Дай поради щодо безпечної подорожі.' },
];

// Render advisor text with light formatting: bullet lines and paragraph breaks.
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

function AiAdvisor({ accent = '#3FA66B', userName }: AiAdvisorProps) {
  const [messages, setMessages] = useState<AdvisorTurn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAdvisorStatus()
      .then((s) => setAvailable(s.available))
      .catch(() => setAvailable(null));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string, topic?: string) => {
    const message = text.trim();
    if (!message || loading) return;

    const history = messages.slice(-12);
    const nextMessages: AdvisorTurn[] = [...messages, { role: 'user', text: message }];
    setMessages(nextMessages);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const { reply } = await askAdvisor({ message, topic, history });
      setMessages((cur) => [...cur, { role: 'model', text: reply }]);
    } catch (e: any) {
      setError(e?.message ?? 'Не вдалося отримати відповідь');
    } finally {
      setLoading(false);
    }
  };

  const empty = messages.length === 0;

  return (
    <div>
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.22em', color: accent, marginBottom: '10px' }}>
          ШІ-ПОРАДНИК
        </div>
        <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: 'clamp(24px, 3vw, 34px)', margin: '0 0 8px' }}>
          Твій радник із подорожей
        </h2>
        <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'rgba(244,241,232,0.62)', margin: 0, maxWidth: '560px' }}>
          Запитай що завгодно про подорожі Україною: куди поїхати, що взяти з собою, як скласти маршрут чи бюджет.
        </p>
      </div>

      {available === false && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            background: 'rgba(240,198,75,0.10)',
            border: '1px solid rgba(240,198,75,0.35)',
            borderRadius: '12px',
            padding: '12px 14px',
            fontSize: '13px',
            color: '#F0C64B',
            marginBottom: '16px',
          }}
        >
          <Icon name="lock" size={16} strokeWidth={1.9} />
          <span>
            Порадник не налаштований. Додайте <b>GEMINI_API_KEY</b> у файл <code>.env</code> і перезапустіть сервер.
          </span>
        </div>
      )}

      {/* quick topic chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
        {QUICK_TOPICS.map((t) => (
          <button
            key={t.key}
            onClick={() => send(t.prompt, t.key)}
            disabled={loading}
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
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            <Icon name={t.icon} size={14} stroke={accent} strokeWidth={1.9} />
            {t.label}
          </button>
        ))}
      </div>

      {/* chat window */}
      <div
        style={{
          background: '#081E15',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '18px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '460px',
        }}
      >
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {empty && !loading ? (
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                color: 'rgba(244,241,232,0.5)',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: `${accent}1F`,
                  border: `1px solid ${accent}55`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="compass" size={26} stroke={accent} strokeWidth={1.7} />
              </div>
              <div style={{ fontSize: '14px', maxWidth: '320px', lineHeight: 1.6 }}>
                {userName ? `Привіт, ${userName}! ` : ''}Обери тему вгорі або напиши своє запитання — і я допоможу спланувати подорож.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '82%',
                      background: m.role === 'user' ? accent : 'rgba(255,255,255,0.05)',
                      color: m.role === 'user' ? BG : CREAM,
                      border: m.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      padding: '11px 15px',
                      fontSize: '13.5px',
                      lineHeight: 1.6,
                      fontWeight: m.role === 'user' ? 600 : 400,
                    }}
                  >
                    {m.role === 'model' ? <FormattedText text={m.text} /> : m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '14px 14px 14px 4px',
                      padding: '13px 16px',
                      color: 'rgba(244,241,232,0.6)',
                      fontSize: '13px',
                    }}
                  >
                    <span className="at-typing">Порадник друкує…</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div style={{ padding: '0 20px', color: '#E88', fontSize: '12.5px', marginBottom: '8px' }}>{error}</div>
        )}

        {/* input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          style={{
            display: 'flex',
            gap: '10px',
            padding: '14px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(7,31,22,0.5)',
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Напиши запитання…"
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '12px',
              padding: '12px 15px',
              color: CREAM,
              fontSize: '14px',
              fontFamily: "'Manrope', sans-serif",
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Надіслати"
            style={{
              flex: '0 0 auto',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: accent,
              color: BG,
              border: 'none',
              borderRadius: '12px',
              padding: '0 18px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: loading || !input.trim() ? 'default' : 'pointer',
              opacity: loading || !input.trim() ? 0.5 : 1,
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            <Icon name="arrowRight" size={18} strokeWidth={2.2} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default AiAdvisor;
