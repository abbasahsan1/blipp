import { useEffect } from 'react';
import { View } from 'react-native';
import {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AnimatedView } from '@/components/ui/primitives/AnimatedView';
import { cn } from '@/lib/utils';

interface EqualizerBarsProps {
  size?: number;
  barClassName?: string;
  className?: string;
}

interface BarProps {
  delay: number;
  height: number;
  barClassName?: string;
}

function Bar({ delay, height, barClassName }: BarProps) {
  const scale = useSharedValue(0.35);

  useEffect(() => {
    scale.value = withDelay(delay, withRepeat(withTiming(1, { duration: 460 }), -1, true));
  }, [delay, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: scale.value }] }));

  return (
    <AnimatedView
      className={cn('bg-accent-foreground w-[3px] rounded-full', barClassName)}
      style={[{ height }, animatedStyle]}
    />
  );
}

/** Three animated bars that stand in for a live audio meter. */
export function EqualizerBars({ size = 18, barClassName, className }: EqualizerBarsProps) {
  return (
    <View className={cn('flex-row items-center gap-[3px]', className)} style={{ height: size }}>
      <Bar delay={0} height={size} barClassName={barClassName} />
      <Bar delay={160} height={size} barClassName={barClassName} />
      <Bar delay={320} height={size} barClassName={barClassName} />
    </View>
  );
}
