import { useState } from 'react';
import { levelProgress, MAX_LEVEL } from './data/leveling';

interface XpBarProps {
  xp: number;
  accent: string;
  /** Tighter type/spacing for cramped layouts (e.g. popovers). */
  compact?: boolean;
}

// Ways to earn XP, shown in the level info popover.
const XP_SOURCES: { label: string; xp: string }[] = [
  { label: 'Відвідати нову клітинку карти', xp: '+10 XP' },
  { label: 'Відкрити новий регіон', xp: '+100 XP' },
  { label: 'Підтвердити відвідування місця — Легко', xp: '+20 XP' },
  { label: 'Підтвердити відвідування місця — Середньо', xp: '+50 XP' },
  { label: 'Підтвердити відвідування місця — Складно', xp: '+100 XP' },
  { label: 'Підтвердити відвідування місця — Екстремально', xp: '+250 XP' },
];

// Full-width XP progress bar toward the next level, capped at MAX_LEVEL.
// Clicking the level label reveals a summary of how XP is earned.
function XpBar({ xp, accent, compact = false }: XpBarProps) {
  const { level, xpIntoLevel, xpForNextLevel, progress, maxed } = levelProgress(xp);
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: compact ? '5px' : '7px', gap: '8px' }}>
        <button
          type="button"
          onClick={() => setShowInfo((v) => !v)}
          title="Як отримати рівень"
          style={{
            fontSize: compact ? '10.5px' : '11.5px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'rgba(244,241,232,0.8)',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: '5px',
          }}
        >
          РІВЕНЬ {level} <span style={{ opacity: 0.5, fontWeight: 600 }}>/ {MAX_LEVEL}</span>
          <span style={{ opacity: 0.5, fontSize: '9px' }}>ⓘ</span>
        </button>
        <span style={{ fontSize: compact ? '10px' : '11px', fontWeight: 600, color: 'rgba(244,241,232,0.55)', whiteSpace: 'nowrap' }}>
          {maxed ? 'Максимальний рівень' : `${xpIntoLevel} / ${xpForNextLevel} XP`}
        </span>
      </div>
      <div
        style={{
          height: compact ? '6px' : '8px',
          borderRadius: '999px',
          background: 'rgba(255,255,255,0.09)',
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.35)',
        }}
      >
        <div
          style={{
            width: `${Math.round(progress * 100)}%`,
            height: '100%',
            borderRadius: '999px',
            background: maxed ? `linear-gradient(90deg, ${accent}, #F0C64B)` : accent,
            boxShadow: `0 0 10px ${accent}80`,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
      {showInfo && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '10px',
            zIndex: 20,
            background: '#12261C',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: '12px',
            padding: '14px 16px',
            boxShadow: '0 20px 40px -12px rgba(0,0,0,0.6)',
            width: 'min(320px, 90vw)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(244,241,232,0.85)' }}>
              ЯК ОТРИМАТИ РІВЕНЬ
            </span>
            <button
              type="button"
              onClick={() => setShowInfo(false)}
              aria-label="Закрити"
              style={{ background: 'none', border: 'none', color: 'rgba(244,241,232,0.5)', cursor: 'pointer', fontSize: '13px', padding: 0 }}
            >
              ✕
            </button>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {XP_SOURCES.map((s) => (
              <li key={s.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '12px', color: 'rgba(244,241,232,0.7)' }}>
                <span>{s.label}</span>
                <span style={{ fontWeight: 700, color: accent, whiteSpace: 'nowrap' }}>{s.xp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default XpBar;
