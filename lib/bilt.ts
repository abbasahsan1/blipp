import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { asyncStorage, createClient } from '@biltme/backend';

const url = process.env.EXPO_PUBLIC_BILT_URL;
const anonKey = process.env.EXPO_PUBLIC_BILT_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Backend is not configured: EXPO_PUBLIC_BILT_URL / EXPO_PUBLIC_BILT_ANON_KEY missing.',
  );
}

/**
 * Single backend client for the app.
 *
 * The session is persisted through AsyncStorage (localStorage on web), so a
 * signed-in user stays signed in across app restarts. `detectSessionInUrl` is
 * only meaningful on web, where the Google redirect comes back with a code in
 * the address bar.
 */
export const bilt = createClient(url, anonKey, {
  auth: {
    storage: asyncStorage(AsyncStorage),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
});
