import type { ReactNode } from 'react';

import { LinearGradient } from '@/components/ui/primitives/LinearGradient';

interface CoverArtProps {
  gradient: [string, string];
  size: number;
  radius?: number;
  children?: ReactNode;
}

/** Gradient tile used as cover art stand-in for audio posts. */
export function CoverArt({ gradient, size, radius = 18, children }: CoverArtProps) {
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {children}
    </LinearGradient>
  );
}
