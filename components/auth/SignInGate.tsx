import { LogIn, UserPlus } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Typography } from 'heroui-native';

import { PALETTE } from '@/lib/palette';

interface SignInGateProps {
  /** 'needs-profile' = signed in already, profile step unfinished. */
  variant: 'signed-out' | 'needs-profile';
  title: string;
  message: string;
  icon?: ReactNode;
}

/**
 * Shown instead of a signed-in-only screen. Browsing and listening stay open to
 * everyone, so this only ever replaces screens that write data.
 */
export function SignInGate({ variant, title, message, icon }: SignInGateProps) {
  const needsProfile = variant === 'needs-profile';

  return (
    <View className="bg-background flex-1 items-center justify-center px-8">
      <View className="bg-surface-secondary h-16 w-16 items-center justify-center rounded-full">
        {icon ?? <LogIn color={PALETTE.muted} size={26} />}
      </View>

      <Typography type="h4" align="center" className="mt-5">
        {title}
      </Typography>
      <Typography type="body-sm" color="muted" align="center" className="mt-2">
        {message}
      </Typography>

      {needsProfile ? (
        <Button
          size="lg"
          className="mt-6 w-full"
          onPress={() => router.push('/auth/profile-setup')}
        >
          <Button.Label>
            <Typography type="body" weight="semibold" style={{ color: PALETTE.accentForeground }}>
              Finish your profile
            </Typography>
          </Button.Label>
        </Button>
      ) : (
        <View className="mt-6 w-full gap-3">
          <Button size="lg" onPress={() => router.push('/auth/sign-in')}>
            <Button.Label>
              <View className="flex-row items-center gap-2">
                <LogIn color={PALETTE.accentForeground} size={18} />
                <Typography
                  type="body"
                  weight="semibold"
                  style={{ color: PALETTE.accentForeground }}
                >
                  Sign in
                </Typography>
              </View>
            </Button.Label>
          </Button>
          <Button size="lg" variant="tertiary" onPress={() => router.push('/auth/sign-up')}>
            <Button.Label>
              <View className="flex-row items-center gap-2">
                <UserPlus color={PALETTE.foreground} size={18} />
                <Typography type="body" weight="semibold">
                  Create an account
                </Typography>
              </View>
            </Button.Label>
          </Button>
        </View>
      )}
    </View>
  );
}
