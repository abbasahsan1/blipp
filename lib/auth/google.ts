import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { bilt } from '@/lib/bilt';

export type GoogleOutcome =
  /** Web only: the browser is navigating to Google, nothing else to do. */
  | { kind: 'redirecting' }
  | { kind: 'cancelled' }
  | { kind: 'signed-in' }
  | { kind: 'failed'; error: unknown };

/**
 * Where Google sends the user back. On native this is the app's own scheme,
 * caught by the in-app browser; on web it is the app's address, which is
 * always allowed without registering a redirect URI.
 */
export function googleRedirectTo(): string {
  if (Platform.OS === 'web') {
    return typeof window === 'undefined' ? '' : window.location.origin;
  }
  return Linking.createURL('/auth/callback');
}

/** Reads both query and fragment parameters out of a callback URL. */
function paramsFrom(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const segment of url.split(/[?#]/).slice(1)) {
    for (const pair of segment.split('&')) {
      if (pair.length === 0) continue;
      const [key, value] = pair.split('=');
      if (key) params[decodeURIComponent(key)] = decodeURIComponent(value ?? '');
    }
  }
  return params;
}

export async function startGoogleSignIn(): Promise<GoogleOutcome> {
  const redirectTo = googleRedirectTo();

  const { data, error } = await bilt.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' },
  });

  if (error) return { kind: 'failed', error };
  // supabase-js drives the redirect itself on web.
  if (Platform.OS === 'web') return { kind: 'redirecting' };
  if (!data.url) return { kind: 'failed', error: new Error('Google sign-in could not start.') };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return { kind: 'cancelled' };

  const params = paramsFrom(result.url);
  if (params.error_description || params.error) {
    return { kind: 'failed', error: { message: params.error_description ?? params.error } };
  }

  if (params.code) {
    const exchanged = await bilt.auth.exchangeCodeForSession(params.code);
    if (exchanged.error) return { kind: 'failed', error: exchanged.error };
    return { kind: 'signed-in' };
  }

  if (params.access_token && params.refresh_token) {
    const restored = await bilt.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (restored.error) return { kind: 'failed', error: restored.error };
    return { kind: 'signed-in' };
  }

  return { kind: 'failed', error: new Error('Google did not return a sign-in token.') };
}
