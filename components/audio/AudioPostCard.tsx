import { BadgeCheck, Headphones, Heart, MessageCircle, Pause, Play } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { PressableFeedback, Typography } from 'heroui-native';

import { CoverArt } from '@/components/audio/CoverArt';
import { EqualizerBars } from '@/components/audio/EqualizerBars';
import { Waveform } from '@/components/audio/Waveform';
import { formatCount, formatDuration, formatRelativeTime } from '@/lib/format';
import { PALETTE } from '@/lib/palette';
import type { AudioPost, Creator } from '@/lib/types';

interface AudioPostCardProps {
  post: AudioPost;
  creator: Creator;
  isCurrent: boolean;
  isPlaying: boolean;
  progress: number;
  onPress: () => void;
  onToggleLike: () => void;
}

function AudioPostCardComponent({
  post,
  creator,
  isCurrent,
  isPlaying,
  progress,
  onPress,
  onToggleLike,
}: AudioPostCardProps) {
  return (
    <PressableFeedback
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Play ${post.title} by ${creator.name}`}
      className={`bg-surface rounded-3xl border p-3.5 ${isCurrent ? 'border-accent' : 'border-border'}`}
    >
      <View className="flex-row gap-3.5">
        <CoverArt gradient={creator.gradient} size={76} radius={20}>
          {isCurrent && isPlaying ? (
            <EqualizerBars size={22} barClassName="bg-white" />
          ) : (
            <View className="h-9 w-9 items-center justify-center rounded-full bg-black/25">
              {isCurrent ? (
                <Pause color={PALETTE.onCover} size={18} fill={PALETTE.onCover} />
              ) : (
                <Play color={PALETTE.onCover} size={18} fill={PALETTE.onCover} />
              )}
            </View>
          )}
        </CoverArt>

        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Typography type="body-xs" weight="medium" numberOfLines={1} className="max-w-[60%]">
              {creator.name}
            </Typography>
            {creator.isVerified ? <BadgeCheck color={PALETTE.accent} size={13} /> : null}
            <Typography type="body-xs" color="muted">
              · {formatRelativeTime(post.createdAt)}
            </Typography>
          </View>

          <Typography type="body-sm" weight="semibold" className="mt-1" numberOfLines={2}>
            {post.title}
          </Typography>

          <View className="mt-2.5 flex-row items-center gap-2">
            <Waveform
              data={post.waveform}
              progress={isCurrent ? progress : 0}
              bars={24}
              height={26}
              barWidth={3}
              gap={2}
              className="flex-1"
              inactiveClassName={isCurrent ? 'bg-wave-track' : 'bg-surface-tertiary'}
            />
            <Typography type="body-xs" color="muted">
              {formatDuration(post.durationSec)}
            </Typography>
          </View>
        </View>
      </View>

      <View className="mt-3 flex-row items-center gap-4">
        <View className="flex-row items-center gap-1.5">
          <Headphones color={PALETTE.muted} size={14} />
          <Typography type="body-xs" color="muted">
            {formatCount(post.plays)}
          </Typography>
        </View>

        <Pressable
          onPress={onToggleLike}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={post.isLiked ? 'Remove like' : 'Like this audio'}
          className="flex-row items-center gap-1.5"
        >
          <Heart
            color={post.isLiked ? PALETTE.danger : PALETTE.muted}
            fill={post.isLiked ? PALETTE.danger : 'transparent'}
            size={14}
          />
          <Typography type="body-xs" className={post.isLiked ? 'text-danger' : 'text-muted'}>
            {formatCount(post.likes)}
          </Typography>
        </Pressable>

        <View className="flex-row items-center gap-1.5">
          <MessageCircle color={PALETTE.muted} size={14} />
          <Typography type="body-xs" color="muted">
            {formatCount(post.comments)}
          </Typography>
        </View>

        <View className="flex-1 flex-row justify-end gap-1.5">
          {post.tags.slice(0, 2).map((tag) => (
            <View key={tag} className="bg-surface-secondary rounded-full px-2 py-0.5">
              <Typography type="body-xs">#{tag}</Typography>
            </View>
          ))}
        </View>
      </View>
    </PressableFeedback>
  );
}

export const AudioPostCard = memo(AudioPostCardComponent);
