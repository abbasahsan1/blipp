import { Check } from 'lucide-react-native';
import { useEffect } from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Typography } from 'heroui-native';

import { AnimatedView } from '@/components/ui/primitives/AnimatedView';
import { PALETTE } from '@/lib/palette';

interface UploadSuccessOverlayProps {
  title: string;
}

/** Brief confirmation shown after a successful post, before the feed opens. */
export function UploadSuccessOverlay({ title }: UploadSuccessOverlayProps) {
  const scale = useSharedValue(0.6);
  const fade = useSharedValue(0);
  const textFade = useSharedValue(0);

  useEffect(() => {
    fade.value = withTiming(1, { duration: 180 });
    scale.value = withSpring(1, { damping: 11, stiffness: 160 });
    textFade.value = withDelay(140, withTiming(1, { duration: 220 }));
  }, [fade, scale, textFade]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const textStyle = useAnimatedStyle(() => ({ opacity: textFade.value }));

  return (
    <AnimatedView
      className="bg-background absolute inset-0 items-center justify-center px-10"
      style={rootStyle}
      accessibilityLiveRegion="polite"
    >
      <AnimatedView
        className="bg-accent h-24 w-24 items-center justify-center rounded-full"
        style={badgeStyle}
      >
        <Check color={PALETTE.accentForeground} size={44} />
      </AnimatedView>
      <AnimatedView className="items-center" style={textStyle}>
        <Typography type="h4" align="center" className="mt-6">
          Posted
        </Typography>
        <Typography type="body-sm" color="muted" align="center" className="mt-1" numberOfLines={2}>
          “{title}” is live at the top of your feed.
        </Typography>
      </AnimatedView>
    </AnimatedView>
  );
}
