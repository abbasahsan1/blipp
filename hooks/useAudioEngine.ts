import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  type AudioStatus,
} from 'expo-audio';

import { registerAudioBridge } from '@/lib/audio/bridge';
import { flushListenSeconds, recordListenSeconds } from '@/lib/audio/listenTracker';
import {
  activateMediaSession,
  clearMediaSession,
  ensureMediaNotificationPermission,
  resolveNotificationArtwork,
  syncMediaSessionPlayback,
  updateMediaSessionMetadata,
} from '@/lib/audio/mediaSession';
import type { MediaSessionCommands, MediaSessionMetadata } from '@/lib/audio/mediaSession.types';
import { selectPost, useFeedStore } from '@/lib/store/feedStore';
import { queueBounds, usePlayerStore } from '@/lib/store/playerStore';

const STATUS_INTERVAL_MS = 250;
/** How long a source may stay unloaded before it counts as a failure. */
const LOAD_TIMEOUT_MS = 15_000;
const LOAD_ERROR = 'This audio would not load. Check your connection and try again.';

/** expo-audio reports load failures on the status payload without typing them. */
type StatusWithError = AudioStatus & { error?: string | null };

/**
 * Owns the single native audio player and keeps it in sync with the player
 * store: the store holds intent (which post, playing or paused, seek targets),
 * this hook makes the audio match it and reports real position, duration,
 * buffering and load failures back.
 *
 * Mounted once, next to the persistent player UI, so playback survives tab
 * changes. Background playback and the lock screen / notification controls both
 * come from the audio mode below plus the media session in lib/audio.
 */
export function useAudioEngine(): void {
  const player = useAudioPlayer(null, { updateInterval: STATUS_INTERVAL_MS });
  const status = useAudioPlayerStatus(player);

  const currentId = usePlayerStore((state) => state.currentId);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const speed = usePlayerStore((state) => state.speed);
  const loadToken = usePlayerStore((state) => state.loadToken);
  const queueIds = usePlayerStore((state) => state.queueIds);
  const post = useFeedStore((state) => selectPost(state, currentId));
  const audioUrl = post?.audioUrl;
  const title = post?.title;
  const creatorName = post?.creator.name;
  const category = post?.category;

  const speedRef = useRef(speed);
  speedRef.current = speed;
  const didFinishRef = useRef(false);
  /**
   * The last play/pause command handed to the native player, and whether the
   * player has been observed obeying it. Once confirmed, any further divergence
   * is someone else driving the session — the notification, lock screen or a
   * media button — rather than a command of ours still in flight.
   */
  const intentRef = useRef({ playing: false, confirmed: false });
  /** Whether the media session accepted this player and owns a notification. */
  const sessionActiveRef = useRef(false);
  /**
   * What an outside control surface — a browser's now-playing card, a headset —
   * is allowed to do. Every command goes through the store rather than the
   * native player, so the mini and full players follow along. Store actions are
   * read at call time, which keeps this object stable for the session's lifetime.
   */
  const commandsRef = useRef<MediaSessionCommands>({
    play: () => {
      const store = usePlayerStore.getState();
      if (store.error) store.retry();
      else if (!store.isPlaying) store.togglePlay();
    },
    pause: () => {
      const store = usePlayerStore.getState();
      if (store.isPlaying) store.togglePlay();
    },
    stop: () => usePlayerStore.getState().stop(),
    next: () => usePlayerStore.getState().playNext(),
    previous: () => usePlayerStore.getState().playPrevious(),
    seekBy: (seconds) => usePlayerStore.getState().skipBy(seconds),
    seekTo: (seconds) => usePlayerStore.getState().seek(seconds),
  });
  /** Last position seen for the current post, used to measure what was heard. */
  const listenRef = useRef<{ postId: string | null; position: number }>({
    postId: null,
    position: 0,
  });

  // Keep playing when the app is backgrounded or the screen locks.
  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      allowsRecording: false,
      shouldRouteThroughEarpiece: false,
      interruptionMode: 'doNotMix',
    }).catch(() => undefined);
  }, []);

  // Let store actions seek the native player.
  useEffect(() => {
    registerAudioBridge({
      seek: (seconds) => {
        void player.seekTo(seconds).catch(() => undefined);
      },
    });
    return () => registerAudioBridge(null);
  }, [player]);

  // Load the current post's file. `loadToken` changes when the user retries.
  useEffect(() => {
    didFinishRef.current = false;

    if (!currentId || !audioUrl) {
      try {
        player.pause();
        player.replace(null);
      } catch {
        // Nothing was loaded; there is no state to unwind.
      }
      return;
    }

    const shouldPlay = usePlayerStore.getState().isPlaying;
    intentRef.current = { playing: shouldPlay, confirmed: false };

    try {
      player.replace({ uri: audioUrl });
      player.setPlaybackRate(speedRef.current, 'high');
      if (shouldPlay) player.play();
    } catch {
      usePlayerStore.getState().reportError(LOAD_ERROR);
    }
  }, [player, currentId, audioUrl, loadToken]);

  // Follow play/pause intent.
  useEffect(() => {
    if (!currentId) return;
    intentRef.current = { playing: isPlaying, confirmed: false };
    try {
      if (isPlaying) player.play();
      else player.pause();
    } catch {
      usePlayerStore.getState().reportError(LOAD_ERROR);
    }
  }, [player, currentId, isPlaying]);

  useEffect(() => {
    try {
      player.setPlaybackRate(speed, 'high');
    } catch {
      // Rate changes before a source is loaded are safe to ignore.
    }
  }, [player, speed]);

  // Push real playback status into the store.
  useEffect(() => {
    const store = usePlayerStore.getState();
    if (!store.currentId) return;

    const failure = (status as StatusWithError).error;
    if (failure) {
      store.reportError(LOAD_ERROR);
      return;
    }

    store.reportStatus({
      position: status.currentTime,
      duration: status.duration,
      isBuffering: status.isBuffering,
      isLoaded: status.isLoaded,
    });

    // Only a ready player says anything trustworthy about play/pause: while it
    // buffers or reloads, `playing` is false even though playback is intended.
    if (status.isLoaded && !status.isBuffering && !status.didJustFinish) {
      if (status.playing === intentRef.current.playing) {
        intentRef.current.confirmed = true;
      } else if (intentRef.current.confirmed) {
        intentRef.current = { playing: status.playing, confirmed: true };
        store.reportPlaybackState(status.playing);
      }
    }

    // didJustFinish stays true across updates, so only the transition advances.
    if (status.didJustFinish && !didFinishRef.current) {
      didFinishRef.current = true;
      store.trackEnded();
    } else if (!status.didJustFinish) {
      didFinishRef.current = false;
    }
  }, [status]);

  // Durations are recorded when a file is picked: correct them once the real
  // file reports its length. Before a source loads the player reports NaN, which
  // must never reach the stored duration.
  useEffect(() => {
    if (!currentId || !Number.isFinite(status.duration) || status.duration <= 0) return;
    useFeedStore.getState().syncDuration(currentId, status.duration);
  }, [currentId, status.duration]);

  // A listen counts once the audio is actually running, not when it is queued.
  useEffect(() => {
    if (!currentId || !status.isLoaded || !status.playing) return;
    useFeedStore.getState().countPlay(currentId);
  }, [currentId, status.isLoaded, status.playing]);

  /**
   * Measure how much of a post was really heard: the position the player moved
   * through between two status updates while it was playing. Anything larger
   * than a plausible step is a seek or a skip, not listening, so it is ignored.
   */
  useEffect(() => {
    if (!currentId || !status.isLoaded) return;

    const previous = listenRef.current;
    listenRef.current = { postId: currentId, position: status.currentTime };
    if (previous.postId !== currentId || !status.playing) return;

    const heard = status.currentTime - previous.position;
    const plausible = Math.max(3, 5 * speedRef.current);
    if (heard > 0 && heard <= plausible) recordListenSeconds(currentId, heard);
  }, [currentId, status.currentTime, status.playing, status.isLoaded]);

  // Pausing ends a stretch of listening, so it is logged straight away rather
  // than waiting for the next batch.
  useEffect(() => {
    if (isPlaying) return;
    flushListenSeconds();
  }, [isPlaying]);

  // Skipping to another post, or stopping, logs what was heard of the last one.
  useEffect(() => () => flushListenSeconds(), [currentId]);

  // Leaving the app mid-listen must not lose the seconds already heard.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') flushListenSeconds();
    });
    return () => subscription.remove();
  }, []);

  // A source that never loads is a failure the user can retry.
  useEffect(() => {
    if (!currentId || status.isLoaded) return undefined;
    const timer = setTimeout(() => {
      const store = usePlayerStore.getState();
      if (store.currentId === currentId && !store.isLoaded) store.reportError(LOAD_ERROR);
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [currentId, loadToken, status.isLoaded]);

  const [artworkUrl, setArtworkUrl] = useState<string | undefined>(undefined);

  // Placeholder artwork for the notification, resolved once per launch.
  useEffect(() => {
    let cancelled = false;
    void resolveNotificationArtwork().then((uri) => {
      if (!cancelled) setArtworkUrl(uri);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const metadata = useMemo<MediaSessionMetadata | null>(() => {
    if (!title) return null;
    return {
      title,
      artist: creatorName ?? 'Blipp',
      albumTitle: category,
      artworkUrl,
    };
  }, [title, creatorName, category, artworkUrl]);

  /**
   * Hand the player to the media session on first play, like a music app: the
   * notification appears with playback rather than at launch. Later track
   * changes only relabel the existing notification.
   */
  useEffect(() => {
    if (!currentId || !metadata) return undefined;

    if (sessionActiveRef.current) {
      updateMediaSessionMetadata(player, metadata);
      return undefined;
    }

    if (!isPlaying) return undefined;

    let cancelled = false;
    void ensureMediaNotificationPermission().then(() => {
      if (cancelled || sessionActiveRef.current) return;
      // A device that refuses the session keeps the in-app controls: playback,
      // scrubbing and the mini/full player never depended on it.
      sessionActiveRef.current = activateMediaSession(player, metadata, commandsRef.current);
    });

    return () => {
      cancelled = true;
    };
  }, [player, currentId, metadata, isPlaying]);

  /**
   * Browsers build their now-playing card from what the page publishes, so the
   * play/pause icon, progress bar and skip buttons have to be pushed as playback
   * moves. A no-op on native, where the session reads the player directly.
   */
  useEffect(() => {
    if (!sessionActiveRef.current) return;
    const { hasNext, hasPrevious } = queueBounds(queueIds, currentId);
    syncMediaSessionPlayback({
      isPlaying,
      position: status.currentTime,
      duration: status.duration,
      speed,
      hasNext,
      hasPrevious,
    });
  }, [status, isPlaying, speed, queueIds, currentId]);

  // Nothing is playing any more, so the notification should go away.
  useEffect(() => {
    if (currentId || !sessionActiveRef.current) return;
    clearMediaSession(player);
    sessionActiveRef.current = false;
  }, [player, currentId]);

  useEffect(
    () => () => {
      if (!sessionActiveRef.current) return;
      clearMediaSession(player);
      sessionActiveRef.current = false;
    },
    [player],
  );
}
