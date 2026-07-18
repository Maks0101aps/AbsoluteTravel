import { useTranslation } from 'react-i18next';
import LeafletMap from './LeafletMap';

interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
  accent?: string;
}

// Real OpenStreetMap picker: tap/click anywhere in Ukraine to drop a pin, or
// drag the pin once placed. Works well on mobile (pinch-zoom, tap-to-pick).
function LocationPicker({ lat, lng, onPick, accent = '#3FA66B' }: LocationPickerProps) {
  const { t } = useTranslation();
  const hasPin = lat != null && lng != null;

  return (
    <div
      style={{
        position: 'relative',
        background: '#081E15',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '14px',
        padding: '10px',
      }}
    >
      <LeafletMap
        pickable
        pin={hasPin ? { lat: lat!, lng: lng! } : null}
        onPick={onPick}
        accent={accent}
        height="320px"
      />
      <div style={{ fontSize: '11.5px', color: 'rgba(244,241,232,0.5)', marginTop: '6px', textAlign: 'center' }}>
        {hasPin
          ? t('explore.locationPicker.picked', { lat: lat!.toFixed(4), lng: lng!.toFixed(4) })
          : t('explore.locationPicker.tapToPick')}
      </div>
    </div>
  );
}

export default LocationPicker;
