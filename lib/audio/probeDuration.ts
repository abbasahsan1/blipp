import { createAudioPlayer } from 'expo-audio';

/** How long a probe waits for the file to report its length before giving up. */
const PROBE_TIMEOUT_MS = 4_000;
const POLL_INTERVAL_MS = 120;
/** Bytes per second at 128 kbps, used only when a file refuses to report its length. */
const ASSUMED_BYTES_PER_SECOND = 16_000;

/** Rough length from the file size, for files whose metadata cannot be read. */
export function estimateDurationFromSize(bytes: number): number {
  if (bytes <= 0) return 0;
  return Math.max(1, Math.round(bytes / ASSUMED_BYTES_PER_SECOND));
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Reads the real length of a local audio file by loading it into a throwaway
 * player. Returns 0 when the file never reports a duration, so callers can fall
 * back to an estimate instead of blocking the upload.
 */
export async function probeAudioDuration(uri: string): Promise<number> {
  let player: ReturnType<typeof createAudioPlayer> | null = null;

  try {
    player = createAudioPlayer({ uri }, { updateInterval: POLL_INTERVAL_MS });
  } catch {
    return 0;
  }

  try {
    const deadline = Date.now() + PROBE_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const duration = player.duration;
      if (Number.isFinite(duration) && duration > 0) return Math.round(duration);
      await wait(POLL_INTERVAL_MS);
    }
    return 0;
  } catch {
    return 0;
  } finally {
    try {
      player.remove();
    } catch {
      // The probe player was never loaded; there is nothing to release.
    }
  }
}
