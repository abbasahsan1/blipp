import { PermissionsAndroid, Platform } from 'react-native';

/** Asked at most once per launch; a refusal is remembered, not retried. */
let request: Promise<boolean> | null = null;

/**
 * Android 13+ hides notifications — a foreground service's own notification
 * included — until the user grants `POST_NOTIFICATIONS`. The media session
 * still runs without it, it just has nothing visible in the shade, so a denial
 * is not treated as a failure.
 */
export async function ensureMediaNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  if (typeof Platform.Version === 'number' && Platform.Version < 33) return true;

  request ??= (async () => {
    try {
      const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
      if (await PermissionsAndroid.check(permission)) return true;
      const result = await PermissionsAndroid.request(permission);
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  })();

  return request;
}
