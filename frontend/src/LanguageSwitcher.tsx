import { useTranslation } from 'react-i18next';
import { Icon } from './icons';
import { LANGUAGES } from './i18n';

const CREAM = '#F4F1E8';

export default function LanguageSwitcher({ accent }: { accent: string }) {
  const { t, i18n } = useTranslation();

  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(244,241,232,0.5)', marginBottom: '12px', textTransform: 'uppercase' }}>
        <Icon name="globe" size={14} strokeWidth={1.8} stroke="rgba(244,241,232,0.5)" />
        {t('common.language')}
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {LANGUAGES.map((lang) => {
          const on = i18n.resolvedLanguage === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => i18n.changeLanguage(lang.code)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '9px 16px', borderRadius: '11px', cursor: 'pointer',
                border: `1px solid ${on ? `${accent}66` : 'rgba(255,255,255,0.09)'}`,
                background: on ? `${accent}1F` : 'transparent',
                color: on ? CREAM : 'rgba(244,241,232,0.7)',
                fontFamily: "'Manrope', sans-serif", fontSize: '13px', fontWeight: 700,
                letterSpacing: '0.02em',
                transition: 'all 0.16s ease',
              }}
            >
              {lang.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
