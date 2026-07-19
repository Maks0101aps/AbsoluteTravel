import { useTranslation } from 'react-i18next';
import { Icon } from './icons';
import { usePush } from './usePush';

const CREAM = '#F4F1E8';

/**
 * Push-notification opt-in shown in the profile tab. Lets a logged-in user
 * enable/disable browser notifications (messages, friend requests, walk
 * reminders) and fire a self-test once enabled.
 */
export default function NotificationsSettings({ userId, accent }: { userId: number; accent: string }) {
  const { t } = useTranslation();
  const { supported, permission, subscribed, busy, error, enable, disable } = usePush();

  const header = (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', fontWeight: 700,
        letterSpacing: '0.18em', color: 'rgba(244,241,232,0.5)', marginBottom: '12px', textTransform: 'uppercase',
      }}
    >
      <Icon name={subscribed ? 'bell' : 'bellOff'} size={14} strokeWidth={1.8} stroke="rgba(244,241,232,0.5)" />
      {t('notifications.title')}
    </div>
  );

  if (!supported) {
    return (
      <div style={{ marginBottom: '32px' }}>
        {header}
        <div style={{ fontSize: '13px', color: 'rgba(244,241,232,0.45)' }}>{t('notifications.unsupported')}</div>
      </div>
    );
  }

  const blocked = permission === 'denied';

  return (
    <div style={{ marginBottom: '32px' }}>
      {header}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
          padding: '14px 16px', borderRadius: '14px',
          border: `1px solid ${subscribed ? `${accent}55` : 'rgba(255,255,255,0.09)'}`,
          background: subscribed ? `${accent}14` : 'rgba(255,255,255,0.03)',
          transition: 'all 0.18s ease',
        }}
      >
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: CREAM, marginBottom: '3px' }}>
            {subscribed ? t('notifications.onTitle') : t('notifications.offTitle')}
          </div>
          <div style={{ fontSize: '12.5px', lineHeight: 1.5, color: 'rgba(244,241,232,0.62)' }}>
            {blocked ? t('notifications.blocked') : t('notifications.description')}
          </div>
          {error && error !== 'denied' && (
            <div style={{ fontSize: '12px', color: '#E4635F', marginTop: '6px' }}>
              {t(`notifications.error.${error}`, t('notifications.error.failed'))}
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={busy || blocked}
          onClick={() => (subscribed ? disable(userId) : enable(userId))}
          aria-pressed={subscribed}
          style={{
            flex: '0 0 auto',
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '10px 18px', borderRadius: '11px',
            cursor: busy || blocked ? 'not-allowed' : 'pointer',
            border: 'none',
            background: subscribed ? 'rgba(255,255,255,0.1)' : accent,
            color: subscribed ? CREAM : '#071F16',
            fontFamily: "'Manrope', sans-serif", fontSize: '13px', fontWeight: 700,
            opacity: busy || blocked ? 0.55 : 1,
            transition: 'all 0.16s ease',
          }}
        >
          {busy
            ? t('notifications.working')
            : subscribed
              ? t('notifications.disable')
              : t('notifications.enable')}
        </button>
      </div>
    </div>
  );
}
