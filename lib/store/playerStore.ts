import { create } from 'zustand';

import { useFeedStore } from '@/lib/store/feedStore';

export const PLAYBACK_SPEEDS = [1, 1.25, 1.5, 2] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

interface PlayerState {
  currentId: string | null;
  queueIds: string[];
  isPlaying: boolean;
  /** Simulated playback position in seconds. */
  position: number;
  isExpanded: boolean;
  speed: PlaybackSpeed;
  playPost: (postId: string, queueIds?: string[], options?: { expand?: boolean }) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;
  seek: (position: number) => void;
  skipBy: (seconds: number) => void;
  tick: (deltaSeconds: number) => void;
  expand: () => void;
  collapse: () => void;
  stop: () => void;
  cycleSpeed: () => void;
}

function durationOf(postId: string | null): number {
  if (!postId) return 0;
  return useFeedStore.getState().posts.find((post) => post.id === postId)?.durationSec ?? 0;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentId: null,
  queueIds: [],
  isPlaying: false,
  position: 0,
  isExpanded: false,
  speed: 1,

  playPost: (postId, queueIds, options) => {
    const state = get();
    const nextQueue = queueIds ?? (state.queueIds.includes(postId) ? state.queueIds : [postId]);
    const isSameTrack = state.currentId === postId;

    set({
      currentId: postId,
      queueIds: nextQueue,
      position: isSameTrack ? state.position : 0,
      isPlaying: true,
      isExpanded: options?.expand ?? state.isExpanded,
    });
  },

  togglePlay: () => {
    if (!get().currentId) return;
    set((state) => ({ isPlaying: !state.isPlaying }));
  },

  playNext: () => {
    const { currentId, queueIds } = get();
    const index = currentId ? queueIds.indexOf(currentId) : -1;
    const nextId = index >= 0 ? queueIds[index + 1] : undefined;
    if (!nextId) {
      set({ isPlaying: false, position: durationOf(currentId) });
      return;
    }
    set({ currentId: nextId, position: 0, isPlaying: true });
  },

  playPrevious: () => {
    const { currentId, queueIds, position } = get();
    if (position > 3) {
      set({ position: 0, isPlaying: true });
      return;
    }
    const index = currentId ? queueIds.indexOf(currentId) : -1;
    const previousId = index > 0 ? queueIds[index - 1] : undefined;
    if (!previousId) {
      set({ position: 0 });
      return;
    }
    set({ currentId: previousId, position: 0, isPlaying: true });
  },

  seek: (position) => {
    const duration = durationOf(get().currentId);
    set({ position: Math.min(duration, Math.max(0, position)) });
  },

  skipBy: (seconds) => {
    get().seek(get().position + seconds);
  },

  tick: (deltaSeconds) => {
    const { currentId, isPlaying, position, speed } = get();
    if (!currentId || !isPlaying) return;

    const duration = durationOf(currentId);
    const next = position + deltaSeconds * speed;
    if (duration > 0 && next >= duration) {
      get().playNext();
      return;
    }
    set({ position: next });
  },

  expand: () => set({ isExpanded: true }),
  collapse: () => set({ isExpanded: false }),
  stop: () =>
    set({ currentId: null, queueIds: [], isPlaying: false, position: 0, isExpanded: false }),

  cycleSpeed: () => {
    const current = get().speed;
    const index = PLAYBACK_SPEEDS.indexOf(current);
    set({ speed: PLAYBACK_SPEEDS[(index + 1) % PLAYBACK_SPEEDS.length] });
  },
}));
