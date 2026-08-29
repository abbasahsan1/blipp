import { ChevronUp, Pause, Play, RotateCcw, TriangleAlert } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { PressableFeedback, Typography } from 'heroui-native';

import { CoverArt } from '@/components/audio/CoverArt';
import { EqualizerBars } from '@/components/audio/EqualizerBars';
import { AnimatedView } from '@/components/ui/primitives/AnimatedView';
import { MINI_PLAYER_GAP, MINI_PLAYER_HEIGHT } from '@/lib/layout';
import { PALETTE } from '@/lib/palette';
import type { AudioPost, Creator } from '@/lib/types';

interface MiniPlayerProps {
  post: AudioPost;
  creator: Creator;
  isPlaying: boolean;
  isBuffering: boolean;
  /** Inline playback failure; the primary button becomes a retry control. */
  error: string | null;
  progress: number;
  bottom: number;
  onExpand: () => void;
  onTogglePlay: () => void;
  onRetry: () => void;
}

export function MiniPlayer({
  post,
  creator,
  isPlaying,
  isBuffering,
  error,
  progress,
  bottom,
  onExpand,
  onTogglePlay,
  onRetry,
}: MiniPlayerProps) {
  const percent: `${number}%` = `${Math.min(100, Math.max(0, progress * 100))}%`;

  const subtitle = error
    ? 'Playback failed — tap retry'
    : isBuffering && isPlaying
      ? 'Buffering…'
      : creator.name;

  return (
    <AnimatedView
      entering={FadeInDown.duration(240)}
      exiting={FadeOutDown.duration(180)}
      className="absolute"
      style={{ left: MINI_PLAYER_GAP, right: MINI_PLAYER_GAP, bottom }}
    >
      {/* Tapping the bar itself opens the expanded player; the button stops the press. */}
      <PressableFeedback
        onPress={onExpand}
        accessibilityRole="button"
        accessibilityLabel={`Open full player for ${post.title}`}
        className="bg-surface-secondary border-border overflow-hidden rounded-2xl border"
        style={{ height: MINI_PLAYER_HEIGHT }}
      >
        <View className="bg-wave-track h-[2px] w-full">
          <View
            className={error ? 'bg-danger h-full' : 'bg-accent h-full'}
            style={{ width: percent }}
          />
        </View>

        <View className="flex-1 flex-row items-center gap-2.5 px-2.5">
          <CoverArt gradient={creator.gradient} size={40} radius={12}>
            {error ? (
              <TriangleAlert color={PALETTE.onCover} size={16} />
            ) : isPlaying ? (
              <EqualizerBars size={14} barClassName="bg-white" />
            ) : (
              <Play color={PALETTE.onCover} size={14} fill={PALETTE.onCover} />
            )}
          </CoverArt>

          <View className="flex-1">
            <Typography type="body-sm" weight="medium" numberOfLines={1}>
              {post.title}
            </Typography>
            <Typography
              type="body-xs"
              color={error ? undefined : 'muted'}
              className={error ? 'text-danger' : undefined}
              numberOfLines={1}
            >
              {subtitle}
            </Typography>
          </View>

          {error ? (
            <Pressable
              onPress={onRetry}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Retry playback"
              className="bg-danger h-10 w-10 items-center justify-center rounded-full"
            >
              <RotateCcw color={PALETTE.onCover} size={18} />
            </Pressable>
          ) : (
            <Pressable
              onPress={onTogglePlay}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
              className="bg-accent h-10 w-10 items-center justify-center rounded-full"
            >
              {isPlaying ? (
                <Pause color={PALETTE.accentForeground} size={18} fill={PALETTE.accentForeground} />
              ) : (
                <Play color={PALETTE.accentForeground} size={18} fill={PALETTE.accentForeground} />
              )}
            </Pressable>
          )}

          <ChevronUp color={PALETTE.muted} size={16} />
        </View>
      </PressableFeedback>
    </AnimatedView>
  );
}
