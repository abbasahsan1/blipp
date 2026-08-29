import { AlertTriangle } from 'lucide-react-native';
import { View } from 'react-native';
import { Button, Surface, Typography } from 'heroui-native';

import { PALETTE } from '@/lib/palette';

interface UploadErrorBannerProps {
  message: string;
  actionLabel: string;
  onAction: () => void;
}

export function UploadErrorBanner({ message, actionLabel, onAction }: UploadErrorBannerProps) {
  return (
    <Surface
      variant="secondary"
      className="border-danger mt-4 rounded-2xl border p-4"
      accessibilityLiveRegion="polite"
    >
      <View className="flex-row gap-3">
        <AlertTriangle color={PALETTE.danger} size={20} />
        <View className="flex-1">
          <Typography type="body-sm" weight="semibold" className="text-danger">
            Something went wrong
          </Typography>
          <Typography type="body-sm" color="muted" className="mt-1">
            {message}
          </Typography>
        </View>
      </View>
      <Button size="sm" variant="tertiary" className="mt-3 self-start" onPress={onAction}>
        <Button.Label>{actionLabel}</Button.Label>
      </Button>
    </Surface>
  );
}
