import type { AudioPlayer } from 'expo-audio';

import type {
  MediaSessionCommands,
  MediaSessionMetadata,
  MediaSessionPlayback,
} from '@/lib/audio/mediaSession.types';
import { finiteSeconds } from '@/lib/utils';

export { ensureMediaNotificationPermission } from '@/lib/audio/notificationPermission';

/**
 * Browser media session integration — the web counterpart of the Media3 session
 * in `mediaSession.ts`.
 *
 * A page that plays an `<audio>` element gets no now-playing card of its own:
 * Chrome on Android, an installed PWA and Safari all publish one only once the
 * page has filled in `navigator.mediaSession`. That means metadata (what is
 * playing), a playback state (playing or paused), a position state (so the card
 * shows a real progress bar) and one handler per button. Without handlers the
 * buttons are absent; with them the browser hands each press back here, so every
 * command is routed through the player store and the in-app UI stays in step.
 *
 * Everything is best-effort: a browser missing the API, or one that rejects an
 * action it doesn't know, must not disturb in-app playback.
 *
 * Known limits, all from the platform rather than this file:
 * - Chrome ignores the position state until the audio reports a real duration,
 *   so the card briefly shows no progress bar while a clip loads.
 * - iOS Safari shows title, artist and artwork but not the sub text.
 */

/** The app icons, already sized for a notification, stand in for cover art. */
const ARTWORK: { path: string; sizes: string }[] = [
  { path: '/icons/icon-192.png', sizes: '192x192' },
  { path: '/icons/icon-512.png', sizes: '512x512' },
];

/** Matches the in-app ±15s controls, when the browser doesn't name an offset. */
const SEEK_OFFSET_SECONDS = 15;
/** Rewriting the position state on every 250ms status tick is wasted work. */
const POSITION_STEP_SECONDS = 1;

/** Commands the browser's buttons are currently routed to. */
let activeCommands: MediaSessionCommands | null = null;
/**
 * Whether this session is the one on screen. Kept separate from the commands
 * above so a caller that passes none still gets metadata and progress updates.
 */
let isActive = false;
/** Re-applied when a browser drops the metadata between audio elements. */
let activeMetadata: MediaSessionMetadata | null = null;
let publishedState: MediaSessionPlaybackState = 'none';
let publishedPosition: number | null = null;
let publishedDuration = 0;
let publishedRate = 1;
let publishedHasNext = false;
let publishedHasPrevious = false;
let publishedSeekButtons = false;

function session(): MediaSession | null {
  if (typeof navigator === 'undefined') return null;
  const candidate: { mediaSession?: MediaSession } = navigator;
  return candidate.mediaSession ?? null;
}

function absoluteUrl(path: string): string {
  if (typeof window === 'undefined') return path;
  try {
    return new URL(path, window.location.origin).href;
  } catch {
    return path;
  }
}

function artwork(): MediaImage[] {
  return ARTWORK.map(({ path, sizes }) => ({
    src: absoluteUrl(path),
    sizes,
    type: 'image/png',
  }));
}

/** An unknown action throws instead of being ignored, so each one is guarded. */
function setHandler(
  media: MediaSession,
  action: MediaSessionAction,
  handler: MediaSessionActionHandler | null,
): void {
  try {
    media.setActionHandler(action, handler);
  } catch {
    // This browser doesn't know the action; its button simply won't appear.
  }
}

function applyMetadata(media: MediaSession, metadata: MediaSessionMetadata): void {
  activeMetadata = metadata;
  if (typeof MediaMetadata === 'undefined') return;
  try {
    media.metadata = new MediaMetadata({
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.albumTitle,
      artwork: artwork(),
    });
  } catch {
    // Metadata is decoration; the transport buttons matter more.
  }
}

/**
 * Buttons that are meaningful whatever the queue looks like.
 *
 * `seekto` is deliberately here rather than with the skip pair below: it backs
 * dragging the card's progress bar and adds no button of its own.
 */
function bindTransportHandlers(media: MediaSession): void {
  setHandler(media, 'play', () => activeCommands?.play());
  setHandler(media, 'pause', () => activeCommands?.pause());
  setHandler(media, 'stop', () => activeCommands?.stop());
  setHandler(media, 'seekto', (details) => {
    if (typeof details.seekTime === 'number') activeCommands?.seekTo(details.seekTime);
  });
}

/**
 * Chooses between the music-style pair (previous / next post) and the podcast
 * style one (jump ±15s within the post).
 *
 * Android's notification keeps one slot either side of play/pause, and Chrome
 * fills them with the seek pair the moment those handlers exist — pushing track
 * skipping out of the card entirely. A feed of posts belongs to the music shape,
 * so the seek pair is only offered as a fallback, when there is no neighbouring
 * post to move to. The in-app player keeps its own ±15s controls either way.
 */
function bindSkipHandlers(media: MediaSession, hasNext: boolean, hasPrevious: boolean): void {
  const wantsSeekButtons = !hasNext && !hasPrevious;

  if (hasNext !== publishedHasNext) {
    setHandler(media, 'nexttrack', hasNext ? () => activeCommands?.next() : null);
    publishedHasNext = hasNext;
  }
  if (hasPrevious !== publishedHasPrevious) {
    setHandler(media, 'previoustrack', hasPrevious ? () => activeCommands?.previous() : null);
    publishedHasPrevious = hasPrevious;
  }

  if (wantsSeekButtons === publishedSeekButtons) return;
  setHandler(
    media,
    'seekbackward',
    wantsSeekButtons
      ? (details) => activeCommands?.seekBy(-(details.seekOffset ?? SEEK_OFFSET_SECONDS))
      : null,
  );
  setHandler(
    media,
    'seekforward',
    wantsSeekButtons
      ? (details) => activeCommands?.seekBy(details.seekOffset ?? SEEK_OFFSET_SECONDS)
      : null,
  );
  publishedSeekButtons = wantsSeekButtons;
}

function clearHandlers(media: MediaSession): void {
  const actions: MediaSessionAction[] = [
    'play',
    'pause',
    'stop',
    'seekbackward',
    'seekforward',
    'seekto',
    'nexttrack',
    'previoustrack',
  ];
  actions.forEach((action) => setHandler(media, action, null));
}

function resetPublished(): void {
  publishedState = 'none';
  publishedPosition = null;
  publishedDuration = 0;
  publishedRate = 1;
  publishedHasNext = false;
  publishedHasPrevious = false;
  publishedSeekButtons = false;
}

/**
 * The native session resolves a single artwork URL for the notification. The web
 * session uses the sized app icons above instead, since browsers pick the size
 * they need, so there is nothing to resolve here.
 */
export async function resolveNotificationArtwork(): Promise<string | undefined> {
  return undefined;
}

/**
 * Publishes the now-playing card and points its buttons at the app.
 *
 * @returns whether the browser has a media session; `false` means the in-app
 * controls are the only ones, exactly as before.
 */
export function activateMediaSession(
  _player: AudioPlayer,
  metadata: MediaSessionMetadata,
  commands?: MediaSessionCommands,
): boolean {
  const media = session();
  if (!media) return false;

  activeCommands = commands ?? null;
  isActive = true;
  resetPublished();
  applyMetadata(media, metadata);
  bindTransportHandlers(media);
  // The skip pair is decided by the queue, which the first playback sync brings.
  // Until then leave both pairs unbound so the flags above stay truthful and the
  // card never shows a button that is about to be swapped out.
  (['nexttrack', 'previoustrack', 'seekbackward', 'seekforward'] as MediaSessionAction[]).forEach(
    (action) => setHandler(media, action, null),
  );

  try {
    media.playbackState = 'playing';
    publishedState = 'playing';
  } catch {
    // Older browsers expose the session without a writable playback state.
  }

  return true;
}

/** Re-labels the card when playback moves to another post. */
export function updateMediaSessionMetadata(
  _player: AudioPlayer,
  metadata: MediaSessionMetadata,
): void {
  const media = session();
  if (!media || !isActive) return;
  applyMetadata(media, metadata);
  // The new track starts from the top: let the next sync push its position.
  publishedPosition = null;
  publishedDuration = 0;
}

/**
 * Keeps the card's play/pause icon, progress bar and skip buttons in step with
 * real playback. Called on every status tick, so writes are skipped unless
 * something the card shows has actually changed.
 */
export function syncMediaSessionPlayback(playback: MediaSessionPlayback): void {
  const media = session();
  if (!media || !isActive) return;

  // Moving to another post replaces the audio element underneath, and a browser
  // that ends the old session with it starts the new one with no metadata. Put
  // it back rather than leaving the card showing the page title.
  if (media.metadata === null && activeMetadata && typeof MediaMetadata !== 'undefined') {
    applyMetadata(media, activeMetadata);
    publishedState = 'none';
    publishedPosition = null;
  }

  const state: MediaSessionPlaybackState = playback.isPlaying ? 'playing' : 'paused';
  if (state !== publishedState) {
    try {
      media.playbackState = state;
    } catch {
      // Not writable here; the position state below still updates.
    }
    publishedState = state;
  }

  bindSkipHandlers(media, playback.hasNext, playback.hasPrevious);

  if (typeof media.setPositionState !== 'function') return;

  // A missing or unloaded duration has no honest progress bar, and browsers
  // reject a non-finite one outright.
  const duration = finiteSeconds(playback.duration);
  if (duration <= 0) return;

  const position = Math.min(finiteSeconds(playback.position), duration);
  const rate = playback.speed > 0 && Number.isFinite(playback.speed) ? playback.speed : 1;
  const moved =
    publishedPosition === null || Math.abs(position - publishedPosition) >= POSITION_STEP_SECONDS;
  if (!moved && duration === publishedDuration && rate === publishedRate) return;

  try {
    media.setPositionState({ duration, position, playbackRate: rate });
    publishedPosition = position;
    publishedDuration = duration;
    publishedRate = rate;
  } catch {
    // A rejected position state leaves the card without a progress bar only.
  }
}

/** Drops the card and unbinds every button. */
export function clearMediaSession(_player: AudioPlayer): void {
  const media = session();
  activeCommands = null;
  activeMetadata = null;
  isActive = false;
  resetPublished();
  if (!media) return;

  clearHandlers(media);
  try {
    media.metadata = null;
    media.playbackState = 'none';
  } catch {
    // Nothing published yet, so there is nothing to take down.
  }
}
