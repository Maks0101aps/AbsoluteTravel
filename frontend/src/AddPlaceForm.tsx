import React, { useRef, useState } from 'react';
import { CATEGORY_META, CATEGORY_ORDER, DIFFICULTY_META, DIFFICULTY_ORDER, type PlaceCategory, type Place } from './data/places';
import { isInUkraine } from './data/geo';
import { fileToCompressedDataUrl } from './data/imageUtils';
import { submitPlace, adminCreatePlace, type SubmitPlaceResult } from './api';
import LocationPicker from './LocationPicker';
import { Icon } from './icons';

const CREAM = '#F4F1E8';
const PANEL = '#0B2B20';
const MAX_PHOTOS = 6;

interface AddPlaceFormProps {
  accent?: string;
  submitterName?: string;
  onClose: () => void;
  // Called when a submission is auto-approved, so the map can show it at once.
  onApproved?: (place: Place) => void;
  // When set, the form publishes directly via the admin API (no AI moderation).
  adminToken?: string;
}

function AddPlaceForm({ accent = '#3FA66B', submitterName, onClose, onApproved, adminToken }: AddPlaceFormProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<PlaceCategory>('nature');
  const [region, setRegion] = useState('');
  const [description, setDescription] = useState('');
  const [bestSeason, setBestSeason] = useState('');
  const [difficulty, setDifficulty] = useState(1);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);

  const [geoLoading, setGeoLoading] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitPlaceResult | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setError('Геолокація недоступна у цьому браузері');
      return;
    }
    setGeoLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = Number(pos.coords.latitude.toFixed(5));
        const lo = Number(pos.coords.longitude.toFixed(5));
        if (!isInUkraine(la, lo)) {
          setError('Твоя геолокація поза межами України — познач місце на карті вручну');
        } else {
          setLat(la);
          setLng(lo);
        }
        setGeoLoading(false);
      },
      () => {
        setError('Не вдалося отримати геолокацію. Познач місце на карті.');
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setPhotoBusy(true);
    setError('');
    try {
      const room = MAX_PHOTOS - photos.length;
      const picked = Array.from(files).slice(0, room);
      const encoded: string[] = [];
      for (const file of picked) {
        try {
          encoded.push(await fileToCompressedDataUrl(file));
        } catch {
          setError('Одне із зображень не вдалося обробити');
        }
      }
      if (encoded.length) setPhotos((cur) => [...cur, ...encoded].slice(0, MAX_PHOTOS));
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removePhoto = (idx: number) => setPhotos((cur) => cur.filter((_, i) => i !== idx));

  const canSubmit =
    name.trim().length >= 3 &&
    region.trim().length > 0 &&
    description.trim().length >= 20 &&
    lat != null &&
    lng != null &&
    photos.length >= 2 &&
    !submitting;

  const handleSubmit = async () => {
    setError('');
    if (photos.length < 2) return setError('Додай щонайменше 2 фотографії');
    if (lat == null || lng == null) return setError('Познач геолокацію місця');
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        region: region.trim(),
        category,
        description: description.trim(),
        bestSeason: bestSeason.trim() || undefined,
        lat,
        lng,
        photos,
        difficulty,
        submittedBy: submitterName,
      };
      let res: SubmitPlaceResult;
      if (adminToken) {
        // Admin path: publish directly, bypassing AI moderation.
        const place = await adminCreatePlace(adminToken, payload);
        res = {
          status: 'approved',
          decision: 'approve',
          reason: 'Місце додано адміністратором і одразу опубліковано на карті.',
          moderatedByAi: false,
          place,
        };
      } else {
        res = await submitPlace(payload);
      }
      setResult(res);
      if (res.status === 'approved' && onApproved) onApproved(res.place);
    } catch (e: any) {
      setError(e?.message ?? 'Не вдалося надіслати місце');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        // Above Leaflet's control/pane stack (~1000) so the background map never bleeds through.
        zIndex: 2000,
        background: 'rgba(4,16,11,0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '32px 16px',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '640px',
          background: '#071F16',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '28px',
          fontFamily: "'Manrope', sans-serif",
          color: CREAM,
          boxShadow: '0 30px 80px -24px rgba(0,0,0,0.8)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em', color: accent, marginBottom: '8px' }}>
              НОВЕ МІСЦЕ
            </div>
            <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: '24px', margin: 0 }}>
              {result ? 'Заявку надіслано' : 'Додати місце на карту'}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Закрити" style={iconBtn}>
            <Icon name="close" size={18} />
          </button>
        </div>

        {result ? (
          <ResultView result={result} accent={accent} onClose={onClose} />
        ) : (
          <>
            <p style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'rgba(244,241,232,0.62)', margin: '0 0 20px' }}>
              {adminToken ? (
                <>Місце публікується одразу від імені адміністратора. Потрібні щонайменше <b>2 фото</b> та <b>геолокація</b>.</>
              ) : (
                <>Розкажи про цікаве місце в Україні. Заявку перевірить ШІ-модератор: обов’язково потрібні щонайменше <b>2 фото</b> та <b>геолокація</b>.</>
              )}
            </p>

            {/* name */}
            <Field label="Назва місця">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Напр. Водоспад Шипіт" style={input} maxLength={80} />
            </Field>

            {/* category */}
            <Field label="Категорія">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {CATEGORY_ORDER.map((cat) => {
                  const meta = CATEGORY_META[cat];
                  const active = category === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: active ? `${meta.color}22` : 'transparent',
                        border: `1px solid ${active ? `${meta.color}88` : 'rgba(255,255,255,0.14)'}`,
                        color: active ? meta.color : 'rgba(244,241,232,0.7)',
                        borderRadius: '999px',
                        padding: '7px 13px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: "'Manrope', sans-serif",
                      }}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: meta.color }} />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* region */}
            <Field label="Область / регіон">
              <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Напр. Закарпатська область" style={input} maxLength={80} />
            </Field>

            {/* description */}
            <Field label={`Опис (${description.trim().length}/20+)`}>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Що це за місце і що там варто побачити?"
                rows={4}
                style={{ ...input, resize: 'vertical', lineHeight: 1.5 }}
                maxLength={1500}
              />
            </Field>

            {/* best season */}
            <Field label="Найкращий час (необов’язково)">
              <input value={bestSeason} onChange={(e) => setBestSeason(e.target.value)} placeholder="Напр. Травень – вересень" style={input} maxLength={80} />
            </Field>

            {/* difficulty */}
            <Field label="Складність дослідження">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {DIFFICULTY_ORDER.map((d) => {
                  const meta = DIFFICULTY_META[d];
                  const active = difficulty === d;
                  return (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: active ? `${meta.color}22` : 'transparent',
                        border: `1px solid ${active ? `${meta.color}88` : 'rgba(255,255,255,0.14)'}`,
                        color: active ? meta.color : 'rgba(244,241,232,0.7)',
                        borderRadius: '999px',
                        padding: '7px 13px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: "'Manrope', sans-serif",
                      }}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: meta.color }} />
                      {meta.label} · +{meta.xp} XP
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* geolocation */}
            <Field label="Геолокація (обов’язково)">
              <LocationPicker lat={lat} lng={lng} onPick={(la, lo) => { setLat(la); setLng(lo); }} accent={accent} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                <button onClick={useMyLocation} disabled={geoLoading} style={{ ...secondaryBtn, opacity: geoLoading ? 0.6 : 1 }}>
                  <Icon name="target" size={15} strokeWidth={1.9} />
                  {geoLoading ? 'Визначаю…' : 'Моя геолокація'}
                </button>
                <input
                  value={lat ?? ''}
                  onChange={(e) => setLat(e.target.value === '' ? null : Number(e.target.value))}
                  placeholder="Широта"
                  type="number"
                  step="0.00001"
                  style={{ ...input, width: '120px' }}
                />
                <input
                  value={lng ?? ''}
                  onChange={(e) => setLng(e.target.value === '' ? null : Number(e.target.value))}
                  placeholder="Довгота"
                  type="number"
                  step="0.00001"
                  style={{ ...input, width: '120px' }}
                />
              </div>
            </Field>

            {/* photos */}
            <Field label={`Фотографії (${photos.length}/2+ мінімум)`}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {photos.map((src, i) => (
                  <div key={i} style={{ position: 'relative', width: '92px', height: '92px', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.14)' }}>
                    <img src={src} alt={`Фото ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={() => removePhoto(i)} aria-label="Видалити фото" style={{ position: 'absolute', top: '4px', right: '4px', width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(4,16,11,0.8)', border: 'none', color: CREAM, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="close" size={12} />
                    </button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={photoBusy}
                    style={{ width: '92px', height: '92px', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.28)', background: 'transparent', color: 'rgba(244,241,232,0.6)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '11px', fontFamily: "'Manrope', sans-serif" }}
                  >
                    <Icon name={photoBusy ? 'image' : 'plus'} size={18} />
                    {photoBusy ? 'Обробка…' : 'Додати'}
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => onFiles(e.target.files)} style={{ display: 'none' }} />
            </Field>

            {error && (
              <div style={{ background: 'rgba(224,90,90,0.12)', border: '1px solid rgba(224,90,90,0.4)', color: '#F0A5A5', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', margin: '4px 0 16px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button onClick={onClose} style={{ ...secondaryBtn, flex: '0 0 auto' }}>Скасувати</button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                style={{
                  flex: 1,
                  background: canSubmit ? accent : 'rgba(255,255,255,0.12)',
                  color: canSubmit ? '#071F16' : 'rgba(244,241,232,0.4)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '13px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                  fontFamily: "'Manrope', sans-serif",
                }}
              >
                {submitting
                  ? adminToken
                    ? 'Публікую…'
                    : 'ШІ перевіряє місце…'
                  : adminToken
                    ? 'Опублікувати місце'
                    : 'Надіслати на перевірку'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ResultView({ result, accent, onClose }: { result: SubmitPlaceResult; accent: string; onClose: () => void }) {
  const cfg = {
    approved: { color: '#3FA66B', icon: 'check' as const, title: 'Місце опубліковано!', sub: 'ШІ-модератор схвалив твоє місце — воно вже на карті.' },
    pending: { color: '#D9B44A', icon: 'shield' as const, title: 'Відправлено на перевірку', sub: 'Місце очікує ручної перевірки адміністратором.' },
    rejected: { color: '#E05A5A', icon: 'close' as const, title: 'Місце відхилено', sub: 'На жаль, ШІ-модератор не пропустив це місце.' },
  }[result.status];

  return (
    <div style={{ textAlign: 'center', padding: '10px 4px' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: `${cfg.color}22`, border: `1px solid ${cfg.color}66`, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px auto 18px' }}>
        <Icon name={cfg.icon} size={28} strokeWidth={2} />
      </div>
      <h3 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: '22px', margin: '0 0 8px', color: cfg.color }}>{cfg.title}</h3>
      <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'rgba(244,241,232,0.7)', margin: '0 0 16px', maxWidth: '440px', marginInline: 'auto' }}>{cfg.sub}</p>
      <div style={{ background: PANEL, border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px 16px', textAlign: 'left', margin: '0 auto 20px', maxWidth: '460px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(244,241,232,0.5)', marginBottom: '6px' }}>
          {result.moderatedByAi ? 'ВИСНОВОК ШІ-МОДЕРАТОРА' : 'ПРИМІТКА'}
        </div>
        <div style={{ fontSize: '13.5px', lineHeight: 1.55, color: 'rgba(244,241,232,0.85)' }}>{result.reason}</div>
      </div>
      <button onClick={onClose} style={{ background: accent, color: '#071F16', border: 'none', borderRadius: '12px', padding: '12px 28px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}>
        Готово
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'rgba(244,241,232,0.72)', marginBottom: '7px' }}>{label}</label>
      {children}
    </div>
  );
}

const input: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: '10px',
  padding: '11px 13px',
  color: CREAM,
  fontSize: '14px',
  fontFamily: "'Manrope', sans-serif",
  outline: 'none',
};

const secondaryBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '7px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.16)',
  color: CREAM,
  borderRadius: '10px',
  padding: '11px 16px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: "'Manrope', sans-serif",
};

const iconBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.14)',
  color: CREAM,
  borderRadius: '10px',
  width: '36px',
  height: '36px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  flex: '0 0 auto',
};

export default AddPlaceForm;
