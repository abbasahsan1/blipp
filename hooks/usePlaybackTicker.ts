import { useEffect } from 'react';

import { usePlayerStore } from '@/lib/store/playerStore';

const TICK_MS = 250;

/**
 * Drives the simulated playback clock. Mounted once next to the player UI.
 * Replace with real audio position updates once audio playback is wired up.
 */
export function usePlaybackTicker() {
  const isPlaying = usePlayerStore((state) => state.isPlaying);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const interval = setInterval(() => {
      usePlayerStore.getState().tick(TICK_MS / 1000);
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [isPlaying]);
}
