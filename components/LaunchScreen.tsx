import { View } from 'react-native';
import { FadeOut } from 'react-native-reanimated';
import { Typography } from 'heroui-native';

import { EqualizerBars } from '@/components/audio/EqualizerBars';
import { AnimatedView } from '@/components/ui/primitives/AnimatedView';
import { LinearGradient } from '@/components/ui/primitives/LinearGradient';

/** Branded launch screen shown while the first batch of data loads. */
export function LaunchScreen() {
  return (
    <AnimatedView
      exiting={FadeOut.duration(320)}
      className="bg-background absolute inset-0 items-center justify-center"
    >
      <LinearGradient
        colors={['#A855F7', '#22D3EE']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 96,
          height: 96,
          borderRadius: 30,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <EqualizerBars size={34} barClassName="bg-white w-[5px]" className="gap-1.5" />
      </LinearGradient>

      <Typography type="h1" className="mt-7">
        Blipp
      </Typography>
      <Typography type="body-sm" color="muted" align="center" className="mt-2 px-10">
        Short audio for eyes-off moments
      </Typography>

      <View className="absolute bottom-16 items-center">
        <View className="bg-surface-secondary h-1 w-28 overflow-hidden rounded-full">
          <View className="bg-accent h-full w-1/2" />
        </View>
        <Typography type="body-xs" color="muted" className="mt-3">
          Loading your feed…
        </Typography>
      </View>
    </AnimatedView>
  );
}
