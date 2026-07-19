import { useTranslation } from 'react-i18next';
import { usePwa } from './usePwa';
import { Icon } from './icons';

/**
 * Global PWA affordances rendered once at the app root:
 *  - an offline status pill (top) whenever the network drops,
 *  - an "install app" card (bottom) when the browser offers installation,
 *  - a "new version" toast (bottom) when a fresh service worker is waiting.
 *
 * All copy is translated via the `pwa.*` namespace.
 */
export default function PwaBanners() {
  const { t } = useTranslation();
  const { offline, needRefresh, canInstall, promptInstall, dismissInstall, update } = usePwa();

  return (
    <>
      {offline && (
        <div className="at-pwa-offline" role="status" aria-live="polite">
          <Icon name="alertTriangle" size={16} />
          <span>{t('pwa.offline.banner')}</span>
        </div>
      )}

      {canInstall && (
        <div className="at-pwa-install at-pwa-card" role="dialog" aria-label={t('pwa.install.title')}>
          <div className="at-pwa-install-icon" aria-hidden>
            <Icon name="compass" size={26} />
          </div>
          <div className="at-pwa-install-text">
            <strong>{t('pwa.install.title')}</strong>
            <span>{t('pwa.install.body')}</span>
          </div>
          <div className="at-pwa-actions">
            <button type="button" className="at-pwa-btn at-pwa-btn-primary" onClick={promptInstall}>
              {t('pwa.install.action')}
            </button>
            <button
              type="button"
              className="at-pwa-btn at-pwa-btn-ghost"
              onClick={dismissInstall}
              aria-label={t('pwa.install.dismiss')}
            >
              {t('pwa.install.dismiss')}
            </button>
          </div>
        </div>
      )}

      {needRefresh && (
        <div className="at-pwa-update at-pwa-card" role="status" aria-live="polite">
          <div className="at-pwa-install-text">
            <strong>{t('pwa.update.title')}</strong>
            <span>{t('pwa.update.body')}</span>
          </div>
          <button type="button" className="at-pwa-btn at-pwa-btn-primary" onClick={update}>
            {t('pwa.update.action')}
          </button>
        </div>
      )}
    </>
  );
}
