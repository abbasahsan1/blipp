/** Deterministic pseudo-random generator so waveforms stay stable across renders. */
function seededRandom(seed: number): () => number {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function hashOf(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 1_000_003;
  }
  return hash;
}

export function makeWaveform(seed: number, bars = 48): number[] {
  const random = seededRandom(seed * 977 + 13);
  return Array.from({ length: bars }, (_, index) => {
    const envelope = 0.55 + 0.45 * Math.sin((index / bars) * Math.PI * 2.2);
    const value = 0.25 + random() * 0.75 * envelope;
    return Math.min(1, Math.max(0.12, value));
  });
}

const cache = new Map<string, number[]>();

/**
 * Decorative waveform for a post. Audio files are not analysed on device, so
 * the bars are derived from the post id: stable for a given post, different
 * between posts, and free to draw.
 */
export function waveformForId(id: string): number[] {
  const cached = cache.get(id);
  if (cached) return cached;
  const bars = makeWaveform(hashOf(id) + 1);
  cache.set(id, bars);
  return bars;
}
