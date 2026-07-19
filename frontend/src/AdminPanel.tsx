import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  type AuthUser,
  type ProfileCustomization,
} from './api';
import { CATEGORY_META, DIFFICULTY_META, type PlaceCategory } from './data/places';
import AddPlaceForm from './AddPlaceForm';
import EditPlaceModal from './EditPlaceModal';
import ProfileSetup from './ProfileSetup';
import { AVATARS, COLORS, BACKGROUNDS, FRAMES, BADGES, EFFECTS } from './data/profileOptions';
import { MAX_LEVEL } from './data/leveling';
import { Icon } from './icons';

const CREAM = '#F4F1E8';
const BG = '#071F16';
const PANEL = '#0B2B20';
const DEFAULT_ACCENT = '#3FA66B';

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';
type Section = 'moderation' | 'admins';

function statusMeta(t: (key: string) => string): Record<string, { label: string; color: string }> {
  return {
    pending: { label: t('forms.admin.status.pending'), color: '#D9B44A' },
    approved: { label: t('forms.admin.status.approved'), color: '#3FA66B' },
    rejected: { label: t('forms.admin.status.rejected'), color: '#E05A5A' },
  };
}

function decisionLabel(t: (key: string) => string): Record<string, string> {
  return {
    approve: t('forms.admin.aiDecision.approve'),
    reject: t('forms.admin.aiDecision.reject'),
    review: t('forms.admin.aiDecision.review'),
  };
}

interface AdminMenuProps {
  session: AdminSession;
  onLogout: () => void;
  accent?: string;
}

// Full-page admin menu. Login happens through the shared participant login
// form; this is only ever rendered once an admin session exists.
function AdminMenu({ session, onLogout, accent = DEFAULT_ACCENT }: AdminMenuProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<'dashboard' | 'profile'>('dashboard');

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", background: BG, color: CREAM, minHeight: '100dvh' }}>
      <nav className="at-admin-nav" style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '14px 40px', background: 'rgba(7,31,22,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
        <img src="/assets/logo.svg" alt="Absolute Travel" style={{ height: '40px', width: 'auto', display: 'block' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setView((v) => (v === 'profile' ? 'dashboard' : 'profile'))}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', color: view === 'profile' ? '#071F16' : accent, background: view === 'profile' ? accent : `${accent}18`, border: `1px solid ${accent}44`, borderRadius: '999px', padding: '8px 15px', cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}
          >
            <Icon name={view === 'profile' ? 'arrowLeft' : 'user'} size={14} strokeWidth={2} />
            {view === 'profile' ? t('forms.admin.backToDashboard') : t('forms.admin.customizeProfile')}
          </button>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', color: accent, background: `${accent}18`, border: `1px solid ${accent}44`, borderRadius: '999px', padding: '6px 13px' }}>
            <Icon name="lock" size={14} strokeWidth={2} />
            {t('forms.admin.adminPanelBadge')}
          </span>
        </div>
      </nav>
      {view === 'profile' ? (
        <AdminProfileEditor admin={session.admin} onDone={() => setView('dashboard')} />
      ) : (
        <main className="at-admin-main" style={{ maxWidth: '1140px', margin: '0 auto', padding: '40px 24px 80px' }}>
          <AdminDashboard accent={accent} session={session} onLogout={onLogout} />
        </main>
      )}
    </div>
  );
}

// --- Admin profile customization --------------------------------------------
// Admin accounts aren't rows in the User table (no coins/level/loot-cases),
// so instead of gating cosmetics behind that economy, every admin simply has
// every cosmetic unlocked. Reuses the same ProfileSetup editor regular users
// get — it has no backend side effects of its own (it just hands the built
// ProfileCustomization to onComplete), so it's safe to drive with a synthetic
// "always unlocked" user. The customization itself lives in localStorage,
// scoped by admin id — kept out of the AdminSession object on purpose, since
// that gets overwritten with a fresh copy from the server on every session
// re-validation (see Root.tsx), which would silently wipe it otherwise.

const ALL_COSMETIC_IDS = [...AVATARS, ...COLORS, ...BACKGROUNDS, ...FRAMES, ...BADGES, ...EFFECTS].map((o) => o.id);

function adminProfileKey(adminId: number) {
  return `absolute_travel_admin_profile_${adminId}`;
}

function loadAdminProfile(adminId: number): ProfileCustomization | undefined {
  try {
    const raw = localStorage.getItem(adminProfileKey(adminId));
    return raw ? (JSON.parse(raw) as ProfileCustomization) : undefined;
  } catch {
    return undefined;
  }
}

function saveAdminProfile(adminId: number, profile: ProfileCustomization) {
  try {
    localStorage.setItem(adminProfileKey(adminId), JSON.stringify(profile));
  } catch {
    // ignore storage errors (e.g. private mode)
  }
}

function AdminProfileEditor({ admin, onDone }: { admin: AdminAccount; onDone: () => void }) {
  const syntheticUser: AuthUser = useMemo(
    () => ({
      id: admin.id,
      username: admin.login,
      email: '',
      city: null,
      region: null,
      name: admin.name,
      avatar: '/assets/avatar_default.svg',
      level: MAX_LEVEL,
      xp: 999999,
      coins: 999999,
      unlockedItems: ALL_COSMETIC_IDS,
      rank: 'admin',
      currentDestination: null,
      profile: loadAdminProfile(admin.id),
    }),
    [admin],
  );

  return (
    <ProfileSetup
      user={syntheticUser}
      onComplete={(profile) => {
        saveAdminProfile(admin.id, profile);
        onDone();
      }}
      onSkip={onDone}
    />
  );
}

function AdminDashboard({ accent, session, onLogout }: { accent: string; session: AdminSession; onLogout: () => void }) {
  const { t } = useTranslation();
  const [section, setSection] = useState<Section>('moderation');

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", color: CREAM }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: 'clamp(24px, 3vw, 32px)', margin: 0 }}>
            {section === 'moderation' ? t('forms.admin.sectionModeration') : t('forms.admin.sectionAdmins')}
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right', lineHeight: 1.3 }}>
            <div style={{ fontSize: '13px', fontWeight: 700 }}>{session.admin.name}</div>
            <div style={{ fontSize: '11px', color: session.admin.isSuper ? accent : 'rgba(244,241,232,0.5)' }}>
              {session.admin.isSuper ? t('forms.admin.superAdmin') : `@${session.admin.login}`}
            </div>
          </div>
          <button onClick={onLogout} style={{ background: 'transparent', color: 'rgba(244,241,232,0.7)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: '11px', padding: '10px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}>
            {t('forms.admin.logoutBtn')}
          </button>
        </div>
      </div>

      {/* section switch */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '22px', flexWrap: 'wrap' }}>
        <SectionTab active={section === 'moderation'} onClick={() => setSection('moderation')} accent={accent} icon="map" label={t('forms.admin.sectionModeration')} />
        <SectionTab active={section === 'admins'} onClick={() => setSection('admins')} accent={accent} icon="user" label={t('forms.admin.sectionAdmins')} />
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
  const { t } = useTranslation();
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [places, setPlaces] = useState<AdminPlace[]>([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<AdminPlace | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [list, c] = await Promise.all([adminListPlaces(token, filter), adminPlaceCounts(token)]);
      setPlaces(list);
      setCounts(c);
    } catch (e: any) {
      setError(e?.message ?? t('forms.admin.errorLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [token, filter, t]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const act = async (id: number, fn: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await fn();
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? t('forms.admin.errorActionFailed'));
    } finally {
      setBusyId(null);
    }
  };

  const FILTERS: { id: StatusFilter; label: string; count?: number }[] = [
    { id: 'pending', label: t('forms.admin.filterPending'), count: counts.pending },
    { id: 'approved', label: t('forms.admin.filterApproved'), count: counts.approved },
    { id: 'rejected', label: t('forms.admin.filterRejected'), count: counts.rejected },
    { id: 'all', label: t('forms.admin.filterAll') },
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
          <Icon name="plus" size={16} strokeWidth={2} /> {t('forms.admin.addPlaceBtn')}
        </button>
      </div>

      {error && <div style={errorBox}>{error}</div>}

      {loading ? (
        <div style={{ color: 'rgba(244,241,232,0.55)', padding: '40px 0', textAlign: 'center' }}>{t('forms.admin.loading')}</div>
      ) : places.length === 0 ? (
        <div style={{ color: 'rgba(244,241,232,0.5)', padding: '40px 0', textAlign: 'center', fontSize: '14px' }}>{t('forms.admin.emptyCategory')}</div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {places.map((place) => (
            <PlaceCard key={place.id} place={place} accent={accent} busy={busyId === place.id}
              onApprove={() => act(place.id, () => adminApprovePlace(token, place.id))}
              onReject={() => act(place.id, () => adminRejectPlace(token, place.id))}
              onDelete={() => act(place.id, () => adminDeletePlace(token, place.id))}
              onEdit={() => setEditing(place)}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddPlaceForm
          accent={accent}
          adminToken={token}
          submitterName={t('forms.admin.adminSubmitterName')}
          onClose={() => setShowAdd(false)}
          onApproved={() => { setShowAdd(false); refresh(); }}
        />
      )}

      {editing && (
        <EditPlaceModal
          place={editing}
          token={token}
          accent={accent}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

function PlaceCard({ place, accent, busy, onApprove, onReject, onDelete, onEdit }: {
  place: AdminPlace;
  accent: string;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const meta = CATEGORY_META[place.category as PlaceCategory] ?? { label: place.category, color: accent };
  const status = statusMeta(t)[place.status] ?? { label: place.status, color: accent };
  const difficulty = DIFFICULTY_META[place.difficulty ?? 1] ?? DIFFICULTY_META[1];

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

      <div className="at-col" style={{ flex: '1 1 320px', minWidth: '260px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontFamily: "'Lora', serif", fontSize: '19px', fontWeight: 500 }}>
            {t(`places.${place.id}.name`, { defaultValue: place.name })}
          </span>
          <Pill color={status.color} label={status.label} filled />
          <Pill color={meta.color} label={t(`category.${place.category}`, { defaultValue: meta.label })} />
          <Pill color={difficulty.color} label={`${t(`difficulty.${place.difficulty}`, { defaultValue: difficulty.label })} · +${difficulty.xp} XP`} />
        </div>
        <div style={{ fontSize: '12.5px', color: 'rgba(244,241,232,0.5)', marginBottom: '10px' }}>
          {t(`places.${place.id}.region`, { defaultValue: place.region })} · {place.lat.toFixed(3)}, {place.lng.toFixed(3)}
          {place.submittedBy ? t('forms.admin.submittedBy', { name: place.submittedBy }) : ''}
        </div>
        <p style={{ fontSize: '13px', lineHeight: 1.55, color: 'rgba(244,241,232,0.78)', margin: '0 0 12px' }}>
          {t(`places.${place.id}.description`, { defaultValue: place.description })}
        </p>

        {place.aiDecision && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px 12px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Icon name="sparkle" size={14} stroke={accent} strokeWidth={1.9} />
              <span style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.05em', color: 'rgba(244,241,232,0.75)' }}>
                {decisionLabel(t)[place.aiDecision] ?? place.aiDecision}
              </span>
              {place.aiScore != null && <span style={{ fontSize: '11px', color: 'rgba(244,241,232,0.45)' }}>({Math.round(place.aiScore * 100)}%)</span>}
            </div>
            {place.aiReason && <div style={{ fontSize: '12.5px', lineHeight: 1.5, color: 'rgba(244,241,232,0.65)' }}>{place.aiReason}</div>}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {place.status !== 'approved' && <ActionBtn onClick={onApprove} disabled={busy} color="#3FA66B" icon="check" label={t('forms.admin.actionApprove')} />}
          {place.status !== 'rejected' && <ActionBtn onClick={onReject} disabled={busy} color="#E05A5A" icon="close" label={t('forms.admin.actionReject')} />}
          <ActionBtn onClick={onEdit} disabled={busy} color="#7FC4A0" icon="pencil" label={t('forms.admin.actionEdit')} />
          <ActionBtn onClick={onDelete} disabled={busy} color="rgba(244,241,232,0.6)" icon="close" label={t('forms.admin.actionDelete')} ghost />
        </div>
      </div>
    </div>
  );
}

// --- Admins management -----------------------------------------------------

function AdminsSection({ accent, session }: { accent: string; session: AdminSession }) {
  const { t } = useTranslation();
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
      setError(e?.message ?? t('forms.admin.errorLoadAdminsFailed'));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = async () => {
    setFormMsg('');
    if (login.trim().length < 3) return setFormMsg(t('forms.admin.errorLoginLength'));
    if (password.length < 6) return setFormMsg(t('forms.admin.errorPasswordLength'));
    setCreating(true);
    try {
      await adminCreateAccount(token, { login: login.trim(), password, name: name.trim() || login.trim() });
      setLogin(''); setName(''); setPassword('');
      await refresh();
    } catch (e: any) {
      setFormMsg(e?.message ?? t('forms.admin.errorCreateFailed'));
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
      setError(e?.message ?? t('forms.admin.errorDeleteFailed'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      {/* create form */}
      <div style={{ background: PANEL, border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '20px', marginBottom: '22px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '14px', color: 'rgba(244,241,232,0.85)' }}>{t('forms.admin.addNewAdmin')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-start' }}>
          <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder={t('forms.admin.loginPlaceholder')} style={{ ...loginInput, flex: '1 1 140px', margin: 0 }} />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('forms.admin.namePlaceholder')} style={{ ...loginInput, flex: '1 1 160px', margin: 0 }} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('forms.admin.passwordPlaceholder')} style={{ ...loginInput, flex: '1 1 140px', margin: 0 }} />
          <button onClick={create} disabled={creating} style={{ background: accent, color: '#071F16', border: 'none', borderRadius: '10px', padding: '12px 20px', fontSize: '13.5px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif", flex: '0 0 auto', opacity: creating ? 0.6 : 1 }}>
            {creating ? t('forms.admin.creatingBtn') : t('forms.admin.createBtn')}
          </button>
        </div>
        {formMsg && <div style={{ color: '#F0A5A5', fontSize: '12.5px', marginTop: '10px' }}>{formMsg}</div>}
      </div>

      {error && <div style={errorBox}>{error}</div>}

      {loading ? (
        <div style={{ color: 'rgba(244,241,232,0.55)', padding: '30px 0', textAlign: 'center' }}>{t('forms.admin.loading')}</div>
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
                    {a.isSuper && <Pill color={accent} label={t('forms.admin.superAdminShort')} filled />}
                    {isSelf && <Pill color="#7FC4A0" label={t('forms.admin.you')} />}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(244,241,232,0.5)' }}>@{a.login}</div>
                </div>
                <button
                  onClick={() => canDelete && remove(a.id)}
                  disabled={!canDelete || busyId === a.id}
                  title={a.isSuper ? t('forms.admin.deleteSuperTitle') : isSelf ? t('forms.admin.deleteSelfTitle') : t('forms.admin.deleteTitle')}
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
                  {t('forms.admin.deleteTitle')}
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

function ActionBtn({ onClick, disabled, color, icon, label, ghost }: { onClick: () => void; disabled: boolean; color: string; icon: 'check' | 'close' | 'pencil'; label: string; ghost?: boolean }) {
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
