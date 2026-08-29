/**
 * Browsers have no notification permission to ask for here: the web media
 * session is published by the audio element itself. react-native-web also does
 * not export `PermissionsAndroid`, so the native implementation must stay out
 * of the web bundle.
 */
export async function ensureMediaNotificationPermission(): Promise<boolean> {
  return true;
}
