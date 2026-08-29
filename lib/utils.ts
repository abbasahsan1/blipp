import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** HeroUI's Slider reports a tuple for ranges; audio scrubbers only use one value. */
export function singleSliderValue(value: number | number[]): number {
  return finiteSeconds(Array.isArray(value) ? value[0] : value);
}

/**
 * A playback time that is safe to lay out with. The native player reports NaN
 * for position and duration until a source is loaded, and a NaN width or offset
 * crashes the native view tree, so every second entering the UI passes here.
 */
export function finiteSeconds(value: number | null | undefined, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}
