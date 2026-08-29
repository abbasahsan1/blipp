import { Image } from 'react-native';
import { Typography } from 'heroui-native';

import { CoverArt } from '@/components/audio/CoverArt';
import { PALETTE } from '@/lib/palette';

interface AvatarProps {
  initials: string;
  gradient: [string, string];
  /** Uploaded photo. When missing, the gradient initials are shown instead. */
  url?: string | null;
  size: number;
  /** Typography scale for the initials fallback. */
  textType?: 'body-xs' | 'body-sm' | 'body' | 'h5' | 'h4';
}

/** Profile picture with the app's gradient initials as its placeholder. */
export function Avatar({ initials, gradient, url, size, textType = 'body-sm' }: AvatarProps) {
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: PALETTE.surfaceSecondary,
        }}
      />
    );
  }

  return (
    <CoverArt gradient={gradient} size={size} radius={size / 2}>
      <Typography type={textType} weight="bold" style={{ color: PALETTE.onCover }}>
        {initials}
      </Typography>
    </CoverArt>
  );
}
