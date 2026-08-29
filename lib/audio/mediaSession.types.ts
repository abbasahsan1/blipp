/**
 * Shapes shared by the two media session implementations: Android/iOS in
 * `mediaSession.ts` (expo-audio's Media3 / MPRemoteCommandCenter session) and
 * the browser in `mediaSession.web.ts` (`navigator.mediaSession`).
 */

/** Metadata shown on the lock screen, in the notification shade or on a car display. */
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

/**
 * What an outside control surface may ask the app to do.
 *
 * Only the web session needs these: a browser hands each button press back to
 * JavaScript, so every command has to be routed through the player store or the
 * in-app UI would drift out of sync. The native session is wired straight to the
 * player by expo-audio, which is why the native implementation ignores them.
 */
export interface MediaSessionCommands {
  play: () => void;
  pause: () => void;
  stop: () => void;
  next: () => void;
  previous: () => void;
  /** Relative jump in seconds; negative values go back. */
  seekBy: (seconds: number) => void;
  seekTo: (seconds: number) => void;
}

/** Playback snapshot the session's progress bar and buttons are built from. */
export interface MediaSessionPlayback {
  isPlaying: boolean;
  /** Seconds, may be NaN before a source loads — implementations sanitise it. */
  position: number;
  /** Seconds, 0 or NaN until the real file reports its length. */
  duration: number;
  speed: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
