import { ChevronUp, Pause, Play, SkipForward } from 'lucide-react-native';
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
  progress: number;
  bottom: number;
  onExpand: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
}

export function MiniPlayer({
  post,
  creator,
  isPlaying,
  progress,
  bottom,
  onExpand,
  onTogglePlay,
  onNext,
}: MiniPlayerProps) {
  const percent: `${number}%` = `${Math.min(100, Math.max(0, progress * 100))}%`;

  return (
    <AnimatedView
      entering={FadeInDown.duration(240)}
      exiting={FadeOutDown.duration(180)}
      className="absolute"
      style={{ left: MINI_PLAYER_GAP, right: MINI_PLAYER_GAP, bottom }}
    >
      <PressableFeedback
        onPress={onExpand}
        accessibilityRole="button"
        accessibilityLabel={`Open player for ${post.title}`}
        className="bg-surface-secondary border-border overflow-hidden rounded-2xl border"
        style={{ height: MINI_PLAYER_HEIGHT }}
      >
        <View className="bg-wave-track h-[2px] w-full">
          <View className="bg-accent h-full" style={{ width: percent }} />
        </View>

        <View className="flex-1 flex-row items-center gap-2.5 px-2.5">
          <CoverArt gradient={creator.gradient} size={40} radius={12}>
            {isPlaying ? (
              <EqualizerBars size={14} barClassName="bg-white" />
            ) : (
              <Play color={PALETTE.onCover} size={14} fill={PALETTE.onCover} />
            )}
          </CoverArt>

          <View className="flex-1">
            <Typography type="body-sm" weight="medium" numberOfLines={1}>
              {post.title}
            </Typography>
            <Typography type="body-xs" color="muted" numberOfLines={1}>
              {creator.name}
            </Typography>
          </View>

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

          <Pressable
            onPress={onNext}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Next audio"
            className="h-10 w-8 items-center justify-center"
          >
            <SkipForward color={PALETTE.foreground} size={18} fill={PALETTE.foreground} />
          </Pressable>

          <ChevronUp color={PALETTE.muted} size={16} />
        </View>
      </PressableFeedback>
    </AnimatedView>
  );
}
