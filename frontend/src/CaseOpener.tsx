import { useMemo, useRef, useState } from 'react';
import { Icon } from './icons';
import { itemVisual, equipValue } from './itemVisuals';
import type { EquipKey } from './ProfileShop';
import type { OpenCaseResult } from './api';
import {
  CASES,
  RARITY_META,
  RARITY_ORDER,
  caseById,
  caseOdds,
  type CaseDef,
  type CaseReward,
  type Rarity,
} from './data/cases';

const CREAM = '#F4F1E8';
const BG = '#071F16';
const GOLD = '#F0C64B';

// Reel geometry (px).
const TILE = 120;
const GAP = 12;
const STRIP = TILE + GAP;
const REEL_LEN = 64;
const WIN_INDEX = 58;
const SPIN_MS = 5600;

interface CaseOpenerProps {
  coins: number;
  owned: string[];
  openedCaseIds: string[];
  onOpen: (caseId: string) => Promise<OpenCaseResult>;
  onEquip: (slot: EquipKey, value: string) => void;
  onBack: () => void;
}

type Phase = 'idle' | 'spinning' | 'revealed';

function pickWeighted(rewards: CaseReward[]): CaseReward {
  const total = rewards.reduce((s, r) => s + RARITY_META[r.rarity].weight, 0);
  let roll = Math.random() * total;
  for (const r of rewards) {
    roll -= RARITY_META[r.rarity].weight;
    if (roll <= 0) return r;
  }
  return rewards[rewards.length - 1];
}

function CaseOpener({ coins, owned, openedCaseIds, onOpen, onEquip, onBack }: CaseOpenerProps) {
  const [caseId, setCaseId] = useState<string>(CASES[0].id);
  const def = caseById(caseId)!;

  const [phase, setPhase] = useState<Phase>('idle');
  const [reel, setReel] = useState<CaseReward[]>([]);
  const [offset, setOffset] = useState(0);
  const [result, setResult] = useState<OpenCaseResult | null>(null);
  const [equipped, setEquipped] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const freeOpened = openedCaseIds.includes('starter');
  const isFree = def.cost === 0;
  const locked = isFree && freeOpened;
  const affordable = isFree ? !freeOpened : coins >= def.cost;

  const odds = useMemo(() => caseOdds(def), [def]);

  const switchCase = (id: string) => {
    if (phase === 'spinning') return;
    setCaseId(id);
    setPhase('idle');
    setResult(null);
    setEquipped(false);
    setError(null);
  };

  const startOpen = async () => {
    if (phase === 'spinning' || !affordable) return;
    setError(null);
    setEquipped(false);
    setResult(null);
    setPhase('spinning');

    let res: OpenCaseResult;
    try {
      res = await onOpen(def.id);
    } catch (e: any) {
      setError(e?.message ?? 'Не вдалося відкрити кейс');
      setPhase('idle');
      return;
    }

    // Build a filler strip and drop the real reward at the winning slot.
    const wonReward: CaseReward =
      def.rewards.find((r) => r.id === res.itemId && r.rarity === res.rarity) ??
      def.rewards.find((r) => r.id === res.itemId) ??
      { slot: 'background', id: res.itemId, rarity: res.rarity };
    const strip: CaseReward[] = Array.from({ length: REEL_LEN }, () => pickWeighted(def.rewards));
    strip[WIN_INDEX] = wonReward;
    setReel(strip);

    // Reset to 0, then animate to the winning offset on the next frame.
    setOffset(0);
    const stageW = stageRef.current?.clientWidth ?? 640;
    const jitter = (Math.random() - 0.5) * (TILE * 0.6);
    const target = WIN_INDEX * STRIP + TILE / 2 - stageW / 2 + jitter;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setOffset(target));
    });

    window.setTimeout(() => {
      setResult(res);
      setPhase('revealed');
    }, SPIN_MS + 120);
  };

  const wonVisual = result ? itemVisual((reelRewardSlot(def, result)) as EquipKey, result.itemId, 64) : null;
  const wonRarity = result ? RARITY_META[result.rarity] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, fontFamily: "'Manrope', sans-serif", color: CREAM }}>
      {/* ---- header ---- */}
      <div style={{ position: 'relative', padding: '20px 26px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flex: '0 0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
          <button
            onClick={onBack}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(244,241,232,0.85)', borderRadius: '10px', padding: '8px 13px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}
          >
            <Icon name="arrowLeft" size={15} strokeWidth={2} /> Магазин
          </button>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.22em', color: GOLD }}>КЕЙСИ</div>
            <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: 'clamp(18px,2.4vw,24px)', margin: '2px 0 0' }}>Скриня мандрівника</h2>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '14px', fontWeight: 800, color: GOLD, background: 'rgba(240,198,75,0.12)', border: '1px solid rgba(240,198,75,0.35)', padding: '8px 14px', borderRadius: '999px' }}>
            <Icon name="coin" size={17} strokeWidth={1.9} /> {coins}
          </span>
        </div>

        {/* case switcher */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
          {CASES.map((c) => {
            const on = c.id === caseId;
            const used = c.cost === 0 && openedCaseIds.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => switchCase(c.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '9px',
                  padding: '9px 14px', borderRadius: '12px', cursor: 'pointer',
                  border: `1.5px solid ${on ? c.accent : 'rgba(255,255,255,0.1)'}`,
                  background: on ? `${c.accent}22` : 'rgba(255,255,255,0.02)',
                  color: on ? CREAM : 'rgba(244,241,232,0.7)',
                  fontFamily: "'Manrope', sans-serif", fontSize: '13px', fontWeight: 700,
                  transition: 'all 0.16s ease',
                }}
              >
                <Icon name="gift" size={16} strokeWidth={1.8} stroke={on ? c.accent : 'rgba(244,241,232,0.7)'} />
                {c.name}
                <span style={{ fontSize: '11px', fontWeight: 800, color: c.cost === 0 ? '#7BD6A2' : GOLD }}>
                  {used ? '✓' : c.cost === 0 ? 'FREE' : `${c.cost}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- body ---- */}
      <div style={{ padding: '22px 26px 28px', overflowY: 'auto', minHeight: 0, flex: '1 1 auto', position: 'relative' }}>
        {/* ambient case aura */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(60% 55% at 50% 24%, ${def.accent}22, transparent 70%)`, transition: 'background 0.4s ease' }} />

        {/* ---- stage ---- */}
        <div
          ref={stageRef}
          style={{
            position: 'relative', height: '178px', borderRadius: '18px', overflow: 'hidden',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.34), rgba(0,0,0,0.14))',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: 'inset 0 0 60px -20px rgba(0,0,0,0.8)',
          }}
        >
          {/* center marker */}
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '2px', transform: 'translateX(-1px)', background: `linear-gradient(180deg, transparent, ${GOLD}, transparent)`, boxShadow: `0 0 14px ${GOLD}`, zIndex: 4 }} />
          <div style={{ position: 'absolute', left: '50%', top: '4px', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: `9px solid ${GOLD}`, zIndex: 4 }} />
          <div style={{ position: 'absolute', left: '50%', bottom: '4px', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderBottom: `9px solid ${GOLD}`, zIndex: 4 }} />

          {/* edge fades */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', background: 'linear-gradient(90deg, rgba(8,20,15,0.95), transparent 16%, transparent 84%, rgba(8,20,15,0.95))' }} />

          {phase === 'idle' && <IdleCase def={def} locked={locked} />}

          {phase === 'spinning' && (
            <div
              style={{
                position: 'absolute', top: '50%', left: 0, display: 'flex', gap: `${GAP}px`,
                transform: `translate3d(${-offset}px, -50%, 0)`,
                transition: offset === 0 ? 'none' : `transform ${SPIN_MS}ms cubic-bezier(0.08,0.72,0.12,1)`,
                willChange: 'transform',
              }}
            >
              {reel.map((r, i) => (
                <ReelTile key={i} reward={r} />
              ))}
            </div>
          )}

          {phase === 'revealed' && result && wonVisual && wonRarity && (
            <Reveal
              visual={wonVisual}
              rarity={result.rarity}
              duplicate={result.duplicate}
              compensation={result.compensation}
              equipped={equipped}
              onEquip={() => {
                const slot = reelRewardSlot(def, result) as EquipKey;
                onEquip(slot, equipValue(slot, result.itemId));
                setEquipped(true);
              }}
            />
          )}
        </div>

        {error && (
          <div style={{ marginTop: '14px', fontSize: '12.5px', fontWeight: 600, color: '#E88A8A', background: 'rgba(232,138,138,0.1)', border: '1px solid rgba(232,138,138,0.28)', borderRadius: '10px', padding: '9px 12px' }}>
            {error}
          </div>
        )}

        {/* ---- open button ---- */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
          {phase === 'revealed' ? (
            <button
              onClick={() => { setPhase('idle'); setResult(null); }}
              style={openBtnStyle(def.accent, true)}
            >
              <Icon name="gift" size={18} strokeWidth={1.9} stroke={BG} />
              {isFree ? 'Готово' : 'Відкрити ще'}
            </button>
          ) : (
            <button
              onClick={startOpen}
              disabled={!affordable || phase === 'spinning'}
              style={openBtnStyle(def.accent, affordable && phase !== 'spinning')}
            >
              {phase === 'spinning' ? (
                'Відкриваємо…'
              ) : locked ? (
                <>Вже відкрито</>
              ) : isFree ? (
                <><Icon name="gift" size={18} strokeWidth={1.9} stroke={BG} /> Відкрити безкоштовно</>
              ) : affordable ? (
                <><Icon name="coin" size={17} strokeWidth={1.9} stroke={BG} /> Відкрити за {def.cost}</>
              ) : (
                <>Не вистачає монет</>
              )}
            </button>
          )}
        </div>

        {/* ---- odds ---- */}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '14px', marginTop: '16px' }}>
          {odds.map(({ rarity, pct }) => (
            <span key={rarity} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 700, color: 'rgba(244,241,232,0.7)' }}>
              <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: RARITY_META[rarity].color, boxShadow: `0 0 8px ${RARITY_META[rarity].glow}` }} />
              {RARITY_META[rarity].label} · {pct}%
            </span>
          ))}
        </div>

        {/* ---- contents ---- */}
        <div style={{ marginTop: '24px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(244,241,232,0.5)', marginBottom: '12px' }}>
            МОЖЛИВІ ПРИЗИ
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: '12px' }}>
            {[...def.rewards]
              .sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity))
              .map((r, i) => (
                <DropCard key={`${r.slot}-${r.id}-${i}`} reward={r} owned={owned.includes(r.id)} />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Find the equip slot for the won item by looking it up in the case's reward list.
function reelRewardSlot(def: CaseDef, result: OpenCaseResult): EquipKey {
  return (def.rewards.find((r) => r.id === result.itemId)?.slot ?? 'background') as EquipKey;
}

function openBtnStyle(accent: string, enabled: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
    minWidth: '240px', padding: '15px 30px', borderRadius: '14px',
    border: 'none', cursor: enabled ? 'pointer' : 'not-allowed',
    background: enabled ? `linear-gradient(135deg, ${accent}, ${accent}CC)` : 'rgba(255,255,255,0.06)',
    color: enabled ? BG : 'rgba(244,241,232,0.4)',
    fontFamily: "'Manrope', sans-serif", fontSize: '15px', fontWeight: 800,
    boxShadow: enabled ? `0 12px 30px -10px ${accent}` : 'none',
    transition: 'transform 0.12s ease, box-shadow 0.16s ease',
  };
}

// ---- idle closed-case artwork -------------------------------------------------

function IdleCase({ def, locked }: { def: CaseDef; locked: boolean }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '190px', height: '110px' }}>
        {/* glow */}
        <div style={{ position: 'absolute', inset: '-30px', borderRadius: '50%', background: `radial-gradient(circle, ${def.accent}44, transparent 70%)`, animation: 'softGlowOpacity 3s ease-in-out infinite' }} />
        {/* box */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: '14px', border: `2px solid ${def.accent}`, boxShadow: `0 16px 40px -12px ${def.accent}`, overflow: 'hidden', filter: locked ? 'grayscale(0.6) brightness(0.7)' : 'none' }}>
          {def.imageUrl ? (
            <img src={def.imageUrl} alt={def.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: def.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', top: '34%', left: 0, right: 0, height: '2px', background: 'rgba(0,0,0,0.35)' }} />
              <Icon name="gift" size={46} strokeWidth={1.5} stroke="rgba(255,255,255,0.9)" />
            </div>
          )}
          {/* overlay lock/checkmark icons if locked */}
          {locked && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={24} strokeWidth={2.5} stroke="#FFF" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- reel tile ----------------------------------------------------------------

function ReelTile({ reward }: { reward: CaseReward }) {
  const meta = RARITY_META[reward.rarity];
  const v = itemVisual(reward.slot, reward.id, 34);
  return (
    <div style={{ width: `${TILE}px`, flex: `0 0 ${TILE}px`, height: '128px', borderRadius: '12px', overflow: 'hidden', border: `1.5px solid ${meta.color}`, background: '#0A2116', boxShadow: `inset 0 -30px 30px -20px ${meta.color}, 0 0 0 1px rgba(0,0,0,0.3)` }}>
      <div style={{ position: 'relative', height: '84px', overflow: 'hidden' }}>
        {v.node}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent 40%, ${meta.color}44)` }} />
      </div>
      <div style={{ height: '3px', background: meta.color, boxShadow: `0 0 10px ${meta.glow}` }} />
      <div style={{ padding: '6px 8px', fontSize: '10.5px', fontWeight: 700, color: 'rgba(244,241,232,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>
        {v.label}
      </div>
    </div>
  );
}

// ---- reveal -------------------------------------------------------------------

function Reveal({
  visual, rarity, duplicate, compensation, equipped, onEquip,
}: {
  visual: ReturnType<typeof itemVisual>;
  rarity: Rarity;
  duplicate: boolean;
  compensation: number;
  equipped: boolean;
  onEquip: () => void;
}) {
  const meta = RARITY_META[rarity];
  return (
    <div className="at-case-reveal" style={{ position: 'absolute', inset: 0, zIndex: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '0 20px', background: `radial-gradient(60% 90% at 50% 50%, ${meta.glow}, rgba(6,16,11,0.9) 72%)` }}>
      {/* rays */}
      <div className="at-case-rays" style={{ position: 'absolute', width: '260px', height: '260px', background: `conic-gradient(from 0deg, transparent, ${meta.color}33, transparent 25%, ${meta.color}33, transparent 50%, ${meta.color}33, transparent 75%, ${meta.color}33, transparent)`, borderRadius: '50%', filter: 'blur(2px)' }} />

      <div style={{ position: 'relative', width: '116px', height: '116px', borderRadius: '16px', overflow: 'hidden', border: `2.5px solid ${duplicate ? GOLD : meta.color}`, boxShadow: `0 0 40px ${duplicate ? 'rgba(240,198,75,0.55)' : meta.glow}, inset 0 0 24px -8px rgba(0,0,0,0.6)`, flex: '0 0 auto' }}>
        {visual.node}
        {duplicate && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: GOLD, color: BG, fontSize: '10px', fontWeight: 800, letterSpacing: '0.1em', textAlign: 'center', padding: '3px 0' }}>
            ПОВТОРКА
          </div>
        )}
      </div>

      <div style={{ position: 'relative', maxWidth: '260px' }}>
        <div style={{ display: 'inline-block', fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.14em', color: BG, background: meta.color, padding: '4px 11px', borderRadius: '999px', boxShadow: `0 0 16px ${meta.glow}` }}>
          {meta.label.toUpperCase()}
        </div>
        <div style={{ fontFamily: "'Lora', serif", fontSize: '24px', fontWeight: 500, margin: '10px 0 2px' }}>{visual.label}</div>
        <div style={{ fontSize: '12px', color: 'rgba(244,241,232,0.6)', marginBottom: '12px' }}>{visual.slotLabel}</div>

        {duplicate && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12.5px', fontWeight: 800, color: GOLD, background: 'rgba(240,198,75,0.14)', border: '1px solid rgba(240,198,75,0.4)', borderRadius: '999px', padding: '6px 12px', marginBottom: '12px' }}>
            <Icon name="coin" size={15} strokeWidth={1.9} /> Повторка · повернуто +{compensation} монет
          </div>
        )}

        <div>
          {equipped ? (
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#7BD6A2', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Icon name="check" size={15} strokeWidth={2.4} stroke="#7BD6A2" /> Застосовано
            </div>
          ) : (
            <button
              onClick={onEquip}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: meta.color, color: BG, border: 'none', borderRadius: '11px', padding: '11px 20px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', fontFamily: "'Manrope', sans-serif", boxShadow: `0 8px 22px -8px ${meta.glow}` }}
            >
              <Icon name="check" size={15} strokeWidth={2.4} stroke={BG} /> {duplicate ? 'Обрати' : 'Застосувати'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- drop list card -----------------------------------------------------------

function DropCard({ reward, owned }: { reward: CaseReward; owned: boolean }) {
  const meta = RARITY_META[reward.rarity];
  const v = itemVisual(reward.slot, reward.id, 30);
  return (
    <div style={{ borderRadius: '12px', overflow: 'hidden', border: `1px solid ${meta.color}66`, background: 'rgba(255,255,255,0.02)', boxShadow: `inset 0 -20px 24px -18px ${meta.color}` }}>
      <div style={{ position: 'relative', height: '68px', overflow: 'hidden' }}>
        {v.node}
        {owned && (
          <div title="Вже у тебе" style={{ position: 'absolute', top: '6px', right: '6px', width: '20px', height: '20px', borderRadius: '50%', background: '#3FA66B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={12} strokeWidth={3} stroke={BG} />
          </div>
        )}
      </div>
      <div style={{ height: '3px', background: meta.color }} />
      <div style={{ padding: '7px 9px' }}>
        <div style={{ fontSize: '11.5px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.label}</div>
        <div style={{ fontSize: '10px', fontWeight: 700, color: meta.color, marginTop: '2px' }}>{meta.label}</div>
      </div>
    </div>
  );
}

export default CaseOpener;
