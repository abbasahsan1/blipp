import { Platform } from 'react-native';

import { formatFileSize } from '@/lib/format';
import { AUDIO_BUCKET } from '@/lib/posts';
import {
  ALLOWED_AUDIO_LABEL,
  type AllowedAudioType,
  MAX_FILE_BYTES,
  type ValidAudioFile,
} from '@/lib/upload/audioFile';
import { bilt } from '@/lib/bilt';

/** 'file' means pick another one; 'transfer' means the same file can be retried. */
export type UploadFailureKind = 'file' | 'transfer';

/** Carries wording that is safe to show in the UI as-is. */
export class AudioUploadError extends Error {
  readonly kind: UploadFailureKind;

  constructor(message: string, kind: UploadFailureKind) {
    super(message);
    this.kind = kind;
  }
}

const EXTENSIONS: Record<AllowedAudioType, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/wav': 'wav',
};

/** Object name that survives a URL path: no spaces, no separators, right extension. */
function storageName(file: ValidAudioFile): string {
  const extension = EXTENSIONS[file.contentType];
  const base = file.name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `${base.length > 0 ? base : 'clip'}.${extension}`;
}

export interface AudioBody {
  /** Blob on web, raw bytes on native — both accepted by the storage client. */
  body: Blob | Uint8Array;
  size: number;
}

/** Reads the picked file into memory so it can be handed to storage. */
export async function readAudioBody(file: ValidAudioFile): Promise<AudioBody> {
  let body: Blob | Uint8Array;

  try {
    const response = await fetch(file.uri);
    body =
      Platform.OS === 'web' ? await response.blob() : new Uint8Array(await response.arrayBuffer());
  } catch {
    throw new AudioUploadError(
      `We could not read “${file.name}”. Pick the file again, or choose another one.`,
      'file',
    );
  }

  const size = body instanceof Uint8Array ? body.byteLength : body.size;

  if (size === 0) {
    throw new AudioUploadError(
      `“${file.name}” came back empty. Pick the file again, or choose another one.`,
      'file',
    );
  }

  // The picker does not always report a size, so the real byte count is checked
  // here as well as at selection time.
  if (size > MAX_FILE_BYTES) {
    throw new AudioUploadError(
      `“${file.name}” is ${formatFileSize(size)}. Uploads are limited to ${formatFileSize(MAX_FILE_BYTES)}.`,
      'file',
    );
  }

  return { body, size };
}

/** Turns a storage rejection into wording that says what to do about it. */
function describeStorageError(message: string, fileName: string): AudioUploadError {
  const lower = message.toLowerCase();

  if (lower.includes('mime') || lower.includes('content type')) {
    return new AudioUploadError(
      `“${fileName}” is not a format we can publish. Pick a ${ALLOWED_AUDIO_LABEL} file.`,
      'file',
    );
  }
  if (lower.includes('size') || lower.includes('large') || lower.includes('payload')) {
    return new AudioUploadError(
      `“${fileName}” is over the ${formatFileSize(MAX_FILE_BYTES)} limit. Pick a shorter clip.`,
      'file',
    );
  }
  return new AudioUploadError(
    'The upload did not finish. Check your connection and try again — your draft is safe.',
    'transfer',
  );
}

/**
 * Stores the file in the caller's own folder inside the audio bucket and
 * returns its object path.
 */
export async function uploadAudioBody(params: {
  userId: string;
  file: ValidAudioFile;
  body: Blob | Uint8Array;
}): Promise<string> {
  const path = `${params.userId}/${Date.now()}-${storageName(params.file)}`;

  const { error } = await bilt.storage.from(AUDIO_BUCKET).upload(path, params.body, {
    contentType: params.file.contentType,
    upsert: false,
  });

  if (error) throw describeStorageError(error.message, params.file.name);
  return path;
}

/** Removes an uploaded file, used when publishing is cancelled or fails late. */
export async function removeAudioFile(path: string): Promise<void> {
  await bilt.storage.from(AUDIO_BUCKET).remove([path]);
}
