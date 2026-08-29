import { Headphones, Heart, Pause, Play, Trash2 } from 'lucide-react-native';
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
  /** Shown only where the viewer owns the post. */
  onDelete?: () => void;
  isDeleting?: boolean;
}

function AudioPostCardComponent({
  post,
  creator,
  isCurrent,
  isPlaying,
  progress,
  onPress,
  onToggleLike,
  onDelete,
  isDeleting,
}: AudioPostCardProps) {
  return (
    <PressableFeedback
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Play ${post.title} by ${creator.name}`}
      className={`bg-surface rounded-3xl border p-3.5 ${isCurrent ? 'border-accent' : 'border-border'}`}
      style={{ opacity: isDeleting ? 0.5 : 1 }}
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

        <View className="flex-1 flex-row items-center justify-end gap-2">
          <View className="bg-surface-tertiary rounded-full px-2 py-0.5">
            <Typography type="body-xs">{post.category}</Typography>
          </View>
          {onDelete ? (
            <Pressable
              onPress={onDelete}
              disabled={isDeleting}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${post.title}`}
              className="bg-surface-secondary h-8 w-8 items-center justify-center rounded-full"
            >
              <Trash2 color={PALETTE.danger} size={15} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </PressableFeedback>
  );
}

export const AudioPostCard = memo(AudioPostCardComponent);
