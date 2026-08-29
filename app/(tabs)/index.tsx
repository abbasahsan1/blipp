import { Radio, TriangleAlert } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  RefreshControl,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, Spinner, Typography } from 'heroui-native';

import { AudioReel } from '@/components/audio/AudioReel';
import { ReelSkeleton } from '@/components/audio/ReelSkeleton';
import { PALETTE } from '@/lib/palette';
import { useFeedStore } from '@/lib/store/feedStore';
import { usePlayerStore } from '@/lib/store/playerStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import type { AudioPost, FeedSort } from '@/lib/types';

const SORTS: { value: FeedSort; label: string }[] = [
  { value: 'most_listened', label: 'Most Listened' },
  { value: 'newest', label: 'Newest' },
];

const HEADER_HEIGHT = 46;

export default function FeedScreen() {
  const insets = useSafeAreaInsets();

  const posts = useFeedStore((state) => state.posts);
  const sort = useFeedStore((state) => state.sort);
  const isLoading = useFeedStore((state) => state.isLoading);
  const isRefreshing = useFeedStore((state) => state.isRefreshing);
  const isSorting = useFeedStore((state) => state.isSorting);
  const feedError = useFeedStore((state) => state.error);
  const loadedFor = useFeedStore((state) => state.loadedFor);
  const setSort = useFeedStore((state) => state.setSort);
  const loadFeed = useFeedStore((state) => state.loadFeed);
  const refresh = useFeedStore((state) => state.refresh);
  const toggleLike = useFeedStore((state) => state.toggleLike);

  const currentId = usePlayerStore((state) => state.currentId);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const isBuffering = usePlayerStore((state) => state.isBuffering);
  const error = usePlayerStore((state) => state.error);
  const position = usePlayerStore((state) => state.position);
  const duration = usePlayerStore((state) => state.duration);
  const speed = usePlayerStore((state) => state.speed);
  const playPost = usePlayerStore((state) => state.playPost);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const scrubTo = usePlayerStore((state) => state.scrubTo);
  const endScrub = usePlayerStore((state) => state.endScrub);
  const cycleSpeed = usePlayerStore((state) => state.cycleSpeed);
  const retry = usePlayerStore((state) => state.retry);

  // The feed is public: a viewer id only decides whose likes come back marked.
  const viewerId = useSessionStore((state) => state.userId);
  const sessionStatus = useSessionStore((state) => state.status);

  const [pageHeight, setPageHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<AudioPost>>(null);

  const queueIds = useMemo(() => posts.map((post) => post.id), [posts]);

  // Latest values for the scroll handler, which must stay stable across renders.
  const postsRef = useRef(posts);
  const queueIdsRef = useRef(queueIds);
  const currentIdRef = useRef(currentId);
  const activeIndexRef = useRef(activeIndex);
  const pageHeightRef = useRef(pageHeight);

  useEffect(() => {
    postsRef.current = posts;
    queueIdsRef.current = queueIds;
    currentIdRef.current = currentId;
    activeIndexRef.current = activeIndex;
    pageHeightRef.current = pageHeight;
  }, [posts, queueIds, currentId, activeIndex, pageHeight]);

  const headerInset = insets.top + HEADER_HEIGHT;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setPageHeight(Math.round(event.nativeEvent.layout.height));
  }, []);

  // Signing in or out changes which hearts are filled, so the feed is reloaded
  // for the new viewer.
  useEffect(() => {
    if (sessionStatus === 'loading' || loadedFor === viewerId) return;
    void loadFeed(viewerId);
  }, [sessionStatus, viewerId, loadedFor, loadFeed]);

  // Snapping a reel into view starts it: the feed is the player.
  const handleSnap = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const height = pageHeightRef.current;
      if (height <= 0) return;
      const index = Math.max(0, Math.round(event.nativeEvent.contentOffset.y / height));
      const post = postsRef.current[index];
      if (!post) return;
      if (index !== activeIndexRef.current) setActiveIndex(index);
      if (post.id !== currentIdRef.current) playPost(post.id, queueIdsRef.current);
    },
    [playPost],
  );

  const handleTogglePlay = useCallback(
    (postId: string) => {
      if (currentIdRef.current === postId) {
        togglePlay();
        return;
      }
      playPost(postId, queueIdsRef.current);
    },
    [togglePlay, playPost],
  );

  const handleToggleLike = useCallback(
    (postId: string) => {
      void toggleLike(postId, viewerId);
    },
    [toggleLike, viewerId],
  );

  // Queue the top of the feed on first load and whenever the ranking changes.
  // Browsers block audio that starts without a user gesture, so on web the first
  // post is selected but left paused.
  useEffect(() => {
    if (isLoading || isSorting) return;
    const first = postsRef.current[0];
    if (!first) return;
    setActiveIndex(0);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    playPost(first.id, queueIdsRef.current, { autoplay: Platform.OS !== 'web' });
  }, [sort, isLoading, isSorting, playPost]);

  // Follow the player when a track ends or is picked from another screen.
  useEffect(() => {
    if (!currentId || pageHeight <= 0) return;
    const index = posts.findIndex((post) => post.id === currentId);
    if (index < 0 || index === activeIndex) return;
    setActiveIndex(index);
    listRef.current?.scrollToOffset({ offset: index * pageHeight, animated: true });
  }, [currentId, posts, activeIndex, pageHeight]);

  const renderItem = useCallback(
    ({ item, index }: { item: AudioPost; index: number }) => {
      const isActive = item.id === currentId;
      return (
        <AudioReel
          post={item}
          creator={item.creator}
          height={pageHeight}
          topInset={headerInset}
          bottomInset={0}
          isActive={isActive}
          isPlaying={isActive && isPlaying}
          isBuffering={isActive && isBuffering}
          error={isActive ? error : null}
          position={isActive ? position : 0}
          duration={isActive ? duration : 0}
          speed={speed}
          showSwipeHint={index === 0}
          onTogglePlay={handleTogglePlay}
          onScrub={scrubTo}
          onScrubEnd={endScrub}
          onToggleLike={viewerId ? handleToggleLike : undefined}
          onCycleSpeed={cycleSpeed}
          onRetry={retry}
        />
      );
    },
    [
      currentId,
      pageHeight,
      headerInset,
      isPlaying,
      isBuffering,
      error,
      position,
      duration,
      speed,
      handleTogglePlay,
      scrubTo,
      endScrub,
      viewerId,
      handleToggleLike,
      cycleSpeed,
      retry,
    ],
  );

  return (
    <View className="bg-background flex-1" onLayout={handleLayout}>
      {pageHeight <= 0 ? null : isLoading ? (
        <ReelSkeleton height={pageHeight} topInset={headerInset} bottomInset={0} />
      ) : feedError && posts.length === 0 ? (
        <View
          className="flex-1 items-center justify-center px-10"
          style={{ paddingTop: headerInset }}
        >
          <TriangleAlert color={PALETTE.danger} size={32} />
          <Typography type="body" weight="semibold" align="center" className="mt-4">
            The feed didn’t load
          </Typography>
          <Typography type="body-sm" color="muted" align="center" className="mt-1">
            {feedError}
          </Typography>
          <Button variant="tertiary" className="mt-5" onPress={() => void loadFeed(viewerId)}>
            <Button.Label>Try again</Button.Label>
          </Button>
        </View>
      ) : posts.length === 0 ? (
        <View
          className="flex-1 items-center justify-center px-10"
          style={{ paddingTop: headerInset }}
        >
          <Radio color={PALETTE.muted} size={34} />
          <Typography type="body" weight="semibold" align="center" className="mt-4">
            Nothing to listen to yet
          </Typography>
          <Typography type="body-sm" color="muted" align="center" className="mt-1">
            Pull down to refresh, or upload the first Blipp from the Upload tab.
          </Typography>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          pagingEnabled
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onMomentumScrollEnd={handleSnap}
          getItemLayout={(_, index) => ({
            length: pageHeight,
            offset: pageHeight * index,
            index,
          })}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          windowSize={3}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void refresh(viewerId)}
              tintColor={PALETTE.accent}
              colors={[PALETTE.accent]}
              progressBackgroundColor={PALETTE.surface}
              progressViewOffset={headerInset}
            />
          }
        />
      )}

      <View
        className="absolute top-0 right-0 left-0"
        style={{ paddingTop: insets.top + 4, height: insets.top + HEADER_HEIGHT }}
        pointerEvents="box-none"
      >
        <View className="flex-row items-center justify-center gap-2">
          {SORTS.map((item) => {
            const isActive = item.value === sort;
            return (
              <Chip
                key={item.value}
                size="sm"
                color="accent"
                variant={isActive ? 'primary' : 'tertiary'}
                disabled={isSorting}
                onPress={() => void setSort(item.value, viewerId)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive, disabled: isSorting }}
              >
                <Chip.Label>{item.label}</Chip.Label>
                {isActive && isSorting ? <Spinner size="sm" /> : null}
              </Chip>
            );
          })}
        </View>
      </View>
    </View>
  );
}
