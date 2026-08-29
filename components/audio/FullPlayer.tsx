import {
  ChevronDown,
  FastForward,
  Headphones,
  Heart,
  Pause,
  Play,
  Rewind,
  RotateCcw,
  SkipBack,
  SkipForward,
  Timer,
  TriangleAlert,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, type ReactNode } from 'react';
import { BackHandler, Pressable, ScrollView, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  runOnJS,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  Button,
  Chip,
  PressableFeedback,
  Separator,
  Slider,
  Spinner,
  Surface,
  Typography,
} from 'heroui-native';

import { CoverArt } from '@/components/audio/CoverArt';
import { Waveform } from '@/components/audio/Waveform';
import { AnimatedView } from '@/components/ui/primitives/AnimatedView';
import { formatCount, formatDuration, formatListenTime } from '@/lib/format';
import { PALETTE } from '@/lib/palette';
import type { AudioPost, Creator } from '@/lib/types';
import { cn, singleSliderValue } from '@/lib/utils';

interface FullPlayerProps {
  post: AudioPost;
  creator: Creator;
  isPlaying: boolean;
  isBuffering: boolean;
  /** Inline playback failure message, shown with a retry action. */
  error: string | null;
  position: number;
  /** Real duration once loaded, falling back to the post's reported length. */
  duration: number;
  speed: number;
  hasNext: boolean;
  hasPrevious: boolean;
  queue: AudioPost[];
  onCollapse: () => void;
  onClose: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onScrub: (position: number) => void;
  onScrubEnd: (position: number) => void;
  onSkipBy: (seconds: number) => void;
  onCycleSpeed: () => void;
  /** Omitted for listeners without an account: the heart then shows the count only. */
  onToggleLike?: () => void;
  onSelectQueueItem: (postId: string) => void;
  onRetry: () => void;
}

/** Distance and velocity at which a downward drag dismisses the player. */
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 850;
const SKIP_SECONDS = 15;

interface ControlButtonProps {
  onPress: () => void;
  label: string;
  isDisabled?: boolean;
  className?: string;
  children: ReactNode;
}

function ControlButton({ onPress, label, isDisabled, className, children }: ControlButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(isDisabled) }}
      className={cn('items-center justify-center', className)}
      style={{ opacity: isDisabled ? 0.3 : 1 }}
    >
      {children}
    </Pressable>
  );
}

export function FullPlayer({
  post,
  creator,
  isPlaying,
  isBuffering,
  error,
  position,
  duration,
  speed,
  hasNext,
  hasPrevious,
  queue,
  onCollapse,
  onClose,
  onTogglePlay,
  onNext,
  onPrevious,
  onScrub,
  onScrubEnd,
  onSkipBy,
  onCycleSpeed,
  onToggleLike,
  onSelectQueueItem,
  onRetry,
}: FullPlayerProps) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onCollapse();
      return true;
    });
    return () => subscription.remove();
  }, [onCollapse]);

  const dragY = useSharedValue(0);

  // Swipe down on the header area to collapse back to the mini player.
  const dragGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(6)
        .onUpdate((event) => {
          dragY.value = Math.max(0, event.translationY);
        })
        .onEnd((event) => {
          if (event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY) {
            dragY.value = 0;
            runOnJS(onCollapse)();
            return;
          }
          dragY.value = withSpring(0, { damping: 24, stiffness: 240 });
        }),
    [dragY, onCollapse],
  );

  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: dragY.value }] }));

  const total = duration > 0 ? duration : post.durationSec;
  const progress = total > 0 ? Math.min(1, position / total) : 0;

  return (
    <AnimatedView
      entering={SlideInDown.duration(300)}
      exiting={SlideOutDown.duration(220)}
      className="bg-background absolute inset-0"
    >
      {/* Plain Animated.View: the drag transform must not go through a class-name wrapper. */}
      <Animated.View style={[{ flex: 1 }, dragStyle]}>
        <GestureDetector gesture={dragGesture}>
          <View style={{ paddingTop: insets.top + 8 }}>
            <View className="items-center">
              <View className="bg-surface-tertiary h-1 w-10 rounded-full" />
            </View>
            <View className="mt-1.5 flex-row items-center justify-between px-4">
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
          </View>
        </GestureDetector>

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
                {isBuffering && !error ? (
                  <View className="absolute bottom-4">
                    <Spinner size="sm" />
                  </View>
                ) : null}
              </View>
            </CoverArt>
          </AnimatedView>

          <View className="mt-6 flex-row items-center gap-2">
            <Chip size="sm" variant="tertiary">
              <Chip.Label>{post.category}</Chip.Label>
            </Chip>
            <Typography type="body-xs" color="muted">
              {formatDuration(total)}
            </Typography>
          </View>

          <Typography type="h4" className="mt-3" numberOfLines={2}>
            {post.title}
          </Typography>
          <Typography type="body-sm" color="muted" className="mt-1">
            {creator.name} · {creator.handle}
          </Typography>
          <Typography type="body-sm" color="muted" className="mt-3">
            {post.description}
          </Typography>

          {error ? (
            <Surface className="border-danger mt-5 flex-row items-center gap-3 rounded-2xl border p-3.5">
              <TriangleAlert color={PALETTE.danger} size={20} />
              <View className="flex-1">
                <Typography type="body-sm" weight="semibold">
                  Can’t play this audio
                </Typography>
                <Typography type="body-xs" color="muted">
                  {error}
                </Typography>
              </View>
              <Button size="sm" variant="tertiary" onPress={onRetry}>
                <Button.Label>Retry</Button.Label>
              </Button>
            </Surface>
          ) : null}

          <View className="mt-6">
            <Slider
              value={Math.min(position, Math.max(total, 1))}
              minValue={0}
              maxValue={Math.max(total, 1)}
              step={1}
              isDisabled={Boolean(error)}
              onChange={(value) => onScrub(singleSliderValue(value))}
              onChangeEnd={(value) => onScrubEnd(singleSliderValue(value))}
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
                {formatDuration(total)}
              </Typography>
            </View>
          </View>

          <View className="mt-6 flex-row items-center justify-between">
            <ControlButton
              onPress={onPrevious}
              isDisabled={!hasPrevious}
              label="Previous post"
              className="h-12 w-12"
            >
              <SkipBack color={PALETTE.foreground} size={22} fill={PALETTE.foreground} />
            </ControlButton>

            <ControlButton
              onPress={() => onSkipBy(-SKIP_SECONDS)}
              isDisabled={Boolean(error)}
              label={`Skip back ${SKIP_SECONDS} seconds`}
              className="h-12 w-12"
            >
              <Rewind color={PALETTE.foreground} size={22} />
              <Typography type="body-xs" color="muted">
                {SKIP_SECONDS}
              </Typography>
            </ControlButton>

            <Pressable
              onPress={error ? onRetry : onTogglePlay}
              accessibilityRole="button"
              accessibilityLabel={error ? 'Retry playback' : isPlaying ? 'Pause' : 'Play'}
              className={cn(
                'h-16 w-16 items-center justify-center rounded-full',
                error ? 'bg-danger' : 'bg-accent',
              )}
            >
              {error ? (
                <RotateCcw color={PALETTE.onCover} size={26} />
              ) : isBuffering && isPlaying ? (
                <Spinner size="sm" />
              ) : isPlaying ? (
                <Pause color={PALETTE.accentForeground} size={26} fill={PALETTE.accentForeground} />
              ) : (
                <Play color={PALETTE.accentForeground} size={26} fill={PALETTE.accentForeground} />
              )}
            </Pressable>

            <ControlButton
              onPress={() => onSkipBy(SKIP_SECONDS)}
              isDisabled={Boolean(error)}
              label={`Skip forward ${SKIP_SECONDS} seconds`}
              className="h-12 w-12"
            >
              <FastForward color={PALETTE.foreground} size={22} />
              <Typography type="body-xs" color="muted">
                {SKIP_SECONDS}
              </Typography>
            </ControlButton>

            <ControlButton
              onPress={onNext}
              isDisabled={!hasNext}
              label="Next post"
              className="h-12 w-12"
            >
              <SkipForward color={PALETTE.foreground} size={22} fill={PALETTE.foreground} />
            </ControlButton>
          </View>

          <View className="mt-7 flex-row items-center gap-4">
            {onToggleLike ? (
              <Pressable
                onPress={onToggleLike}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={post.isLiked ? 'Remove like' : 'Like this audio'}
              >
                <Heart
                  color={post.isLiked ? PALETTE.danger : PALETTE.foreground}
                  fill={post.isLiked ? PALETTE.danger : 'transparent'}
                  size={20}
                />
              </Pressable>
            ) : (
              <Heart color={PALETTE.muted} size={20} />
            )}

            <View className="flex-row items-center gap-2">
              <Headphones color={PALETTE.muted} size={20} />
              <Typography type="body-sm" color="muted">
                {formatCount(post.plays)}
              </Typography>
            </View>

            <View className="flex-1 flex-row items-center gap-1.5">
              <Timer color={PALETTE.muted} size={16} />
              <Typography type="body-xs" color="muted" numberOfLines={1}>
                {formatListenTime(post.totalListenSeconds)}
              </Typography>
            </View>

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
                    key={item.id}
                    onPress={() => onSelectQueueItem(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Play ${item.title}`}
                    className="bg-surface border-border flex-row items-center gap-3 rounded-2xl border p-2.5"
                  >
                    <CoverArt gradient={item.creator.gradient} size={44} radius={14}>
                      <Play color={PALETTE.onCover} size={14} fill={PALETTE.onCover} />
                    </CoverArt>
                    <View className="flex-1">
                      <Typography type="body-sm" weight="medium" numberOfLines={1}>
                        {item.title}
                      </Typography>
                      <Typography type="body-xs" color="muted">
                        {item.creator.name} · {item.category} · {formatDuration(item.durationSec)}
                      </Typography>
                    </View>
                  </PressableFeedback>
                ))}
              </View>
            </View>
          ) : null}

          <Typography type="body-xs" color="muted" align="center" className="mt-7">
            Playback keeps running when the app is in the background or the screen is locked.
          </Typography>
        </ScrollView>
      </Animated.View>
    </AnimatedView>
  );
}
