import { create } from 'zustand';

import { audioSeek } from '@/lib/audio/bridge';
import { selectPost, useFeedStore } from '@/lib/store/feedStore';
import { finiteSeconds } from '@/lib/utils';

export const PLAYBACK_SPEEDS = [1, 1.25, 1.5, 2] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

/** Snapshot of the native player, pushed in by the audio engine. */
export interface PlaybackStatusUpdate {
  position: number;
  duration: number;
  isBuffering: boolean;
  isLoaded: boolean;
}

interface PlayerState {
  currentId: string | null;
  queueIds: string[];
  /** Playback intent. The audio engine plays or pauses the native player from this. */
  isPlaying: boolean;
  /** Position in seconds, reported by the player or moved locally while scrubbing. */
  position: number;
  /** Real duration in seconds once the source loads, 0 before that. */
  duration: number;
  isBuffering: boolean;
  isLoaded: boolean;
  isScrubbing: boolean;
  /** Human-readable playback failure, shown inline in both players. */
  error: string | null;
  /** Bumped by retry() so the engine reloads the current source. */
  loadToken: number;
  isExpanded: boolean;
  speed: PlaybackSpeed;

  playPost: (
    postId: string,
    queueIds?: string[],
    options?: { expand?: boolean; autoplay?: boolean },
  ) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;
  seek: (position: number) => void;
  skipBy: (seconds: number) => void;
  /** Moves the displayed position while a slider is being dragged. */
  scrubTo: (position: number) => void;
  /** Commits a drag: seeks the player and hands position control back to it. */
  endScrub: (position: number) => void;
  expand: () => void;
  collapse: () => void;
  stop: () => void;
  cycleSpeed: () => void;
  retry: () => void;
  reportStatus: (status: PlaybackStatusUpdate) => void;
  /**
   * Adopts a play/pause change that came from outside the app — the media
   * notification, the lock screen or a headset/car media button — so the
   * in-app players show what the audio is actually doing.
   */
  reportPlaybackState: (playing: boolean) => void;
  reportError: (message: string) => void;
  trackEnded: () => void;
}

/** Duration a post reports before its file has loaded. */
function reportedDuration(postId: string | null): number {
  if (!postId) return 0;
  return finiteSeconds(selectPost(useFeedStore.getState(), postId)?.durationSec);
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  const clamp = (position: number): number => {
    const state = get();
    const target = finiteSeconds(position);
    const limit = state.duration > 0 ? state.duration : reportedDuration(state.currentId);
    if (limit <= 0) return target;
    return Math.min(limit, target);
  };

  return {
    currentId: null,
    queueIds: [],
    isPlaying: false,
    position: 0,
    duration: 0,
    isBuffering: false,
    isLoaded: false,
    isScrubbing: false,
    error: null,
    loadToken: 0,
    isExpanded: false,
    speed: 1,

    playPost: (postId, queueIds, options) => {
      const state = get();
      const nextQueue = queueIds ?? (state.queueIds.includes(postId) ? state.queueIds : [postId]);
      const shouldPlay = options?.autoplay ?? true;
      const isExpanded = options?.expand ?? state.isExpanded;

      if (state.currentId === postId) {
        set({ queueIds: nextQueue, isPlaying: shouldPlay, isExpanded });
        return;
      }

      set({
        currentId: postId,
        queueIds: nextQueue,
        isPlaying: shouldPlay,
        position: 0,
        duration: 0,
        isBuffering: shouldPlay,
        isLoaded: false,
        isScrubbing: false,
        error: null,
        isExpanded,
      });
    },

    togglePlay: () => {
      const state = get();
      if (!state.currentId) return;
      // A failed load has nothing to resume, so the same button retries.
      if (state.error) {
        get().retry();
        return;
      }
      set({ isPlaying: !state.isPlaying });
    },

    playNext: () => {
      const { currentId, queueIds } = get();
      const index = currentId ? queueIds.indexOf(currentId) : -1;
      const nextId = index >= 0 ? queueIds[index + 1] : undefined;
      if (!nextId) {
        set({ isPlaying: false });
        return;
      }
      get().playPost(nextId, queueIds);
    },

    playPrevious: () => {
      const { currentId, queueIds } = get();
      const index = currentId ? queueIds.indexOf(currentId) : -1;
      const previousId = index > 0 ? queueIds[index - 1] : undefined;
      if (!previousId) return;
      get().playPost(previousId, queueIds);
    },

    seek: (position) => {
      if (!get().currentId) return;
      const target = clamp(position);
      set({ position: target });
      audioSeek(target);
    },

    skipBy: (seconds) => {
      get().seek(get().position + seconds);
    },

    scrubTo: (position) => {
      if (!get().currentId) return;
      set({ isScrubbing: true, position: clamp(position) });
    },

    endScrub: (position) => {
      if (!get().currentId) {
        set({ isScrubbing: false });
        return;
      }
      const target = clamp(position);
      set({ position: target, isScrubbing: false });
      audioSeek(target);
    },

    expand: () => set({ isExpanded: true }),
    collapse: () => set({ isExpanded: false }),

    stop: () =>
      set({
        currentId: null,
        queueIds: [],
        isPlaying: false,
        position: 0,
        duration: 0,
        isBuffering: false,
        isLoaded: false,
        isScrubbing: false,
        error: null,
        isExpanded: false,
      }),

    cycleSpeed: () => {
      const index = PLAYBACK_SPEEDS.indexOf(get().speed);
      set({ speed: PLAYBACK_SPEEDS[(index + 1) % PLAYBACK_SPEEDS.length] });
    },

    retry: () => {
      if (!get().currentId) return;
      set((state) => ({
        error: null,
        isBuffering: true,
        isLoaded: false,
        isPlaying: true,
        loadToken: state.loadToken + 1,
      }));
    },

    reportStatus: (status) => {
      const state = get();
      if (!state.currentId) return;

      // The native player reports NaN for both values until a source is loaded.
      const position = finiteSeconds(status.position, state.position);
      const duration = finiteSeconds(status.duration, 0);

      const next: Partial<PlayerState> = {};
      if (!state.isScrubbing && Math.abs(position - state.position) > 0.05) {
        next.position = position;
      }
      if (duration > 0 && Math.abs(duration - state.duration) > 0.05) {
        next.duration = duration;
      }
      if (status.isBuffering !== state.isBuffering) next.isBuffering = status.isBuffering;
      if (status.isLoaded !== state.isLoaded) next.isLoaded = status.isLoaded;
      if (status.isLoaded && state.error) next.error = null;

      if (Object.keys(next).length > 0) set(next);
    },

    reportPlaybackState: (playing) => {
      const state = get();
      if (!state.currentId || state.error) return;
      if (state.isPlaying === playing) return;
      set({ isPlaying: playing });
    },

    reportError: (message) => {
      if (!get().currentId) return;
      set({ error: message, isPlaying: false, isBuffering: false, isLoaded: false });
    },

    trackEnded: () => {
      get().playNext();
    },
  };
});

/** Where the current post sits in the queue, for enabling skip controls. */
export function queueBounds(
  queueIds: string[],
  currentId: string | null,
): { index: number; hasPrevious: boolean; hasNext: boolean } {
  const index = currentId ? queueIds.indexOf(currentId) : -1;
  return {
    index,
    hasPrevious: index > 0,
    hasNext: index >= 0 && index < queueIds.length - 1,
  };
}
