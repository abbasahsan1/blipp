import { BadgeCheck, ChevronUp, Headphones, Heart, MessageCircle, Play } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Slider, Typography } from 'heroui-native';

import { CoverArt } from '@/components/audio/CoverArt';
import { Waveform } from '@/components/audio/Waveform';
import { LinearGradient } from '@/components/ui/primitives/LinearGradient';
import { formatCount, formatDuration, formatRelativeTime } from '@/lib/format';
import { PALETTE } from '@/lib/palette';
import type { AudioPost, Creator } from '@/lib/types';

interface AudioReelProps {
  post: AudioPost;
  creator: Creator;
  /** Full page height for this reel, so one post fills the screen. */
  height: number;
  /** Space reserved for the floating feed header. */
  topInset: number;
  /** Space reserved for the bottom tab bar area. */
  bottomInset: number;
  /** True when this reel is the one snapped into view. */
  isActive: boolean;
  isPlaying: boolean;
  /** Playback position in seconds; only meaningful for the active reel. */
  position: number;
  speed: number;
  showSwipeHint: boolean;
  /** Handlers take the post id so the feed can pass stable references. */
  onTogglePlay: (postId: string) => void;
  onSeek: (position: number) => void;
  onToggleLike: (postId: string) => void;
  onCycleSpeed: () => void;
}

function AudioReelComponent({
  post,
  creator,
  height,
  topInset,
  bottomInset,
  isActive,
  isPlaying,
  position,
  speed,
  showSwipeHint,
  onTogglePlay,
  onSeek,
  onToggleLike,
  onCycleSpeed,
}: AudioReelProps) {
  const { width } = useWindowDimensions();

  const coverSize = Math.max(150, Math.min(width - 130, Math.round(height * 0.36)));
  const progress = post.durationSec > 0 ? Math.min(1, position / post.durationSec) : 0;
  const showPlayOverlay = !isActive || !isPlaying;

  const handleSliderChange = (value: number | number[]) => {
    onSeek(Array.isArray(value) ? value[0] : value);
  };

  return (
    <View style={{ height }} className="bg-background overflow-hidden">
      <LinearGradient
        colors={[`${creator.gradient[0]}33`, `${creator.gradient[1]}14`, PALETTE.background]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 0.85 }}
        style={StyleSheet.absoluteFillObject}
      />

      <Pressable
        onPress={() => onTogglePlay(post.id)}
        accessibilityRole="button"
        accessibilityLabel={isActive && isPlaying ? `Pause ${post.title}` : `Play ${post.title}`}
        className="flex-1 items-center justify-center"
        style={{ paddingTop: topInset }}
      >
        <CoverArt gradient={creator.gradient} size={coverSize} radius={Math.round(coverSize / 8)}>
          <View className="h-full w-full items-center justify-center bg-black/20">
            <Waveform
              data={post.waveform}
              progress={isActive ? progress : 0}
              bars={20}
              height={Math.round(coverSize * 0.42)}
              barWidth={5}
              gap={4}
              activeClassName="bg-white"
              inactiveClassName="bg-white/25"
            />
            {showPlayOverlay ? (
              <View className="absolute h-16 w-16 items-center justify-center rounded-full bg-black/45">
                <Play color={PALETTE.onCover} size={28} fill={PALETTE.onCover} />
              </View>
            ) : null}
          </View>
        </CoverArt>

        <Typography type="body-xs" color="muted" className="mt-4">
          {isActive && isPlaying ? 'Tap to pause' : 'Tap to play'}
        </Typography>
      </Pressable>

      <View className="px-5" style={{ paddingBottom: bottomInset + 14 }}>
        <View className="flex-row items-end gap-3">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <CoverArt gradient={creator.gradient} size={30} radius={15}>
                <Typography type="body-xs" weight="bold" className="text-white">
                  {creator.initials}
                </Typography>
              </CoverArt>
              <Typography
                type="body-sm"
                weight="semibold"
                numberOfLines={1}
                className="max-w-[55%]"
              >
                {creator.handle}
              </Typography>
              {creator.isVerified ? <BadgeCheck color={PALETTE.accent} size={14} /> : null}
              <Typography type="body-xs" color="muted">
                · {formatRelativeTime(post.createdAt)}
              </Typography>
            </View>

            <Typography type="body" weight="semibold" numberOfLines={2} className="mt-3">
              {post.title}
            </Typography>
            <Typography type="body-sm" color="muted" numberOfLines={2} className="mt-1">
              {post.description}
            </Typography>

            <View className="mt-2.5 flex-row flex-wrap gap-2">
              {post.tags.map((tag) => (
                <View key={tag} className="bg-surface-secondary/80 rounded-full px-2.5 py-0.5">
                  <Typography type="body-xs">#{tag}</Typography>
                </View>
              ))}
            </View>
          </View>

          <View className="w-14 items-center gap-4">
            <Pressable
              onPress={() => onToggleLike(post.id)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={post.isLiked ? 'Remove like' : 'Like this audio'}
              className="items-center gap-1"
            >
              <View className="bg-surface/70 h-11 w-11 items-center justify-center rounded-full">
                <Heart
                  color={post.isLiked ? PALETTE.danger : PALETTE.foreground}
                  fill={post.isLiked ? PALETTE.danger : 'transparent'}
                  size={20}
                />
              </View>
              <Typography type="body-xs" color="muted">
                {formatCount(post.likes)}
              </Typography>
            </Pressable>

            <View className="items-center gap-1">
              <View className="bg-surface/70 h-11 w-11 items-center justify-center rounded-full">
                <MessageCircle color={PALETTE.foreground} size={20} />
              </View>
              <Typography type="body-xs" color="muted">
                {formatCount(post.comments)}
              </Typography>
            </View>

            <View className="items-center gap-1">
              <View className="bg-surface/70 h-11 w-11 items-center justify-center rounded-full">
                <Headphones color={PALETTE.foreground} size={20} />
              </View>
              <Typography type="body-xs" color="muted">
                {formatCount(post.plays)}
              </Typography>
            </View>

            <Pressable
              onPress={onCycleSpeed}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Change playback speed"
              className="bg-surface/70 h-9 w-11 items-center justify-center rounded-full"
            >
              <Typography type="body-xs" weight="semibold">
                {speed}x
              </Typography>
            </Pressable>
          </View>
        </View>

        <View className="mt-4">
          <Slider
            value={Math.min(isActive ? position : 0, post.durationSec)}
            minValue={0}
            maxValue={Math.max(post.durationSec, 1)}
            step={1}
            onChange={handleSliderChange}
          >
            <Slider.Track className="bg-wave-track h-1">
              <Slider.Fill className="bg-accent" />
              <Slider.Thumb />
            </Slider.Track>
          </Slider>
          <View className="mt-2 flex-row justify-between">
            <Typography type="body-xs" color="muted">
              {formatDuration(isActive ? position : 0)}
            </Typography>
            <Typography type="body-xs" color="muted">
              -{formatDuration(Math.max(0, post.durationSec - (isActive ? position : 0)))}
            </Typography>
          </View>
        </View>

        {showSwipeHint ? (
          <View className="mt-2 flex-row items-center justify-center gap-1.5">
            <ChevronUp color={PALETTE.muted} size={14} />
            <Typography type="body-xs" color="muted">
              Swipe up for the next Blipp
            </Typography>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export const AudioReel = memo(AudioReelComponent);
