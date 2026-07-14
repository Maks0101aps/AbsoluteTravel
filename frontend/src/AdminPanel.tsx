import React, { useEffect, useState, useCallback } from 'react';
import {
  adminListPlaces,
  adminPlaceCounts,
  adminApprovePlace,
  adminRejectPlace,
  adminDeletePlace,
  adminListAccounts,
  adminCreateAccount,
  adminDeleteAccount,
  type AdminPlace,
  type AdminAccount,
  type AdminSession,
} from './api';
import { CATEGORY_META, type PlaceCategory } from './data/places';
import AddPlaceForm from './AddPlaceForm';
import { Icon } from './icons';

const CREAM = '#F4F1E8';
const BG = '#071F16';
const PANEL = '#0B2B20';
const DEFAULT_ACCENT = '#3FA66B';

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';
type Section = 'moderation' | 'admins';

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: 'Очікує', color: '#D9B44A' },
  approved: { label: 'Схвалено', color: '#3FA66B' },
  rejected: { label: 'Відхилено', color: '#E05A5A' },
};

const DECISION_LABEL: Record<string, string> = {
  approve: 'ШІ: схвалити',
  reject: 'ШІ: відхилити',
  review: 'ШІ: на перевірку',
};

interface AdminMenuProps {
  session: AdminSession;
  onLogout: () => void;
  accent?: string;
}

// Full-page admin menu. Login happens through the shared participant login
// form; this is only ever rendered once an admin session exists.
function AdminMenu({ session, onLogout, accent = DEFAULT_ACCENT }: AdminMenuProps) {
  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", background: BG, color: CREAM, minHeight: '100vh' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '14px 40px', background: 'rgba(7,31,22,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <img src="/assets/logo.svg" alt="Absolute Travel" style={{ height: '40px', width: 'auto', display: 'block' }} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', color: accent, background: `${accent}18`, border: `1px solid ${accent}44`, borderRadius: '999px', padding: '6px 13px' }}>
          <Icon name="lock" size={14} strokeWidth={2} />
          ПАНЕЛЬ АДМІНІСТРАТОРА
        </span>
      </nav>
      <main style={{ maxWidth: '1140px', margin: '0 auto', padding: '40px 24px 80px' }}>
        <AdminDashboard accent={accent} session={session} onLogout={onLogout} />
      </main>
    </div>
  );
}

function AdminDashboard({ accent, session, onLogout }: { accent: string; session: AdminSession; onLogout: () => void }) {
  const [section, setSection] = useState<Section>('moderation');

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", color: CREAM }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.22em', color: accent, marginBottom: '10px' }}>АДМІН-ПАНЕЛЬ</div>
          <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: 'clamp(24px, 3vw, 32px)', margin: 0 }}>
            {section === 'moderation' ? 'Модерація місць' : 'Адміністратори'}
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right', lineHeight: 1.3 }}>
            <div style={{ fontSize: '13px', fontWeight: 700 }}>{session.admin.name}</div>
            <div style={{ fontSize: '11px', color: session.admin.isSuper ? accent : 'rgba(244,241,232,0.5)' }}>
              {session.admin.isSuper ? 'Головний адміністратор' : `@${session.admin.login}`}
            </div>
          </div>
          <button onClick={onLogout} style={{ background: 'transparent', color: 'rgba(244,241,232,0.7)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: '11px', padding: '10px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}>
            Вийти
          </button>
        </div>
      </div>

      {/* section switch */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '22px', flexWrap: 'wrap' }}>
        <SectionTab active={section === 'moderation'} onClick={() => setSection('moderation')} accent={accent} icon="map" label="Модерація місць" />
        <SectionTab active={section === 'admins'} onClick={() => setSection('admins')} accent={accent} icon="user" label="Адміністратори" />
      </div>

      {section === 'moderation' ? (
        <ModerationSection accent={accent} token={session.token} />
      ) : (
        <AdminsSection accent={accent} session={session} />
      )}
    </div>
  );
}

function SectionTab({ active, onClick, accent, icon, label }: { active: boolean; onClick: () => void; accent: string; icon: 'map' | 'user'; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        background: active ? `${accent}1F` : 'transparent',
        border: `1px solid ${active ? `${accent}66` : 'rgba(255,255,255,0.12)'}`,
        color: active ? accent : 'rgba(244,241,232,0.7)',
        borderRadius: '11px',
        padding: '10px 18px',
        fontSize: '13.5px',
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: "'Manrope', sans-serif",
      }}
    >
      <Icon name={icon} size={16} strokeWidth={1.9} />
      {label}
    </button>
  );
}

// --- Moderation ------------------------------------------------------------

function ModerationSection({ accent, token }: { accent: string; token: string }) {
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [places, setPlaces] = useState<AdminPlace[]>([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [list, c] = await Promise.all([adminListPlaces(token, filter), adminPlaceCounts(token)]);
      setPlaces(list);
      setCounts(c);
    } catch (e: any) {
      setError(e?.message ?? 'Не вдалося завантажити список');
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const act = async (id: number, fn: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await fn();
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Дію не виконано');
    } finally {
      setBusyId(null);
    }
  };

  const FILTERS: { id: StatusFilter; label: string; count?: number }[] = [
    { id: 'pending', label: 'Очікують', count: counts.pending },
    { id: 'approved', label: 'Схвалені', count: counts.approved },
    { id: 'rejected', label: 'Відхилені', count: counts.rejected },
    { id: 'all', label: 'Усі' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  background: active ? `${accent}1F` : 'transparent',
                  border: `1px solid ${active ? `${accent}66` : 'rgba(255,255,255,0.12)'}`,
                  color: active ? accent : 'rgba(244,241,232,0.7)',
                  borderRadius: '999px',
                  padding: '8px 15px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'Manrope', sans-serif",
                }}
              >
                {f.label}
                {f.count != null && (
                  <span style={{ fontSize: '11px', fontWeight: 700, background: active ? accent : 'rgba(255,255,255,0.12)', color: active ? '#071F16' : 'rgba(244,241,232,0.7)', borderRadius: '999px', padding: '1px 7px' }}>
                    {f.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button onClick={() => setShowAdd(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: accent, color: '#071F16', border: 'none', borderRadius: '11px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}>
          <Icon name="plus" size={16} strokeWidth={2} /> Додати місце
        </button>
      </div>

      {error && <div style={errorBox}>{error}</div>}

      {loading ? (
        <div style={{ color: 'rgba(244,241,232,0.55)', padding: '40px 0', textAlign: 'center' }}>Завантаження…</div>
      ) : places.length === 0 ? (
        <div style={{ color: 'rgba(244,241,232,0.5)', padding: '40px 0', textAlign: 'center', fontSize: '14px' }}>Немає місць у цій категорії.</div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {places.map((place) => (
            <PlaceCard key={place.id} place={place} accent={accent} busy={busyId === place.id}
              onApprove={() => act(place.id, () => adminApprovePlace(token, place.id))}
              onReject={() => act(place.id, () => adminRejectPlace(token, place.id))}
              onDelete={() => act(place.id, () => adminDeletePlace(token, place.id))}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddPlaceForm
          accent={accent}
          adminToken={token}
          submitterName="Адміністратор"
          onClose={() => setShowAdd(false)}
          onApproved={() => { setShowAdd(false); refresh(); }}
        />
      )}
    </div>
  );
}

function PlaceCard({ place, accent, busy, onApprove, onReject, onDelete }: {
  place: AdminPlace;
  accent: string;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  const meta = CATEGORY_META[place.category as PlaceCategory] ?? { label: place.category, color: accent };
  const status = STATUS_META[place.status] ?? { label: place.status, color: accent };

  return (
    <div style={{ background: PANEL, border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '18px', display: 'flex', flexWrap: 'wrap', gap: '18px' }}>
      <div style={{ display: 'flex', gap: '8px', flex: '0 0 auto' }}>
        {(place.photos ?? []).slice(0, 2).map((src, i) => (
          <img key={i} src={src} alt={`${place.name} ${i + 1}`} style={{ width: '108px', height: '108px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)' }} />
        ))}
        {(!place.photos || place.photos.length === 0) && (
          <div style={{ width: '108px', height: '108px', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(244,241,232,0.35)' }}>
            <Icon name="image" size={22} />
          </div>
        )}
      </div>

      <div style={{ flex: '1 1 320px', minWidth: '260px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontFamily: "'Lora', serif", fontSize: '19px', fontWeight: 500 }}>{place.name}</span>
          <Pill color={status.color} label={status.label} filled />
          <Pill color={meta.color} label={meta.label} />
        </div>
        <div style={{ fontSize: '12.5px', color: 'rgba(244,241,232,0.5)', marginBottom: '10px' }}>
          {place.region} · {place.lat.toFixed(3)}, {place.lng.toFixed(3)}
          {place.submittedBy ? ` · від ${place.submittedBy}` : ''}
        </div>
        <p style={{ fontSize: '13px', lineHeight: 1.55, color: 'rgba(244,241,232,0.78)', margin: '0 0 12px' }}>{place.description}</p>

        {place.aiDecision && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px 12px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Icon name="sparkle" size={14} stroke={accent} strokeWidth={1.9} />
              <span style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.05em', color: 'rgba(244,241,232,0.75)' }}>
                {DECISION_LABEL[place.aiDecision] ?? place.aiDecision}
              </span>
              {place.aiScore != null && <span style={{ fontSize: '11px', color: 'rgba(244,241,232,0.45)' }}>({Math.round(place.aiScore * 100)}%)</span>}
            </div>
            {place.aiReason && <div style={{ fontSize: '12.5px', lineHeight: 1.5, color: 'rgba(244,241,232,0.65)' }}>{place.aiReason}</div>}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {place.status !== 'approved' && <ActionBtn onClick={onApprove} disabled={busy} color="#3FA66B" icon="check" label="Схвалити" />}
          {place.status !== 'rejected' && <ActionBtn onClick={onReject} disabled={busy} color="#E05A5A" icon="close" label="Відхилити" />}
          <ActionBtn onClick={onDelete} disabled={busy} color="rgba(244,241,232,0.6)" icon="close" label="Видалити" ghost />
        </div>
      </div>
    </div>
  );
}

// --- Admins management -----------------------------------------------------

function AdminsSection({ accent, session }: { accent: string; session: AdminSession }) {
  const token = session.token;
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  // new-admin form
  const [login, setLogin] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [formMsg, setFormMsg] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setAdmins(await adminListAccounts(token));
    } catch (e: any) {
      setError(e?.message ?? 'Не вдалося завантажити адміністраторів');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = async () => {
    setFormMsg('');
    if (login.trim().length < 3) return setFormMsg('Логін — щонайменше 3 символи');
    if (password.length < 6) return setFormMsg('Пароль — щонайменше 6 символів');
    setCreating(true);
    try {
      await adminCreateAccount(token, { login: login.trim(), password, name: name.trim() || login.trim() });
      setLogin(''); setName(''); setPassword('');
      await refresh();
    } catch (e: any) {
      setFormMsg(e?.message ?? 'Не вдалося створити адміністратора');
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: number) => {
    setBusyId(id);
    setError('');
    try {
      await adminDeleteAccount(token, id);
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Не вдалося видалити');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      {/* create form */}
      <div style={{ background: PANEL, border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '20px', marginBottom: '22px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '14px', color: 'rgba(244,241,232,0.85)' }}>Додати нового адміністратора</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-start' }}>
          <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Логін" style={{ ...loginInput, flex: '1 1 140px', margin: 0 }} />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ім'я (необов'язково)" style={{ ...loginInput, flex: '1 1 160px', margin: 0 }} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" style={{ ...loginInput, flex: '1 1 140px', margin: 0 }} />
          <button onClick={create} disabled={creating} style={{ background: accent, color: '#071F16', border: 'none', borderRadius: '10px', padding: '12px 20px', fontSize: '13.5px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif", flex: '0 0 auto', opacity: creating ? 0.6 : 1 }}>
            {creating ? 'Створення…' : 'Створити'}
          </button>
        </div>
        {formMsg && <div style={{ color: '#F0A5A5', fontSize: '12.5px', marginTop: '10px' }}>{formMsg}</div>}
      </div>

      {error && <div style={errorBox}>{error}</div>}

      {loading ? (
        <div style={{ color: 'rgba(244,241,232,0.55)', padding: '30px 0', textAlign: 'center' }}>Завантаження…</div>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {admins.map((a) => {
            const isSelf = a.id === session.admin.id;
            const canDelete = !a.isSuper && !isSelf;
            return (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', background: PANEL, border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px 18px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: a.isSuper ? `${accent}22` : 'rgba(255,255,255,0.06)', border: `1px solid ${a.isSuper ? `${accent}66` : 'rgba(255,255,255,0.14)'}`, color: a.isSuper ? accent : 'rgba(244,241,232,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                  <Icon name={a.isSuper ? 'crown' : 'user'} size={18} strokeWidth={1.9} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14.5px', fontWeight: 700 }}>{a.name}</span>
                    {a.isSuper && <Pill color={accent} label="Головний" filled />}
                    {isSelf && <Pill color="#7FC4A0" label="Це ви" />}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(244,241,232,0.5)' }}>@{a.login}</div>
                </div>
                <button
                  onClick={() => canDelete && remove(a.id)}
                  disabled={!canDelete || busyId === a.id}
                  title={a.isSuper ? 'Головного адміністратора видалити не можна' : isSelf ? 'Не можна видалити власний акаунт' : 'Видалити'}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'transparent',
                    border: `1px solid ${canDelete ? 'rgba(224,90,90,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    color: canDelete ? '#E05A5A' : 'rgba(244,241,232,0.3)',
                    borderRadius: '9px',
                    padding: '8px 14px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: canDelete ? 'pointer' : 'not-allowed',
                    fontFamily: "'Manrope', sans-serif",
                    flex: '0 0 auto',
                  }}
                >
                  <Icon name="close" size={13} strokeWidth={2} />
                  Видалити
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Pill({ color, label, filled }: { color: string; label: string; filled?: boolean }) {
  return (
    <span style={{ fontSize: '11px', fontWeight: 700, color: filled ? '#071F16' : color, background: filled ? color : `${color}22`, border: `1px solid ${color}${filled ? '' : '55'}`, borderRadius: '999px', padding: '2px 9px' }}>
      {label}
    </span>
  );
}

function ActionBtn({ onClick, disabled, color, icon, label, ghost }: { onClick: () => void; disabled: boolean; color: string; icon: 'check' | 'close'; label: string; ghost?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: ghost ? 'transparent' : `${color}1F`,
        border: `1px solid ${ghost ? 'rgba(255,255,255,0.14)' : `${color}66`}`,
        color: ghost ? 'rgba(244,241,232,0.65)' : color,
        borderRadius: '9px',
        padding: '8px 14px',
        fontSize: '12.5px',
        fontWeight: 700,
        cursor: disabled ? 'wait' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: "'Manrope', sans-serif",
      }}
    >
      <Icon name={icon} size={14} strokeWidth={2} />
      {label}
    </button>
  );
}

const loginInput: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: '10px',
  padding: '12px 14px',
  color: CREAM,
  fontSize: '14px',
  fontFamily: "'Manrope', sans-serif",
  outline: 'none',
  marginBottom: '12px',
};

const errorBox: React.CSSProperties = {
  background: 'rgba(224,90,90,0.12)',
  border: '1px solid rgba(224,90,90,0.4)',
  color: '#F0A5A5',
  borderRadius: '10px',
  padding: '10px 14px',
  fontSize: '13px',
  marginBottom: '16px',
};

export default AdminMenu;
