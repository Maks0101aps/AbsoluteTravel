import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Place } from './data/places';
import { fileToCompressedDataUrl } from './data/imageUtils';
import { verifyCheckmark, type VerifyCheckmarkResult } from './api';
import { Icon } from './icons';

const CREAM = '#F4F1E8';

interface VerifyVisitModalProps {
  place: Place;
  userId: number;
  accent?: string;
  onClose: () => void;
  // Called after a successful verification so the app can update XP/coins/level
  // and mark the place as opened.
  onVerified: (result: VerifyCheckmarkResult) => void;
}

type Coords = { lat: number; lng: number };

function VerifyVisitModal({ place, userId, accent = '#3FA66B', onClose, onVerified }: VerifyVisitModalProps) {
  const { t } = useTranslation();
  const [coords, setCoords] = useState<Coords | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<VerifyCheckmarkResult | null>(null);
  const [shareToWall, setShareToWall] = useState(true);

  const fileRef = useRef<HTMLInputElement>(null);

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setError(t('forms.verifyVisit.errorGeoUnavailable'));
      return;
    }
    setGeoLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
        setGeoLoading(false);
      },
      () => {
        setError(t('forms.verifyVisit.errorGeoFailed'));
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const onFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setPhotoBusy(true);
    setError('');
    try {
      setPhoto(await fileToCompressedDataUrl(file));
    } catch {
      setError(t('forms.verifyVisit.errorPhotoFailed'));
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const submit = async () => {
    if (!coords) {
      setError(t('forms.verifyVisit.errorNeedLocation'));
      return;
    }
    if (!photo) {
      setError(t('forms.verifyVisit.errorNeedPhoto'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await verifyCheckmark({
        userId,
        placeId: Number(place.id),
        lat: coords.lat,
        lng: coords.lng,
        photo,
        shareToWall,
      });
      setResult(res);
      if (res.verified) onVerified(res);
    } catch (e: any) {
      setError(e?.message || t('forms.verifyVisit.errorVerifyFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const retry = () => {
    setResult(null);
    setError('');
  };

  const success = result?.verified;

  return (
    <div
      onClick={onClose}
      className="at-sheet-shell"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
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
          maxWidth: '520px',
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
            <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: '23px', margin: 0 }}>
              {place.name}
            </h2>
            <div style={{ fontSize: '12.5px', color: 'rgba(244,241,232,0.5)', marginTop: '4px' }}>{place.region}</div>
          </div>
          <button onClick={onClose} aria-label={t('forms.verifyVisit.closeAria')} style={iconBtn}>
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* --- Result screen --- */}
        {result ? (
          <div style={{ textAlign: 'center', padding: '10px 0 4px' }}>
            {success ? (
              <>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: `${accent}22`,
                    border: `2px solid ${accent}`,
                    color: accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '4px auto 18px',
                    animation: 'fadeUp 0.4s ease both',
                  }}
                >
                  <Icon name="check" size={30} strokeWidth={2.4} />
                </div>
                <h3 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: '22px', margin: '0 0 8px' }}>
                  {t('forms.verifyVisit.successTitle')}
                </h3>
                <p style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'rgba(244,241,232,0.7)', margin: '0 0 18px' }}>
                  {result.reason}
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <RewardPill label={t('forms.verifyVisit.xpReward')} value={`+${result.xpAwarded} XP`} color={accent} />
                  <RewardPill label={t('forms.verifyVisit.coinsReward')} value={`+${result.coinsAwarded}`} color="#F0C64B" />
                </div>
                {result.leveledUp && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: `${accent}1F`,
                      border: `1px solid ${accent}66`,
                      color: accent,
                      borderRadius: '999px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 700,
                      marginTop: '6px',
                      animation: 'fadeUp 0.5s 0.15s ease both',
                    }}
                  >
                    <Icon name="star" size={15} strokeWidth={2} />
                    {t('forms.verifyVisit.newLevel', { level: result.newLevel })}
                  </div>
                )}
                <div style={{ marginTop: '22px' }}>
                  <button onClick={onClose} style={{ ...primaryBtn(accent), width: '100%' }}>
                    {t('forms.verifyVisit.greatBtn')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(224,90,90,0.14)',
                    border: '2px solid #E05A5A',
                    color: '#E05A5A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '4px auto 18px',
                  }}
                >
                  <Icon name="close" size={30} strokeWidth={2.4} />
                </div>
                <h3 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: '22px', margin: '0 0 8px' }}>
                  {t('forms.verifyVisit.failTitle')}
                </h3>
                <p style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'rgba(244,241,232,0.7)', margin: '0 0 20px' }}>
                  {result.reason}
                </p>
                <button onClick={retry} style={{ ...primaryBtn(accent), width: '100%' }}>
                  {t('forms.verifyVisit.retryBtn')}
                </button>
              </>
            )}
          </div>
        ) : (
          /* --- Input screen --- */
          <>
            <p style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'rgba(244,241,232,0.65)', margin: '0 0 20px' }}>
              {t('forms.verifyVisit.intro')}
            </p>

            {/* Step 1: geolocation */}
            <div style={{ marginBottom: '18px' }}>
              <div style={fieldLabel}>{t('forms.verifyVisit.step1Label')}</div>
              <button onClick={useMyLocation} disabled={geoLoading} style={secondaryBtn(accent)}>
                <Icon name="target" size={16} strokeWidth={1.9} />
                {geoLoading ? t('forms.verifyVisit.locatingBtn') : coords ? t('forms.verifyVisit.updateLocationBtn') : t('forms.verifyVisit.shareLocationBtn')}
              </button>
              {coords && (
                <div style={{ fontSize: '12px', color: accent, marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="check" size={14} strokeWidth={2.2} />
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </div>
              )}
            </div>

            {/* Step 2: photo */}
            <div style={{ marginBottom: '20px' }}>
              <div style={fieldLabel}>{t('forms.verifyVisit.step2Label')}</div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={(e) => onFile(e.target.files)}
              />
              {photo ? (
                <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <img src={photo} alt={t('forms.verifyVisit.photoAlt')} style={{ width: '100%', display: 'block', maxHeight: '260px', objectFit: 'cover' }} />
                  <button
                    onClick={() => fileRef.current?.click()}
                    style={{
                      position: 'absolute',
                      bottom: '10px',
                      right: '10px',
                      background: 'rgba(4,16,11,0.8)',
                      color: CREAM,
                      border: '1px solid rgba(255,255,255,0.25)',
                      borderRadius: '10px',
                      padding: '8px 14px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: "'Manrope', sans-serif",
                    }}
                  >
                    {t('forms.verifyVisit.changePhotoBtn')}
                  </button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()} disabled={photoBusy} style={secondaryBtn(accent)}>
                  <Icon name="camera" size={16} strokeWidth={1.9} />
                  {photoBusy ? t('forms.verifyVisit.processingBtn') : t('forms.verifyVisit.takePhotoBtn')}
                </button>
              )}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'rgba(244,241,232,0.75)', marginBottom: '18px', cursor: 'pointer' }}>
              <input type="checkbox" checked={shareToWall} onChange={(e) => setShareToWall(e.target.checked)} />
              {t('forms.verifyVisit.shareToWallLabel')}
            </label>

            {error && (
              <div style={{ fontSize: '13px', color: '#E9A6A6', background: 'rgba(224,90,90,0.12)', border: '1px solid rgba(224,90,90,0.3)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <button
              onClick={submit}
              disabled={submitting || !coords || !photo}
              style={{
                ...primaryBtn(accent),
                width: '100%',
                opacity: submitting || !coords || !photo ? 0.5 : 1,
                cursor: submitting || !coords || !photo ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? t('forms.verifyVisit.submittingBtn') : t('forms.verifyVisit.submitBtn')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function RewardPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        background: `${color}18`,
        border: `1px solid ${color}55`,
        borderRadius: '14px',
        padding: '12px 20px',
        minWidth: '110px',
        animation: 'fadeUp 0.5s 0.1s ease both',
      }}
    >
      <div style={{ fontSize: '11px', color: 'rgba(244,241,232,0.6)', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

const fieldLabel: React.CSSProperties = {
  fontSize: '12.5px',
  fontWeight: 700,
  color: 'rgba(244,241,232,0.75)',
  marginBottom: '10px',
};

const iconBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px',
  width: '36px',
  height: '36px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: CREAM,
  cursor: 'pointer',
  flex: '0 0 auto',
};

function primaryBtn(accent: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: accent,
    color: '#071F16',
    border: 'none',
    borderRadius: '12px',
    padding: '14px 22px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Manrope', sans-serif",
  };
}

function secondaryBtn(accent: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: `${accent}18`,
    color: accent,
    border: `1px solid ${accent}55`,
    borderRadius: '12px',
    padding: '12px 18px',
    fontSize: '13.5px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Manrope', sans-serif",
  };
}

export default VerifyVisitModal;
