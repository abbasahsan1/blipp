import { Radio, Upload, User } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Href } from 'expo-router';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { PlayerHost } from '@/components/audio/PlayerHost';
import { TAB_BAR_HEIGHT } from '@/lib/layout';
import { PALETTE } from '@/lib/palette';
import { useUploadStore } from '@/lib/store/uploadStore';

/**
 * Leaving the Upload tab with an unsaved draft or an upload in flight has to be
 * confirmed first, so the tab press is held back until the dialog is answered.
 */
function guardUploadDraft(href: Href) {
  return (event: { preventDefault: () => void }) => {
    if (useUploadStore.getState().requestLeave(href)) event.preventDefault();
  };
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View className="bg-background flex-1">
      {/* eslint-disable-next-line react/style-prop-object -- expo-status-bar's `style` prop is the bar theme enum ('light' | 'dark' | 'auto'), not a React Native style object */}
      <StatusBar style="light" backgroundColor={PALETTE.background} />
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: PALETTE.background },
          headerTintColor: PALETTE.foreground,
          headerTitleStyle: {
            color: PALETTE.foreground,
            fontFamily: 'Inter_600SemiBold',
            fontSize: 18,
          },
          headerShadowVisible: false,
          sceneStyle: { backgroundColor: PALETTE.background },
          tabBarStyle: {
            backgroundColor: PALETTE.background,
            borderTopColor: PALETTE.border,
            borderTopWidth: StyleSheet.hairlineWidth,
            height: TAB_BAR_HEIGHT + insets.bottom,
            paddingTop: 8,
            paddingBottom: insets.bottom + 8,
            elevation: 0,
            shadowColor: 'transparent',
            shadowOpacity: 0,
            shadowRadius: 0,
          },
          tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 12 },
          tabBarActiveTintColor: PALETTE.accent,
          tabBarInactiveTintColor: PALETTE.muted,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Feed',
            // The feed is a full-screen autoplay player, so it runs without a header.
            headerShown: false,
            tabBarIcon: ({ color, size }) => <Radio color={color} size={size ?? 24} />,
          }}
          listeners={{ tabPress: guardUploadDraft('/') }}
        />
        <Tabs.Screen
          name="upload"
          options={{
            title: 'Upload',
            headerTitle: 'New audio',
            tabBarIcon: ({ color, size }) => <Upload color={color} size={size ?? 24} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            headerTitle: 'Profile',
            tabBarIcon: ({ color, size }) => <User color={color} size={size ?? 24} />,
          }}
          listeners={{ tabPress: guardUploadDraft('/profile') }}
        />
      </Tabs>
      <PlayerHost />
    </View>
  );
}
