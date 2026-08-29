import { Asset } from 'expo-asset';
import type { AudioLockScreenOptions, AudioMetadata, AudioPlayer } from 'expo-audio';

export { ensureMediaNotificationPermission } from '@/lib/audio/notificationPermission';

/**
 * Android media session / lock screen integration.
 *
 * expo-audio owns a Media3 `MediaSessionService`: handing it the active player
 * publishes a media notification (title, creator, artwork) and routes play,
 * pause and the two seek buttons back into that same player — including when
 * the command comes from the lock screen, the notification shade, a Bluetooth
 * headset or a car head unit.
 *
 * Everything here is best-effort by design. A device that refuses to start the
 * foreground service, or a platform without these methods, must not take the
 * in-app player down with it, so every call is guarded and the first failure
 * disables further attempts instead of retrying on every track.
 *
 * Known limits of the platform implementation, not of this file:
 * - The session exposes play/pause plus seek backward/forward. Next and
 *   previous track are not available, so hardware skip buttons do nothing.
 * - The seek buttons move by a fixed 10 seconds, independent of the in-app
 *   ±15s controls.
 */

/** Metadata shown on the lock screen and in the notification shade. */
export interface MediaSessionMetadata {
  /** Post title, shown as the notification title. */
  title: string;
  /** Creator name, shown as the notification text. */
  artist: string;
  /** Category, shown as the notification sub text. */
  albumTitle?: string;
  /** Absolute `http(s)` or `file` URL; other schemes are ignored natively. */
  artworkUrl?: string;
}

/** Only the lock screen surface of `AudioPlayer`, and only if the runtime has it. */
type LockScreenControls = {
  setActiveForLockScreen?: (
    active: boolean,
    metadata?: AudioMetadata,
    options?: AudioLockScreenOptions,
  ) => void;
  updateLockScreenMetadata?: (metadata: AudioMetadata) => void;
  clearLockScreenControls?: () => void;
};

const LOCK_SCREEN_OPTIONS: AudioLockScreenOptions = {
  showSeekBackward: true,
  showSeekForward: true,
};

/** Flipped by the first failure so a device without a session stops being asked. */
let sessionUnavailable = false;
let artworkRequest: Promise<string | undefined> | null = null;

function controls(player: AudioPlayer): LockScreenControls {
  return player;
}

function toAudioMetadata(metadata: MediaSessionMetadata): AudioMetadata {
  return {
    title: metadata.title,
    artist: metadata.artist,
    albumTitle: metadata.albumTitle,
    artworkUrl: metadata.artworkUrl,
  };
}

/**
 * Placeholder artwork for the notification, resolved to a URL the native side
 * can open: an `http` URL while bundling from Metro, a `file` URL once the
 * asset is unpacked in a release build.
 */
export async function resolveNotificationArtwork(): Promise<string | undefined> {
  artworkRequest ??= (async () => {
    try {
      const asset = Asset.fromModule(require('@/assets/images/notification-artwork.png'));
      if (!asset.localUri) await asset.downloadAsync();
      const uri = asset.localUri ?? asset.uri;
      // The Android service parses this with java.net.URL, which rejects the
      // `asset://` and bare resource names a release build can hand back.
      return uri && /^(https?|file):/.test(uri) ? uri : undefined;
    } catch {
      return undefined;
    }
  })();

  return artworkRequest;
}

/**
 * Publishes the notification and makes this player the one the lock screen and
 * hardware media buttons talk to.
 *
 * @returns whether the session took ownership; `false` means keep using the
 * in-app controls and don't bother updating metadata later.
 */
export function activateMediaSession(player: AudioPlayer, metadata: MediaSessionMetadata): boolean {
  if (sessionUnavailable) return false;

  const activate = controls(player).setActiveForLockScreen;
  if (typeof activate !== 'function') {
    sessionUnavailable = true;
    return false;
  }

  try {
    activate.call(player, true, toAudioMetadata(metadata), LOCK_SCREEN_OPTIONS);
    return true;
  } catch {
    sessionUnavailable = true;
    return false;
  }
}

/** Re-labels the existing notification when playback moves to another post. */
export function updateMediaSessionMetadata(
  player: AudioPlayer,
  metadata: MediaSessionMetadata,
): void {
  if (sessionUnavailable) return;

  try {
    controls(player).updateLockScreenMetadata?.(toAudioMetadata(metadata));
  } catch {
    sessionUnavailable = true;
  }
}

/** Drops the notification and releases the session. */
export function clearMediaSession(player: AudioPlayer): void {
  try {
    controls(player).clearLockScreenControls?.();
  } catch {
    sessionUnavailable = true;
  }
}
