import { useEffect } from 'react';
import { View } from 'react-native';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Button, Surface, Typography } from 'heroui-native';

import { AnimatedView } from '@/components/ui/primitives/AnimatedView';

interface UploadProgressCardProps {
  /** 0..1 */
  progress: number;
  /** What the upload is doing right now. */
  label: string;
  fileName: string;
  onCancel: () => void;
}

export function UploadProgressCard({
  progress,
  label,
  fileName,
  onCancel,
}: UploadProgressCardProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  const width = useSharedValue(clamped);

  useEffect(() => {
    width.value = withTiming(clamped, { duration: 220 });
  }, [clamped, width]);

  const barStyle = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));

  return (
    <Surface variant="secondary" className="mt-4 rounded-2xl p-4">
      <View className="flex-row items-center justify-between">
        <Typography type="body-sm" weight="semibold">
          {label}
        </Typography>
        <Typography type="body-sm" weight="semibold" className="text-accent">
          {Math.round(clamped * 100)}%
        </Typography>
      </View>

      <View className="bg-wave-track mt-3 h-2 overflow-hidden rounded-full">
        <AnimatedView className="bg-accent h-full rounded-full" style={barStyle} />
      </View>

      <View className="mt-3 flex-row items-center justify-between gap-3">
        <Typography type="body-xs" color="muted" numberOfLines={1} className="flex-1">
          {fileName}
        </Typography>
        <Button size="sm" variant="ghost" onPress={onCancel}>
          <Button.Label>Cancel</Button.Label>
        </Button>
      </View>
    </Surface>
  );
}
