import { Radio } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  RefreshControl,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip, Typography } from 'heroui-native';

import { AudioReel } from '@/components/audio/AudioReel';
import { ReelSkeleton } from '@/components/audio/ReelSkeleton';
import { CREATORS_BY_ID } from '@/lib/mockData';
import { PALETTE } from '@/lib/palette';
import { sortPostsForCategory, useFeedStore } from '@/lib/store/feedStore';
import { usePlayerStore } from '@/lib/store/playerStore';
import type { AudioPost, FeedCategory } from '@/lib/types';

const CATEGORIES: { value: FeedCategory; label: string }[] = [
  { value: 'for-you', label: 'For you' },
  { value: 'trending', label: 'Trending' },
  { value: 'fresh', label: 'Fresh' },
];

const HEADER_HEIGHT = 46;

export default function FeedScreen() {
  const insets = useSafeAreaInsets();

  const posts = useFeedStore((state) => state.posts);
  const category = useFeedStore((state) => state.category);
  const isLoading = useFeedStore((state) => state.isLoading);
  const isRefreshing = useFeedStore((state) => state.isRefreshing);
  const setCategory = useFeedStore((state) => state.setCategory);
  const refresh = useFeedStore((state) => state.refresh);
  const toggleLike = useFeedStore((state) => state.toggleLike);

  const currentId = usePlayerStore((state) => state.currentId);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const position = usePlayerStore((state) => state.position);
  const speed = usePlayerStore((state) => state.speed);
  const playPost = usePlayerStore((state) => state.playPost);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const seek = usePlayerStore((state) => state.seek);
  const cycleSpeed = usePlayerStore((state) => state.cycleSpeed);

  const [pageHeight, setPageHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<AudioPost>>(null);

  const ordered = useMemo(() => sortPostsForCategory(posts, category), [posts, category]);
  const queueIds = useMemo(() => ordered.map((post) => post.id), [ordered]);

  // Latest values for the scroll handler, which must stay stable across renders.
  const orderedRef = useRef(ordered);
  const queueIdsRef = useRef(queueIds);
  const currentIdRef = useRef(currentId);
  const activeIndexRef = useRef(activeIndex);
  const pageHeightRef = useRef(pageHeight);

  useEffect(() => {
    orderedRef.current = ordered;
    queueIdsRef.current = queueIds;
    currentIdRef.current = currentId;
    activeIndexRef.current = activeIndex;
    pageHeightRef.current = pageHeight;
  }, [ordered, queueIds, currentId, activeIndex, pageHeight]);

  const headerInset = insets.top + HEADER_HEIGHT;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setPageHeight(Math.round(event.nativeEvent.layout.height));
  }, []);

  // Snapping a reel into view starts it: the feed is the player.
  const handleSnap = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const height = pageHeightRef.current;
      if (height <= 0) return;
      const index = Math.max(0, Math.round(event.nativeEvent.contentOffset.y / height));
      const post = orderedRef.current[index];
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

  // Autoplay the top of the feed on first load and whenever the category changes.
  useEffect(() => {
    if (isLoading) return;
    const first = orderedRef.current[0];
    if (!first) return;
    setActiveIndex(0);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    playPost(first.id, queueIdsRef.current);
  }, [category, isLoading, playPost]);

  // Follow the player when a track ends or is picked from another screen.
  useEffect(() => {
    if (!currentId || pageHeight <= 0) return;
    const index = ordered.findIndex((post) => post.id === currentId);
    if (index < 0 || index === activeIndex) return;
    setActiveIndex(index);
    listRef.current?.scrollToOffset({ offset: index * pageHeight, animated: true });
  }, [currentId, ordered, activeIndex, pageHeight]);

  const renderItem = useCallback(
    ({ item, index }: { item: AudioPost; index: number }) => {
      const creator = CREATORS_BY_ID[item.creatorId];
      if (!creator) return null;
      const isActive = item.id === currentId;
      return (
        <AudioReel
          post={item}
          creator={creator}
          height={pageHeight}
          topInset={headerInset}
          bottomInset={0}
          isActive={isActive}
          isPlaying={isActive && isPlaying}
          position={isActive ? position : 0}
          speed={speed}
          showSwipeHint={index === 0}
          onTogglePlay={handleTogglePlay}
          onSeek={seek}
          onToggleLike={toggleLike}
          onCycleSpeed={cycleSpeed}
        />
      );
    },
    [
      currentId,
      pageHeight,
      headerInset,
      isPlaying,
      position,
      speed,
      handleTogglePlay,
      seek,
      toggleLike,
      cycleSpeed,
    ],
  );

  return (
    <View className="bg-background flex-1" onLayout={handleLayout}>
      {pageHeight <= 0 ? null : isLoading ? (
        <ReelSkeleton height={pageHeight} topInset={headerInset} bottomInset={0} />
      ) : ordered.length === 0 ? (
        <View
          className="flex-1 items-center justify-center px-10"
          style={{ paddingTop: headerInset }}
        >
          <Radio color={PALETTE.muted} size={34} />
          <Typography type="body" weight="semibold" align="center" className="mt-4">
            Nothing to listen to yet
          </Typography>
          <Typography type="body-sm" color="muted" align="center" className="mt-1">
            Pull down to refresh, or record the first Blipp from the Upload tab.
          </Typography>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={ordered}
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
              onRefresh={() => void refresh()}
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
          {CATEGORIES.map((item) => {
            const isActive = item.value === category;
            return (
              <Chip
                key={item.value}
                size="sm"
                color="accent"
                variant={isActive ? 'primary' : 'tertiary'}
                onPress={() => void setCategory(item.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Chip.Label>{item.label}</Chip.Label>
              </Chip>
            );
          })}
        </View>
      </View>
    </View>
  );
}
