import { levelProgress, MAX_LEVEL } from './data/leveling';

interface XpBarProps {
  xp: number;
  accent: string;
  /** Tighter type/spacing for cramped layouts (e.g. popovers). */
  compact?: boolean;
}

// Full-width XP progress bar toward the next level, capped at MAX_LEVEL.
function XpBar({ xp, accent, compact = false }: XpBarProps) {
  const { level, xpIntoLevel, xpForNextLevel, progress, maxed } = levelProgress(xp);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: compact ? '5px' : '7px', gap: '8px' }}>
        <span style={{ fontSize: compact ? '10.5px' : '11.5px', fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(244,241,232,0.8)' }}>
          РІВЕНЬ {level} <span style={{ opacity: 0.5, fontWeight: 600 }}>/ {MAX_LEVEL}</span>
        </span>
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
    </div>
  );
}

export default XpBar;
