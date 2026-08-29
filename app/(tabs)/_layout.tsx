import { Mic, Radio, User } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { PlayerHost } from '@/components/audio/PlayerHost';
import { TAB_BAR_HEIGHT } from '@/lib/layout';
import { PALETTE } from '@/lib/palette';

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
        />
        <Tabs.Screen
          name="upload"
          options={{
            title: 'Upload',
            headerTitle: 'New audio',
            tabBarIcon: ({ color, size }) => <Mic color={color} size={size ?? 24} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            headerTitle: 'Profile',
            tabBarIcon: ({ color, size }) => <User color={color} size={size ?? 24} />,
          }}
        />
      </Tabs>
      <PlayerHost />
    </View>
  );
}
