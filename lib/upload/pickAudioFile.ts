import * as DocumentPicker from 'expo-document-picker';

import { estimateDurationFromSize, probeAudioDuration } from '@/lib/audio/probeDuration';
import type { PickedAudioFile } from '@/lib/upload/audioFile';

/**
 * Opens the device file picker filtered to audio. Resolves to null when the
 * user dismisses it; throws only if the picker itself cannot be opened.
 *
 * The filter stays broad on purpose: a file the app cannot publish is rejected
 * with a clear reason right after selection, rather than hidden by the picker.
 */
export async function pickAudioFile(): Promise<PickedAudioFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'audio/*',
    copyToCacheDirectory: true,
    multiple: false,
    // Web would otherwise inline the whole file as a base64 data URL.
    base64: false,
  });

  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;

  const size = asset.size ?? 0;
  const probed = await probeAudioDuration(asset.uri);

  return {
    name: asset.name.trim().length > 0 ? asset.name : 'audio-clip',
    uri: asset.uri,
    size,
    mimeType: asset.mimeType,
    durationSec: probed > 0 ? probed : estimateDurationFromSize(size),
    isDurationEstimated: probed <= 0,
  };
}
