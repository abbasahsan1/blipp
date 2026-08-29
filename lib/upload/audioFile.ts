import { formatFileSize } from '@/lib/format';

/** Matches the audio bucket's limit, so a file the app accepts the server accepts too. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** The only content types the audio bucket stores. */
export const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-m4a'] as const;

export type AllowedAudioType = (typeof ALLOWED_AUDIO_TYPES)[number];

/** Human-readable list used in picker copy and error messages. */
export const ALLOWED_AUDIO_LABEL = 'MP3, M4A or WAV';

/** Platforms report the same container under several names. */
const TYPE_ALIASES: Record<string, AllowedAudioType> = {
  'audio/mpeg': 'audio/mpeg',
  'audio/mp3': 'audio/mpeg',
  'audio/mpeg3': 'audio/mpeg',
  'audio/x-mpeg': 'audio/mpeg',
  'audio/x-mp3': 'audio/mpeg',
  'audio/mp4': 'audio/mp4',
  'audio/x-m4a': 'audio/x-m4a',
  'audio/m4a': 'audio/x-m4a',
  'audio/wav': 'audio/wav',
  'audio/wave': 'audio/wav',
  'audio/x-wav': 'audio/wav',
  'audio/x-pn-wav': 'audio/wav',
  'audio/vnd.wave': 'audio/wav',
};

const EXTENSION_TYPES: Record<string, AllowedAudioType> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/x-m4a',
  mp4: 'audio/mp4',
  m4b: 'audio/mp4',
  wav: 'audio/wav',
  wave: 'audio/wav',
};

export interface PickedAudioFile {
  name: string;
  /** Local file or object URL the player can open. */
  uri: string;
  /** Size in bytes, 0 when the platform does not report one. */
  size: number;
  /** Content type as reported by the picker, before normalising. */
  mimeType?: string;
  durationSec: number;
  /** True when the length came from the file size rather than its metadata. */
  isDurationEstimated: boolean;
}

/** A picked file that passed validation, carrying the type it will be stored as. */
export interface ValidAudioFile extends PickedAudioFile {
  contentType: AllowedAudioType;
}

function extensionOf(name: string): string {
  const parts = name.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

/**
 * The content type this file will be stored as, or null when the format is not
 * one the audio bucket accepts. Reported types win; the extension is the
 * fallback for pickers that report nothing useful.
 */
export function resolveAudioType(file: PickedAudioFile): AllowedAudioType | null {
  const reported = file.mimeType?.split(';')[0].trim().toLowerCase();
  if (reported && TYPE_ALIASES[reported]) return TYPE_ALIASES[reported];
  return EXTENSION_TYPES[extensionOf(file.name)] ?? null;
}

export type AudioFileCheck = { ok: true; file: ValidAudioFile } | { ok: false; message: string };

/**
 * Checks a freshly picked file against the same rules the storage bucket
 * enforces, so an unusable file is rejected at selection time.
 */
export function checkAudioFile(file: PickedAudioFile): AudioFileCheck {
  const contentType = resolveAudioType(file);
  if (!contentType) {
    return {
      ok: false,
      message: `“${file.name}” is not a format we can publish. Pick a ${ALLOWED_AUDIO_LABEL} file.`,
    };
  }

  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      message: `“${file.name}” is ${formatFileSize(file.size)}. Uploads are limited to ${formatFileSize(MAX_FILE_BYTES)}.`,
    };
  }

  return { ok: true, file: { ...file, contentType } };
}
