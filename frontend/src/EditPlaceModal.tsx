import React, { useState } from 'react';
import { CATEGORY_META, CATEGORY_ORDER, DIFFICULTY_META, DIFFICULTY_ORDER, type PlaceCategory } from './data/places';
import { adminUpdatePlace, type AdminPlace } from './api';
import LeafletMap from './LeafletMap';
import { Icon } from './icons';

const CREAM = '#F4F1E8';

interface EditPlaceModalProps {
  place: AdminPlace;
  token: string;
  accent?: string;
  onClose: () => void;
  onSaved: (updated: AdminPlace) => void;
}

// Admin-only: edit an existing place's details, difficulty and exact position
// (drag the pin on the real OpenStreetMap). Photos & moderation stay untouched.
function EditPlaceModal({ place, token, accent = '#3FA66B', onClose, onSaved }: EditPlaceModalProps) {
  const [name, setName] = useState(place.name);
  const [category, setCategory] = useState<PlaceCategory>(place.category);
  const [region, setRegion] = useState(place.region);
  const [description, setDescription] = useState(place.description);
  const [bestSeason, setBestSeason] = useState(place.bestSeason);
  const [difficulty, setDifficulty] = useState(place.difficulty ?? 1);
  const [lat, setLat] = useState(place.lat);
  const [lng, setLng] = useState(place.lng);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canSave = name.trim().length >= 3 && region.trim().length > 0 && description.trim().length >= 20 && !saving;

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      const updated = await adminUpdatePlace(token, place.id, {
        name: name.trim(),
        category,
        region: region.trim(),
        description: description.trim(),
        bestSeason: bestSeason.trim() || undefined,
        difficulty,
        lat,
        lng,
      });
      onSaved(updated);
    } catch (e: any) {
      setError(e?.message ?? 'Не вдалося зберегти зміни');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        // Above Leaflet's control/pane stack (~1000) so a background map never bleeds through.
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
              РЕДАГУВАННЯ МІСЦЯ
            </div>
            <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: '24px', margin: 0 }}>{place.name}</h2>
          </div>
          <button onClick={onClose} aria-label="Закрити" style={iconBtn}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <Field label="Назва місця">
          <input value={name} onChange={(e) => setName(e.target.value)} style={input} maxLength={80} />
        </Field>

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

        <Field label="Область / регіон">
          <input value={region} onChange={(e) => setRegion(e.target.value)} style={input} maxLength={80} />
        </Field>

        <Field label={`Опис (${description.trim().length}/20+)`}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            style={{ ...input, resize: 'vertical', lineHeight: 1.5 }}
            maxLength={1500}
          />
        </Field>

        <Field label="Найкращий час">
          <input value={bestSeason} onChange={(e) => setBestSeason(e.target.value)} style={input} maxLength={80} />
        </Field>

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

        <Field label="Положення на карті (перетягни мітку)">
          <LeafletMap
            pickable
            pin={{ lat, lng }}
            onPick={(la, lo) => {
              setLat(la);
              setLng(lo);
            }}
            accent={accent}
            height="300px"
          />
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <input
              value={lat}
              onChange={(e) => setLat(Number(e.target.value))}
              type="number"
              step="0.00001"
              style={{ ...input, width: '140px' }}
            />
            <input
              value={lng}
              onChange={(e) => setLng(Number(e.target.value))}
              type="number"
              step="0.00001"
              style={{ ...input, width: '140px' }}
            />
          </div>
        </Field>

        {error && (
          <div style={{ background: 'rgba(224,90,90,0.12)', border: '1px solid rgba(224,90,90,0.4)', color: '#F0A5A5', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', margin: '4px 0 16px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button onClick={onClose} style={secondaryBtn}>Скасувати</button>
          <button
            onClick={save}
            disabled={!canSave}
            style={{
              flex: 1,
              background: canSave ? accent : 'rgba(255,255,255,0.12)',
              color: canSave ? '#071F16' : 'rgba(244,241,232,0.4)',
              border: 'none',
              borderRadius: '12px',
              padding: '13px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: canSave ? 'pointer' : 'not-allowed',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            {saving ? 'Зберігаю…' : 'Зберегти зміни'}
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
  flex: '0 0 auto',
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

export default EditPlaceModal;
