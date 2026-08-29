import type { ConfigContext, ExpoConfig } from '@expo/config';

type ExpoPlugins = NonNullable<ExpoConfig['plugins']>;

export default ({ config }: ConfigContext): ExpoConfig => {
  const nativePlugins: ExpoPlugins =
    process.env.EXPO_PLATFORM === 'native'
      ? [['expo-dev-client', { launchMode: 'most-recent' }]]
      : [];

  return {
    ...config,
    name: 'Blipp',
    slug: 'blipp',
    newArchEnabled: true,
    version: process.env.BILT_APP_VERSION ?? '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    scheme: 'blipp',
    backgroundColor: '#131217',
    runtimeVersion: {
      policy: 'appVersion',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        // Background listening is the point of the app. The expo-audio plugin
        // only adds this mode for background *recording*, so it is set here.
        UIBackgroundModes: ['audio'],
      },
      supportsTablet: true,
      bundleIdentifier: process.env.BILT_IOS_BUNDLE_ID ?? 'com.yourcompany.yourapp',
    },
    android: {
      package: process.env.BILT_ANDROID_PACKAGE ?? 'com.yourcompany.yourapp',
      // Android 13+ hides the media notification, foreground service included,
      // until the user grants this. expo-audio ships the FOREGROUND_SERVICE and
      // FOREGROUND_SERVICE_MEDIA_PLAYBACK permissions in its own manifest.
      permissions: ['android.permission.POST_NOTIFICATIONS'],
    },
    web: {
      bundler: 'metro',
      // 'single' = SPA export: one index.html + client routing, so edge serving
      // needs only a single 404→index.html fallback rule.
      output: 'single',
      favicon: './public/icons/icon-192.png',
    },
    extra: {
      appStoreAppId: process.env.BILT_APP_STORE_APP_ID,
    },
    plugins: [
      'expo-router',
      'expo-font',
      // Background playback and the lock screen notification come from the
      // audio mode plus the media session in lib/audio; expo-audio ships the
      // Media3 service and its permissions in its own manifest. The plugin
      // itself only governs microphone/recording permissions.
      [
        'expo-audio',
        {
          // Blipp only plays audio for now; recording is still mocked.
          recordAudioAndroid: false,
          microphonePermission: false,
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'Blipp uses your photos so you can set a profile picture.',
          cameraPermission: false,
        },
      ],
      // Google sign-in opens in an in-app browser session.
      'expo-web-browser',
      ...nativePlugins,
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  };
};
