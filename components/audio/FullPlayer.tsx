import {
  ChevronDown,
  Heart,
  MessageCircle,
  Pause,
  Play,
  Rewind,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react-native';
import { useEffect } from 'react';
import { BackHandler, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { PressableFeedback, Separator, Slider, Typography } from 'heroui-native';

import { CoverArt } from '@/components/audio/CoverArt';
import { Waveform } from '@/components/audio/Waveform';
import { AnimatedView } from '@/components/ui/primitives/AnimatedView';
import { formatCount, formatDuration } from '@/lib/format';
import { PALETTE } from '@/lib/palette';
import type { AudioPost, Creator } from '@/lib/types';

export interface QueueEntry {
  post: AudioPost;
  creator: Creator;
}

interface FullPlayerProps {
  post: AudioPost;
  creator: Creator;
  isPlaying: boolean;
  position: number;
  speed: number;
  queue: QueueEntry[];
  onCollapse: () => void;
  onClose: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (position: number) => void;
  onSkipBy: (seconds: number) => void;
  onCycleSpeed: () => void;
  onToggleLike: () => void;
  onSelectQueueItem: (postId: string) => void;
}

export function FullPlayer({
  post,
  creator,
  isPlaying,
  position,
  speed,
  queue,
  onCollapse,
  onClose,
  onTogglePlay,
  onNext,
  onPrevious,
  onSeek,
  onSkipBy,
  onCycleSpeed,
  onToggleLike,
  onSelectQueueItem,
}: FullPlayerProps) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onCollapse();
      return true;
    });
    return () => subscription.remove();
  }, [onCollapse]);

  const progress = post.durationSec > 0 ? position / post.durationSec : 0;

  const handleSliderChange = (value: number | number[]) => {
    onSeek(Array.isArray(value) ? value[0] : value);
  };

  return (
    <AnimatedView
      entering={SlideInDown.duration(280)}
      exiting={SlideOutDown.duration(220)}
      className="bg-background absolute inset-0"
    >
      <View
        className="flex-row items-center justify-between px-4"
        style={{ paddingTop: insets.top + 8, paddingBottom: 4 }}
      >
        <Pressable
          onPress={onCollapse}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Minimize player"
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <ChevronDown color={PALETTE.foreground} size={24} />
        </Pressable>
        <Typography type="body-xs" color="muted">
          NOW PLAYING
        </Typography>
        <Pressable
          onPress={onClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Close player"
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <X color={PALETTE.muted} size={20} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 28 }}
        showsVerticalScrollIndicator={false}
      >
        <AnimatedView entering={FadeIn.delay(60)} className="mt-2 items-center">
          <CoverArt gradient={creator.gradient} size={240} radius={32}>
            <View className="h-full w-full items-center justify-center bg-black/15">
              <Waveform
                data={post.waveform}
                progress={progress}
                bars={22}
                height={96}
                barWidth={5}
                gap={4}
                activeClassName="bg-white"
                inactiveClassName="bg-white/30"
              />
            </View>
          </CoverArt>
        </AnimatedView>

        <Typography type="h4" className="mt-6" numberOfLines={2}>
          {post.title}
        </Typography>
        <Typography type="body-sm" color="muted" className="mt-1">
          {creator.name} · {creator.handle}
        </Typography>
        <Typography type="body-sm" color="muted" className="mt-3">
          {post.description}
        </Typography>

        <View className="mt-4 flex-row flex-wrap gap-2">
          {post.tags.map((tag) => (
            <View key={tag} className="bg-surface-secondary rounded-full px-3 py-1">
              <Typography type="body-xs">#{tag}</Typography>
            </View>
          ))}
        </View>

        <View className="mt-6">
          <Slider
            value={Math.min(position, post.durationSec)}
            minValue={0}
            maxValue={Math.max(post.durationSec, 1)}
            step={1}
            onChange={handleSliderChange}
          >
            <Slider.Track className="bg-wave-track h-1.5">
              <Slider.Fill className="bg-accent" />
              <Slider.Thumb />
            </Slider.Track>
          </Slider>
          <View className="mt-2.5 flex-row justify-between">
            <Typography type="body-xs" color="muted">
              {formatDuration(position)}
            </Typography>
            <Typography type="body-xs" color="muted">
              -{formatDuration(Math.max(0, post.durationSec - position))}
            </Typography>
          </View>
        </View>

        <View className="mt-5 flex-row items-center justify-between">
          <Pressable
            onPress={onCycleSpeed}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Change playback speed"
            className="bg-surface-secondary h-10 w-12 items-center justify-center rounded-full"
          >
            <Typography type="body-xs" weight="semibold">
              {speed}x
            </Typography>
          </Pressable>

          <Pressable
            onPress={() => onSkipBy(-15)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Rewind 15 seconds"
            className="h-12 w-12 items-center justify-center"
          >
            <Rewind color={PALETTE.foreground} size={24} />
          </Pressable>

          <Pressable
            onPress={onPrevious}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Previous audio"
            className="h-12 w-12 items-center justify-center"
          >
            <SkipBack color={PALETTE.foreground} size={22} fill={PALETTE.foreground} />
          </Pressable>

          <Pressable
            onPress={onTogglePlay}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            className="bg-accent h-16 w-16 items-center justify-center rounded-full"
          >
            {isPlaying ? (
              <Pause color={PALETTE.accentForeground} size={26} fill={PALETTE.accentForeground} />
            ) : (
              <Play color={PALETTE.accentForeground} size={26} fill={PALETTE.accentForeground} />
            )}
          </Pressable>

          <Pressable
            onPress={onNext}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Next audio"
            className="h-12 w-12 items-center justify-center"
          >
            <SkipForward color={PALETTE.foreground} size={22} fill={PALETTE.foreground} />
          </Pressable>
        </View>

        <View className="mt-6 flex-row items-center gap-6">
          <Pressable
            onPress={onToggleLike}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={post.isLiked ? 'Remove like' : 'Like this audio'}
            className="flex-row items-center gap-2"
          >
            <Heart
              color={post.isLiked ? PALETTE.danger : PALETTE.foreground}
              fill={post.isLiked ? PALETTE.danger : 'transparent'}
              size={20}
            />
            <Typography type="body-sm" className={post.isLiked ? 'text-danger' : 'text-foreground'}>
              {formatCount(post.likes)}
            </Typography>
          </Pressable>

          <View className="flex-row items-center gap-2">
            <MessageCircle color={PALETTE.muted} size={20} />
            <Typography type="body-sm" color="muted">
              {formatCount(post.comments)}
            </Typography>
          </View>
        </View>

        {queue.length > 0 ? (
          <View className="mt-7">
            <Separator />
            <Typography type="body-xs" color="muted" className="mt-5">
              UP NEXT
            </Typography>
            <View className="mt-3 gap-2">
              {queue.map((item) => (
                <PressableFeedback
                  key={item.post.id}
                  onPress={() => onSelectQueueItem(item.post.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Play ${item.post.title}`}
                  className="bg-surface border-border flex-row items-center gap-3 rounded-2xl border p-2.5"
                >
                  <CoverArt gradient={item.creator.gradient} size={44} radius={14}>
                    <Play color={PALETTE.onCover} size={14} fill={PALETTE.onCover} />
                  </CoverArt>
                  <View className="flex-1">
                    <Typography type="body-sm" weight="medium" numberOfLines={1}>
                      {item.post.title}
                    </Typography>
                    <Typography type="body-xs" color="muted">
                      {item.creator.name} · {formatDuration(item.post.durationSec)}
                    </Typography>
                  </View>
                </PressableFeedback>
              ))}
            </View>
          </View>
        ) : null}

        <Typography type="body-xs" color="muted" align="center" className="mt-7">
          Playback is simulated with placeholder audio for now.
        </Typography>
      </ScrollView>
    </AnimatedView>
  );
}
