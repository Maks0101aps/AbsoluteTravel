import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isInUkraine } from './data/geo';
import { fileToCompressedDataUrl } from './data/imageUtils';
import { createFriendLabel, type FriendLabel } from './api';
import LocationPicker from './LocationPicker';
import { Icon } from './icons';

const CREAM = '#F4F1E8';

interface AddLabelFormProps {
  accent?: string;
  userId: number;
  onClose: () => void;
  onCreated: (label: FriendLabel) => void;
}

interface CustomParamRow {
  key: string;
  value: string;
}

function AddLabelForm({ accent = '#3FA66B', userId, onClose, onCreated }: AddLabelFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [friendsOnly, setFriendsOnly] = useState(true);
  const [isTemporary, setIsTemporary] = useState(false);
  const [customParams, setCustomParams] = useState<CustomParamRow[]>([]);

  const [geoLoading, setGeoLoading] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setError(t('forms.addLabel.errorGeoUnavailable'));
      return;
    }
    setGeoLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = Number(pos.coords.latitude.toFixed(5));
        const lo = Number(pos.coords.longitude.toFixed(5));
        if (!isInUkraine(la, lo)) {
          setError(t('forms.addLabel.errorOutsideUkraine'));
        } else {
          setLat(la);
          setLng(lo);
        }
        setGeoLoading(false);
      },
      () => {
        setError(t('forms.addLabel.errorGeoFailed'));
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    setPhotoBusy(true);
    setError('');
    try {
      const dataUrl = await fileToCompressedDataUrl(files[0]);
      setPhoto(dataUrl);
    } catch {
      setError(t('forms.addLabel.errorPhotoFailed'));
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removePhoto = () => setPhoto(null);

  const addParamRow = () => {
    setCustomParams((cur) => [...cur, { key: '', value: '' }]);
  };

  const removeParamRow = (idx: number) => {
    setCustomParams((cur) => cur.filter((_, i) => i !== idx));
  };

  const updateParamRow = (idx: number, field: 'key' | 'value', val: string) => {
    setCustomParams((cur) =>
      cur.map((row, i) => (i === idx ? { ...row, [field]: val } : row))
    );
  };

  const canSubmit =
    name.trim().length >= 3 &&
    description.trim().length >= 5 &&
    lat != null &&
    lng != null &&
    !submitting;

  const handleSubmit = async () => {
    setError('');
    if (lat == null || lng == null) return setError(t('forms.addLabel.errorNeedLocation'));
    setSubmitting(true);
    try {
      // Build parameters object
      const paramsObj: Record<string, string> = {};
      customParams.forEach((row) => {
        const k = row.key.trim();
        const v = row.value.trim();
        if (k && v) {
          paramsObj[k] = v;
        }
      });

      const payload = {
        userId,
        name: name.trim(),
        description: description.trim(),
        lat,
        lng,
        photo: photo || undefined,
        friendsOnly,
        isTemporary,
        customParams: paramsObj,
      };

      const result = await createFriendLabel(payload);
      onCreated(result);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? t('forms.addLabel.errorSubmitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="at-sheet-shell"
      style={{
        position: 'fixed',
        inset: 0,
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
        className="at-sheet-panel"
        style={{
          width: '100%',
          maxWidth: '600px',
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
            <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: '24px', margin: 0 }}>
              {t('forms.addLabel.title')}
            </h2>
          </div>
          <button onClick={onClose} aria-label={t('forms.addLabel.closeAria')} style={iconBtn}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <p style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'rgba(244,241,232,0.62)', margin: '0 0 20px' }}>
          {t('forms.addLabel.description')}
        </p>

        {/* name */}
        <Field label={t('forms.addLabel.nameLabel')}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('forms.addLabel.namePlaceholder')} style={input} maxLength={80} />
        </Field>

        {/* description */}
        <Field label={t('forms.addLabel.descriptionLabel')}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('forms.addLabel.descriptionPlaceholder')}
            rows={3}
            style={{ ...input, resize: 'vertical', lineHeight: 1.5 }}
            maxLength={500}
          />
        </Field>

        {/* Visibility toggle */}
        <Field label={t('forms.addLabel.visibilityLabel')}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setFriendsOnly(true)}
              style={{
                ...toggleBtn,
                background: friendsOnly ? 'rgba(255,255,255,0.08)' : 'transparent',
                borderColor: friendsOnly ? '#ffffff' : 'rgba(255,255,255,0.14)',
                color: friendsOnly ? '#ffffff' : 'rgba(244,241,232,0.6)',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffffff' }} />
              {t('forms.addLabel.visibilityFriends')}
            </button>
            <button
              onClick={() => setFriendsOnly(false)}
              style={{
                ...toggleBtn,
                background: !friendsOnly ? 'rgba(255,255,255,0.08)' : 'transparent',
                borderColor: !friendsOnly ? accent : 'rgba(255,255,255,0.14)',
                color: !friendsOnly ? accent : 'rgba(244,241,232,0.6)',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: accent }} />
              {t('forms.addLabel.visibilityEveryone')}
            </button>
          </div>
        </Field>

        {/* Expiration toggle */}
        <Field label={t('forms.addLabel.durationLabel')}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setIsTemporary(false)}
              style={{
                ...toggleBtn,
                background: !isTemporary ? 'rgba(255,255,255,0.08)' : 'transparent',
                borderColor: !isTemporary ? accent : 'rgba(255,255,255,0.14)',
                color: !isTemporary ? CREAM : 'rgba(244,241,232,0.6)',
              }}
            >
              {t('forms.addLabel.durationPermanent')}
            </button>
            <button
              onClick={() => setIsTemporary(true)}
              style={{
                ...toggleBtn,
                background: isTemporary ? 'rgba(255,255,255,0.08)' : 'transparent',
                borderColor: isTemporary ? accent : 'rgba(255,255,255,0.14)',
                color: isTemporary ? CREAM : 'rgba(244,241,232,0.6)',
              }}
            >
              {t('forms.addLabel.durationTemporary')}
            </button>
          </div>
        </Field>

        {/* custom params */}
        <Field label={t('forms.addLabel.customParamsLabel')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
            {customParams.map((row, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  value={row.key}
                  onChange={(e) => updateParamRow(i, 'key', e.target.value)}
                  placeholder={t('forms.addLabel.paramKeyPlaceholder')}
                  style={{ ...input, flex: 1 }}
                  maxLength={40}
                />
                <input
                  value={row.value}
                  onChange={(e) => updateParamRow(i, 'value', e.target.value)}
                  placeholder={t('forms.addLabel.paramValuePlaceholder')}
                  style={{ ...input, flex: 1 }}
                  maxLength={60}
                />
                <button
                  onClick={() => removeParamRow(i)}
                  aria-label={t('forms.addLabel.removeParamAria')}
                  style={{ ...iconBtn, background: 'rgba(224,90,90,0.12)', borderColor: 'rgba(224,90,90,0.3)', color: '#F0A5A5' }}
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={addParamRow} style={secondaryBtn}>
            <Icon name="plus" size={14} />
            {t('forms.addLabel.addParamBtn')}
          </button>
        </Field>

        {/* geolocation */}
        <Field label={t('forms.addLabel.geoLabel')}>
          <LocationPicker lat={lat} lng={lng} onPick={(la, lo) => { setLat(la); setLng(lo); }} accent={accent} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
            <button onClick={useMyLocation} disabled={geoLoading} style={{ ...secondaryBtn, opacity: geoLoading ? 0.6 : 1 }}>
              <Icon name="target" size={15} strokeWidth={1.9} />
              {geoLoading ? t('forms.addLabel.myLocationLoading') : t('forms.addLabel.myLocationBtn')}
            </button>
            <input
              value={lat ?? ''}
              onChange={(e) => setLat(e.target.value === '' ? null : Number(e.target.value))}
              placeholder={t('forms.addLabel.latPlaceholder')}
              type="number"
              step="0.00001"
              style={{ ...input, width: '120px' }}
            />
            <input
              value={lng ?? ''}
              onChange={(e) => setLng(e.target.value === '' ? null : Number(e.target.value))}
              placeholder={t('forms.addLabel.lngPlaceholder')}
              type="number"
              step="0.00001"
              style={{ ...input, width: '120px' }}
            />
          </div>
        </Field>

        {/* photo */}
        <Field label={t('forms.addLabel.photoLabel')}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {photo ? (
              <div style={{ position: 'relative', width: '120px', height: '90px', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.14)' }}>
                <img src={photo} alt={t('forms.addLabel.photoAlt')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={removePhoto} aria-label={t('forms.addLabel.removePhotoAria')} style={{ position: 'absolute', top: '4px', right: '4px', width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(4,16,11,0.8)', border: 'none', color: CREAM, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="close" size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={photoBusy}
                style={{ width: '120px', height: '90px', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.28)', background: 'transparent', color: 'rgba(244,241,232,0.6)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '12px', fontFamily: "'Manrope', sans-serif" }}
              >
                <Icon name={photoBusy ? 'image' : 'plus'} size={18} />
                {photoBusy ? t('forms.addLabel.processing') : t('forms.addLabel.addPhotoBtn')}
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
        </Field>

        {error && (
          <div style={{ background: 'rgba(224,90,90,0.12)', border: '1px solid rgba(224,90,90,0.4)', color: '#F0A5A5', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', margin: '4px 0 16px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button onClick={onClose} style={{ ...secondaryBtn, flex: '0 0 auto' }}>{t('forms.addLabel.cancelBtn')}</button>
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
            {submitting ? t('forms.addLabel.submittingBtn') : t('forms.addLabel.submitBtn')}
          </button>
        </div>
      </div>
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

const toggleBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '7px',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: '10px',
  padding: '11px 16px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: "'Manrope', sans-serif",
  flex: 1,
  justifyContent: 'center',
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

export default AddLabelForm;
