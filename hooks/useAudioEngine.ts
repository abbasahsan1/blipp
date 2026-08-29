import { useEffect, useRef } from 'react';
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  type AudioStatus,
} from 'expo-audio';

import { registerAudioBridge } from '@/lib/audio/bridge';
import { useFeedStore } from '@/lib/store/feedStore';
import { usePlayerStore } from '@/lib/store/playerStore';

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
 * changes. Background playback is enabled through the audio mode below plus the
 * expo-audio config plugin in app.config.ts.
 */
export function useAudioEngine(): void {
  const player = useAudioPlayer(null, { updateInterval: STATUS_INTERVAL_MS });
  const status = useAudioPlayerStatus(player);

  const currentId = usePlayerStore((state) => state.currentId);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const speed = usePlayerStore((state) => state.speed);
  const loadToken = usePlayerStore((state) => state.loadToken);
  const audioUrl = useFeedStore((state) =>
    currentId ? state.posts.find((post) => post.id === currentId)?.audioUrl : undefined,
  );

  const speedRef = useRef(speed);
  speedRef.current = speed;
  const didFinishRef = useRef(false);

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

    try {
      player.replace({ uri: audioUrl });
      player.setPlaybackRate(speedRef.current, 'high');
      if (usePlayerStore.getState().isPlaying) player.play();
    } catch {
      usePlayerStore.getState().reportError(LOAD_ERROR);
    }
  }, [player, currentId, audioUrl, loadToken]);

  // Follow play/pause intent.
  useEffect(() => {
    if (!currentId) return;
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

    // didJustFinish stays true across updates, so only the transition advances.
    if (status.didJustFinish && !didFinishRef.current) {
      didFinishRef.current = true;
      store.trackEnded();
    } else if (!status.didJustFinish) {
      didFinishRef.current = false;
    }
  }, [status]);

  // Mock durations are estimates: correct them once the real file reports one.
  useEffect(() => {
    if (!currentId || status.duration <= 0) return;
    useFeedStore.getState().syncDuration(currentId, status.duration);
  }, [currentId, status.duration]);

  // A source that never loads is a failure the user can retry.
  useEffect(() => {
    if (!currentId || status.isLoaded) return undefined;
    const timer = setTimeout(() => {
      const store = usePlayerStore.getState();
      if (store.currentId === currentId && !store.isLoaded) store.reportError(LOAD_ERROR);
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [currentId, loadToken, status.isLoaded]);
}
