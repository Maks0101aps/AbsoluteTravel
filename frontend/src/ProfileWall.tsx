import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchWall, type WallPost } from './api';
import { Icon, type IconName } from './icons';

const CREAM = '#F4F1E8';

interface ProfileWallProps {
  /** Whose wall to show. */
  userId: number;
  /** Who is looking. Defaults to the owner (the self-view on the profile tab). */
  viewerId?: number;
  accent: string;
}

// A traveler's activity feed: verified place visits (with an optional photo
// the user chose to share) plus automatic entries for newly unlocked
// exploration cells/regions. Readable by the owner and their friends — the
// server rejects anyone else (see WallService).
function ProfileWall({ userId, viewerId, accent }: ProfileWallProps) {
  const { t } = useTranslation();
  const requesterId = viewerId ?? userId;
  const isSelf = requesterId === userId;
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchWall(userId, requesterId)
      .then((page) => {
        if (cancelled) return;
        setPosts(page.posts);
        setCursor(page.nextCursor);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || t('shop.wall.loadFailed'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, requesterId]);

  const loadMore = async () => {
    if (cursor == null) return;
    setLoadingMore(true);
    try {
      const page = await fetchWall(userId, requesterId, cursor);
      setPosts((prev) => [...prev, ...page.posts]);
      setCursor(page.nextCursor);
    } catch (e: any) {
      setError(e?.message || t('shop.wall.loadMoreFailed'));
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(244,241,232,0.5)', marginBottom: '16px' }}>
        {t('shop.wall.title')}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(244,241,232,0.5)', fontSize: '13.5px' }}>
          {t('shop.wall.loading')}
        </div>
      )}

      {!loading && error && (
        <div style={{ fontSize: '13px', color: '#E9A6A6', background: 'rgba(224,90,90,0.12)', border: '1px solid rgba(224,90,90,0.3)', borderRadius: '10px', padding: '12px 16px' }}>
          {error}
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(244,241,232,0.55)', fontSize: '14px', lineHeight: 1.6 }}>
          {isSelf
            ? t('shop.wall.emptySelf')
            : t('shop.wall.emptyOther')}
        </div>
      )}

      {!loading && posts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {posts.map((post) => (
            <WallCard key={post.id} post={post} accent={accent} t={t} />
          ))}
        </div>
      )}

      {cursor != null && !loading && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={loadMore}
            disabled={loadingMore}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: CREAM,
              borderRadius: '10px',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: loadingMore ? 'not-allowed' : 'pointer',
              opacity: loadingMore ? 0.6 : 1,
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            {loadingMore ? t('shop.wall.loading') : t('shop.wall.loadMore')}
          </button>
        </div>
      )}
    </div>
    
  );
}

function WallCard({ post, accent, t }: { post: WallPost; accent: string; t: (key: string, opts?: any) => string }) {
  const celebratory = post.type === 'new_region' || post.type === 'achievement';
  return (
    <div
      style={{
        borderRadius: '16px',
        border: `1px solid ${celebratory ? `${accent}55` : 'rgba(255,255,255,0.10)'}`,
        background: celebratory ? `${accent}0F` : 'rgba(255,255,255,0.04)',
        overflow: 'hidden',
        boxShadow: celebratory ? `0 0 24px -8px ${accent}77` : undefined,
      }}
    >
      {post.type === 'visit' && post.photo && (
        <img src={post.photo} alt={post.placeName ?? t('shop.wall.photoAlt')} style={{ width: '100%', maxHeight: '360px', objectFit: 'cover', display: 'block' }} />
      )}
      <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: celebratory ? `${accent}22` : 'rgba(255,255,255,0.08)',
            color: celebratory ? accent : 'rgba(244,241,232,0.7)',
          }}
        >
          <Icon name={iconFor(post.type)} size={18} strokeWidth={1.9} />
        </div>
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: CREAM }}>{captionFor(post, t)}</div>
          <div style={{ fontSize: '12px', color: 'rgba(244,241,232,0.5)', marginTop: '2px' }}>{formatRelative(post.createdAt, t)}</div>
        </div>
        <div
          style={{
            flex: '0 0 auto',
            fontSize: '12.5px',
            fontWeight: 800,
            color: accent,
            background: `${accent}18`,
            border: `1px solid ${accent}45`,
            borderRadius: '999px',
            padding: '5px 11px',
            whiteSpace: 'nowrap',
          }}
        >
          +{post.xpAwarded} XP
        </div>
      </div>
    </div>
  );
}

function iconFor(type: WallPost['type']): IconName {
  if (type === 'visit') return 'check';
  if (type === 'new_region') return 'star';
  if (type === 'achievement') return 'trophy';
  return 'map'; // legacy 'new_cell' rows from before hexagon posts were removed
}

function captionFor(post: WallPost, t: (key: string, opts?: any) => string): string {
  if (post.type === 'visit') return post.placeName ?? t('shop.wall.newPlaceVisited');
  if (post.type === 'new_region') return t('shop.wall.newRegionUnlocked');
  if (post.type === 'achievement') return post.placeName ?? t('shop.wall.achievementUnlocked');
  return t('shop.wall.newCellUnlocked');
}

function formatRelative(iso: string, t: (key: string, opts?: any) => string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return t('shop.wall.timeJustNow');
  if (minutes < 60) return t('shop.wall.timeMinutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('shop.wall.timeHoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return t('shop.wall.timeDaysAgo', { count: days });
  return date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default ProfileWall;
