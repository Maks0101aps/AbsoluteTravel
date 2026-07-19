import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  findUserByFriendCode,
  getMyFriendCode,
  searchUsers,
  sendFriendRequest,
  type UserSearchResult,
} from './api';
import UserCard from './UserCard';
import { Icon } from './icons';

const CREAM = '#F4F1E8';
const PANEL = '#0B2B20';
const PANEL_2 = '#081E15';

// A friend code is 6 chars from our generator's charset — used to decide
// whether a raw scanned/typed string should also be tried as an exact-code
// lookup, on top of the regular name/username search.
const CODE_RE = /^[A-Z0-9]{6}$/;

const SCAN_ELEMENT_ID = 'add-friend-qr-scanner';

function friendCodeDeepLink(code: string): string {
  return `${window.location.origin}/add-friend?code=${code}`;
}

// Accepts either a bare code or one of our deep links and pulls the code out.
function extractFriendCode(scanned: string): string | null {
  const trimmed = scanned.trim();
  try {
    const url = new URL(trimmed);
    const fromQuery = url.searchParams.get('code');
    if (fromQuery && CODE_RE.test(fromQuery.toUpperCase())) return fromQuery.toUpperCase();
  } catch {
    // not a URL — fall through to treating it as a raw code
  }
  const upper = trimmed.toUpperCase();
  return CODE_RE.test(upper) ? upper : null;
}

interface AddFriendModalProps {
  userId: number;
  accent: string;
  onClose: () => void;
  // Relays a sent/accepted request back to FriendsPage so it can flash a
  // notice and refresh the list — mirrors FriendsPage's own handleSend.
  onRequestSent: (name: string) => void;
  onError: (message: string) => void;
}

function AddFriendModal({ userId, accent, onClose, onRequestSent, onError }: AddFriendModalProps) {
  const { t } = useTranslation();
  const [myCode, setMyCode] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    getMyFriendCode(userId)
      .then((r) => setMyCode(r.friendCode))
      .catch(() => setMyCode(null));
  }, [userId]);

  // Debounced search: always runs the name/username search, and additionally
  // tries an exact friend-code lookup when the query is code-shaped — the
  // single input understands both, per the "as fast as possible" requirement.
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(() => {
      const byName = searchUsers(userId, q).catch(() => [] as UserSearchResult[]);
      const byCode = CODE_RE.test(q.toUpperCase())
        ? findUserByFriendCode(userId, q).catch(() => null)
        : Promise.resolve(null);
      Promise.all([byName, byCode]).then(([nameResults, codeResult]) => {
        const merged = [...nameResults];
        if (codeResult && !merged.some((r) => r.id === codeResult.id)) {
          merged.unshift(codeResult);
        }
        setResults(merged);
        setSearching(false);
      });
    }, 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query, userId]);

  const handleSend = useCallback(
    async (target: UserSearchResult) => {
      try {
        await sendFriendRequest(userId, { targetUserId: target.id });
        onRequestSent(target.name);
        setResults((prev) => prev.map((r) => (r.id === target.id ? { ...r, relation: 'outgoing' } : r)));
      } catch (e: any) {
        onError(e.message);
      }
    },
    [userId, onRequestSent, onError],
  );

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner && scanner.isScanning) {
      try {
        await scanner.stop();
        scanner.clear();
      } catch {
        // camera may already be gone — nothing to clean up
      }
    }
  }, []);

  const handleScanned = useCallback(
    async (decodedText: string) => {
      const code = extractFriendCode(decodedText);
      if (!code) return; // ignore unrelated QR codes, keep scanning
      await stopScanner();
      setScanning(false);
      try {
        const res = await sendFriendRequest(userId, { friendCode: code });
        onRequestSent(res.receiver?.name ?? code);
      } catch (e: any) {
        onError(e.message);
      }
    },
    [stopScanner, userId, onRequestSent, onError],
  );

  // Starts the camera once the scanner view has mounted its target div.
  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;
    setScanError(null);
    const scanner = new Html5Qrcode(SCAN_ELEMENT_ID);
    scannerRef.current = scanner;
    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 240 },
        (decodedText) => {
          if (!cancelled) handleScanned(decodedText);
        },
        undefined,
      )
      .catch(() => {
        if (!cancelled) setScanError(t('social.addFriend.cameraError'));
      });
    return () => {
      cancelled = true;
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  const closeAll = () => {
    stopScanner();
    onClose();
  };

  return (
    <div
      onClick={closeAll}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(4,14,10,0.74)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          maxHeight: '88vh',
          overflowY: 'auto',
          borderRadius: '20px',
          background: 'linear-gradient(180deg,#0B2A1D,#081E15)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 40px 90px -30px rgba(0,0,0,0.85)',
          padding: '22px',
          fontFamily: "'Manrope', sans-serif",
          color: CREAM,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: '22px', margin: 0 }}>
            {t('social.addFriend.heading')}
          </h3>
          <button
            onClick={closeAll}
            aria-label={t('social.addFriend.close')}
            style={{ background: 'transparent', border: 'none', color: CREAM, opacity: 0.6, cursor: 'pointer', padding: '4px' }}
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {scanning ? (
          <div>
            <div
              id={SCAN_ELEMENT_ID}
              style={{ width: '100%', borderRadius: '14px', overflow: 'hidden', background: '#000', minHeight: '260px' }}
            />
            {scanError && (
              <div style={{ marginTop: '10px', fontSize: '13px', color: '#E58784' }}>{scanError}</div>
            )}
            <button
              onClick={() => {
                stopScanner();
                setScanning(false);
              }}
              style={{
                marginTop: '14px',
                width: '100%',
                background: 'transparent',
                border: `1px solid ${accent}88`,
                color: accent,
                borderRadius: '12px',
                padding: '11px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Manrope', sans-serif",
              }}
            >
              {t('social.addFriend.cancelScan')}
            </button>
          </div>
        ) : (
          <>
            {/* 1 & 2: unified username / friend-code search */}
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(244,241,232,0.4)', display: 'inline-flex' }}>
                <Icon name="target" size={15} strokeWidth={1.9} />
              </span>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('social.addFriend.searchPlaceholder')}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: PANEL,
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: '12px',
                  padding: '12px 14px 12px 38px',
                  color: CREAM,
                  fontSize: '14px',
                  fontFamily: "'Manrope', sans-serif",
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
              {searching && <div style={{ fontSize: '13px', color: 'rgba(244,241,232,0.5)' }}>{t('social.friends.searching')}</div>}
              {!searching && query.trim().length >= 2 && results.length === 0 && (
                <div style={{ fontSize: '13px', color: 'rgba(244,241,232,0.5)' }}>{t('social.friends.noResults')}</div>
              )}
              {results.map((r, i) => (
                <UserCard
                  key={r.id}
                  user={r}
                  accent={accent}
                  index={i}
                  compact
                  actions={
                    r.relation === 'friends' ? (
                      <span style={{ fontSize: '12px', color: accent, fontWeight: 700 }}>{t('social.addFriend.alreadyFriends')}</span>
                    ) : r.relation === 'outgoing' ? (
                      <span style={{ fontSize: '12px', color: 'rgba(244,241,232,0.5)' }}>{t('social.friends.requestSentButton')}</span>
                    ) : (
                      <button
                        onClick={() => handleSend(r)}
                        style={{
                          background: accent,
                          color: '#071F16',
                          border: 'none',
                          borderRadius: '9px',
                          padding: '7px 13px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontFamily: "'Manrope', sans-serif",
                        }}
                      >
                        {t('social.friends.add')}
                      </button>
                    )
                  }
                />
              ))}
            </div>

            {/* 3: QR scan */}
            <button
              onClick={() => setScanning(true)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: accent,
                color: '#071F16',
                border: 'none',
                borderRadius: '12px',
                padding: '13px',
                fontSize: '14px',
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: "'Manrope', sans-serif",
                marginBottom: '18px',
              }}
            >
              <Icon name="scan" size={18} strokeWidth={2} />
              {t('social.addFriend.scanQr')}
            </button>

            {/* own code + QR to share */}
            <div
              style={{
                background: PANEL_2,
                border: '1px dashed rgba(255,255,255,0.15)',
                borderRadius: '16px',
                padding: '18px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '12px', color: 'rgba(244,241,232,0.55)', marginBottom: '12px' }}>
                {t('social.addFriend.yourCode')}
              </div>
              {myCode ? (
                <>
                  <div
                    style={{
                      background: '#F4F1E8',
                      borderRadius: '12px',
                      padding: '12px',
                      display: 'inline-block',
                      marginBottom: '12px',
                    }}
                  >
                    <QRCodeSVG value={friendCodeDeepLink(myCode)} size={168} bgColor="#F4F1E8" fgColor="#0B2B20" level="M" />
                  </div>
                  <div
                    style={{
                      fontFamily: "'Lora', serif",
                      fontSize: '22px',
                      fontWeight: 600,
                      letterSpacing: '0.12em',
                      color: accent,
                    }}
                  >
                    {myCode}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '13px', color: 'rgba(244,241,232,0.5)' }}>{t('social.friends.searching')}</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AddFriendModal;
