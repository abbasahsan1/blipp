import { Stack } from 'expo-router';

import { PALETTE } from '@/lib/palette';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: PALETTE.background },
        headerStyle: { backgroundColor: PALETTE.background },
        headerTintColor: PALETTE.foreground,
        headerTitleStyle: {
          color: PALETTE.foreground,
          fontFamily: 'Inter_600SemiBold',
          fontSize: 18,
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="sign-in" options={{ title: 'Sign in' }} />
      <Stack.Screen name="sign-up" options={{ title: 'Create account' }} />
      <Stack.Screen name="verify" options={{ title: 'Confirm your email' }} />
      <Stack.Screen
        name="profile-setup"
        options={{ title: 'Set up your profile', headerBackVisible: false, gestureEnabled: false }}
      />
    </Stack>
  );
}
