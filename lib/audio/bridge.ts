/**
 * Imperative bridge between the player store and the mounted expo-audio player.
 *
 * The store owns intent (which post, playing or paused, target position) and the
 * audio engine owns the native player, so seek requests need a way out of the
 * store. The engine registers itself on mount and unregisters on unmount.
 */
export interface AudioBridge {
  seek: (seconds: number) => void;
}

let bridge: AudioBridge | null = null;

export function registerAudioBridge(next: AudioBridge | null): void {
  bridge = next;
}

export function audioSeek(seconds: number): void {
  bridge?.seek(seconds);
}
