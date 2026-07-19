import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Minimal shape of the Google Identity Services API we use here.
// See https://developers.google.com/identity/gsi/web/reference/js-reference
interface GoogleIdCredentialResponse {
  credential: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleIdCredentialResponse) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  const existing = document.querySelector(`script[src="${GIS_SCRIPT_SRC}"]`);
  if (existing) {
    return new Promise((resolve) => existing.addEventListener('load', () => resolve(), { once: true }));
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services script'));
    document.head.appendChild(script);
  });
}

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => void;
  disabled?: boolean;
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path
      fill="#3FA66B"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#3FA66B"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#3FA66B"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#3FA66B"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

/** Renders Google's own "Sign in with Google" button and forwards the resulting ID token. */
function GoogleSignInButton({ onCredential, disabled }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const [width, setWidth] = useState(372);
  const [hovered, setHovered] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (!wrapperRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        // Google button width must be between 200 and 400 pixels
        const newWidth = Math.max(200, Math.min(400, entry.contentRect.width));
        setWidth(newWidth);
      }
    });
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!clientId || disabled) return;
    let cancelled = false;

    loadGisScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => onCredential(response.credential),
        });
        containerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'rectangular',
          width: Math.floor(width),
          logo_alignment: 'left',
        });
      })
      .catch((err) => console.error(err));

    return () => {
      cancelled = true;
    };
  }, [clientId, disabled, onCredential, width]);

  if (!clientId) return null;

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      {/* Custom designed green, light, and premium button */}
      <div
        style={{
          width: '100%',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          borderRadius: '11px',
          background: hovered ? 'rgba(63, 166, 107, 0.16)' : 'rgba(63, 166, 107, 0.07)',
          border: hovered ? '1px solid rgba(63, 166, 107, 0.55)' : '1px solid rgba(63, 166, 107, 0.30)',
          color: hovered ? '#F4F1E8' : '#9BD8B4',
          fontFamily: "'Manrope', sans-serif",
          fontSize: '13.5px',
          fontWeight: 700,
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: hovered ? '0 4px 12px rgba(63, 166, 107, 0.12)' : 'none',
          transform: hovered ? 'translateY(-1px)' : 'none',
          pointerEvents: 'none', // click passes through to the invisible Google iframe
        }}
      >
        <GoogleIcon />
        <span>{t('core.auth.googleSignIn') || 'Продовжити з Google'}</span>
      </div>

      {/* Invisible Google iframe on top to capture the user gesture */}
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0.001,
          zIndex: 10,
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
        }}
      />
    </div>
  );
}

export default GoogleSignInButton;
