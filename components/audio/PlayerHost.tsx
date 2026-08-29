import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';

import { FullPlayer } from '@/components/audio/FullPlayer';
import { MiniPlayer } from '@/components/audio/MiniPlayer';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { MINI_PLAYER_GAP, TAB_BAR_HEIGHT } from '@/lib/layout';
import { selectPost, useFeedStore } from '@/lib/store/feedStore';
import { queueBounds, usePlayerStore } from '@/lib/store/playerStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import type { AudioPost } from '@/lib/types';
import { finiteSeconds } from '@/lib/utils';

/**
 * Owns the persistent player: the native audio engine, a mini player docked
 * above the bottom tabs, and the expandable full-screen view. Mounted once
 * inside the tabs layout so playback survives tab changes.
 */
export function PlayerHost() {
  useAudioEngine();

  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const toggleLike = useFeedStore((state) => state.toggleLike);
  const viewerId = useSessionStore((state) => state.userId);

  const currentId = usePlayerStore((state) => state.currentId);
  const queueIds = usePlayerStore((state) => state.queueIds);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const isBuffering = usePlayerStore((state) => state.isBuffering);
  const error = usePlayerStore((state) => state.error);
  const position = usePlayerStore((state) => state.position);
  const duration = usePlayerStore((state) => state.duration);
  const isExpanded = usePlayerStore((state) => state.isExpanded);
  const speed = usePlayerStore((state) => state.speed);
  const playPost = usePlayerStore((state) => state.playPost);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const playNext = usePlayerStore((state) => state.playNext);
  const playPrevious = usePlayerStore((state) => state.playPrevious);
  const scrubTo = usePlayerStore((state) => state.scrubTo);
  const endScrub = usePlayerStore((state) => state.endScrub);
  const skipBy = usePlayerStore((state) => state.skipBy);
  const expand = usePlayerStore((state) => state.expand);
  const collapse = usePlayerStore((state) => state.collapse);
  const stop = usePlayerStore((state) => state.stop);
  const cycleSpeed = usePlayerStore((state) => state.cycleSpeed);
  const retry = usePlayerStore((state) => state.retry);

  const posts = useFeedStore((state) => state.posts);
  const myPosts = useFeedStore((state) => state.myPosts);

  const post = useMemo(
    () => selectPost({ posts, myPosts }, currentId),
    [posts, myPosts, currentId],
  );
  const upNext = useMemo<AudioPost[]>(() => {
    const index = currentId ? queueIds.indexOf(currentId) : -1;
    if (index < 0) return [];
    return queueIds.slice(index + 1, index + 4).flatMap((id) => {
      const queued = selectPost({ posts, myPosts }, id);
      return queued ? [queued] : [];
    });
  }, [posts, myPosts, queueIds, currentId]);

  if (!post) return null;

  const reportedDuration = finiteSeconds(duration);
  const total = reportedDuration > 0 ? reportedDuration : finiteSeconds(post.durationSec);
  const progress = total > 0 ? Math.min(1, finiteSeconds(position) / total) : 0;
  const { hasNext, hasPrevious } = queueBounds(queueIds, post.id);
  // Liking is stored per account, so a guest listener sees the count only.
  const handleToggleLike = viewerId ? () => void toggleLike(post.id, viewerId) : undefined;

  if (isExpanded) {
    return (
      <FullPlayer
        post={post}
        creator={post.creator}
        isPlaying={isPlaying}
        isBuffering={isBuffering}
        error={error}
        position={position}
        duration={duration}
        speed={speed}
        hasNext={hasNext}
        hasPrevious={hasPrevious}
        queue={upNext}
        onCollapse={collapse}
        onClose={stop}
        onTogglePlay={togglePlay}
        onNext={playNext}
        onPrevious={playPrevious}
        onScrub={scrubTo}
        onScrubEnd={endScrub}
        onSkipBy={skipBy}
        onCycleSpeed={cycleSpeed}
        onToggleLike={handleToggleLike}
        onSelectQueueItem={(postId) => playPost(postId)}
        onRetry={retry}
      />
    );
  }

  // The feed itself is a full-screen player, so the docked mini player would duplicate it.
  if (pathname === '/') return null;

  return (
    <MiniPlayer
      post={post}
      creator={post.creator}
      isPlaying={isPlaying}
      isBuffering={isBuffering}
      error={error}
      progress={progress}
      bottom={TAB_BAR_HEIGHT + insets.bottom + MINI_PLAYER_GAP}
      onExpand={expand}
      onTogglePlay={togglePlay}
      onRetry={retry}
    />
  );
}
