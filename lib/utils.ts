import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** HeroUI's Slider reports a tuple for ranges; audio scrubbers only use one value. */
export function singleSliderValue(value: number | number[]): number {
  return Array.isArray(value) ? value[0] : value;
}
