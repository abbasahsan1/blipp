import { Info, TriangleAlert } from 'lucide-react-native';
import { View } from 'react-native';
import { Typography } from 'heroui-native';

import { PALETTE } from '@/lib/palette';

interface AuthNoticeProps {
  message: string;
  variant?: 'error' | 'info';
}

/** Inline feedback for auth screens: never an alert, never a stack trace. */
export function AuthNotice({ message, variant = 'error' }: AuthNoticeProps) {
  const isError = variant === 'error';
  return (
    <View
      accessibilityRole="alert"
      className={
        isError
          ? 'border-danger/40 bg-danger/10 flex-row gap-2.5 rounded-2xl border p-3.5'
          : 'border-border bg-surface-secondary flex-row gap-2.5 rounded-2xl border p-3.5'
      }
    >
      {isError ? (
        <TriangleAlert color={PALETTE.danger} size={17} />
      ) : (
        <Info color={PALETTE.accent} size={17} />
      )}
      <Typography
        type="body-sm"
        className={isError ? 'text-danger flex-1' : 'flex-1'}
        color={isError ? undefined : 'muted'}
      >
        {message}
      </Typography>
    </View>
  );
}
