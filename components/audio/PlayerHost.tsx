import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';

import { FullPlayer, type QueueEntry } from '@/components/audio/FullPlayer';
import { MiniPlayer } from '@/components/audio/MiniPlayer';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { MINI_PLAYER_GAP, TAB_BAR_HEIGHT } from '@/lib/layout';
import { CREATORS_BY_ID } from '@/lib/mockData';
import { useFeedStore } from '@/lib/store/feedStore';
import { queueBounds, usePlayerStore } from '@/lib/store/playerStore';

/**
 * Owns the persistent player: the native audio engine, a mini player docked
 * above the bottom tabs, and the expandable full-screen view. Mounted once
 * inside the tabs layout so playback survives tab changes.
 */
export function PlayerHost() {
  useAudioEngine();

  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const posts = useFeedStore((state) => state.posts);
  const toggleLike = useFeedStore((state) => state.toggleLike);

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

  const post = currentId ? posts.find((item) => item.id === currentId) : undefined;
  if (!post) return null;

  const creator = CREATORS_BY_ID[post.creatorId];
  if (!creator) return null;

  const total = duration > 0 ? duration : post.durationSec;
  const progress = total > 0 ? Math.min(1, position / total) : 0;
  const { index: currentIndex, hasNext, hasPrevious } = queueBounds(queueIds, post.id);

  const upNext: QueueEntry[] = queueIds
    .slice(currentIndex + 1, currentIndex + 4)
    .map((id) => {
      const queuedPost = posts.find((item) => item.id === id);
      const queuedCreator = queuedPost ? CREATORS_BY_ID[queuedPost.creatorId] : undefined;
      return queuedPost && queuedCreator ? { post: queuedPost, creator: queuedCreator } : null;
    })
    .filter((entry): entry is QueueEntry => entry !== null);

  if (isExpanded) {
    return (
      <FullPlayer
        post={post}
        creator={creator}
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
        onToggleLike={() => toggleLike(post.id)}
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
      creator={creator}
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
