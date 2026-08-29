import { Platform } from 'react-native';
import type { Href } from 'expo-router';
import { create } from 'zustand';

import { formatFileSize } from '@/lib/format';
import { sortPostsForCategory, useFeedStore } from '@/lib/store/feedStore';
import { usePlayerStore } from '@/lib/store/playerStore';
import type { UploadCategory } from '@/lib/types';

export const TITLE_MAX_LENGTH = 100;
export const DESCRIPTION_MAX_LENGTH = 300;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** Container formats the player can open. */
const ALLOWED_EXTENSIONS = [
  'mp3',
  'm4a',
  'mp4',
  'aac',
  'wav',
  'wave',
  'ogg',
  'oga',
  'opus',
  'flac',
  'aiff',
  'aif',
  'caf',
  'weba',
  'webm',
];

const UPLOAD_TICK_MS = 140;
const UPLOAD_STEP = 0.055;
/** Where a simulated failure interrupts the transfer. */
const FAILURE_PROGRESS = 0.62;

const NETWORK_ERROR = 'Upload failed: the connection dropped part way through. Your draft is safe.';

export interface PickedAudioFile {
  name: string;
  /** Local file or object URL the player can open. */
  uri: string;
  /** Size in bytes, 0 when the platform does not report one. */
  size: number;
  mimeType?: string;
  durationSec: number;
  /** True when the length came from the file size rather than its metadata. */
  isDurationEstimated: boolean;
}

export type UploadStatus = 'idle' | 'uploading' | 'error' | 'success';
/** Which part failed, so the UI offers the right recovery action. */
export type UploadErrorKind = 'file' | 'transfer' | null;

interface UploadState {
  file: PickedAudioFile | null;
  title: string;
  description: string;
  category: UploadCategory;
  status: UploadStatus;
  /** Transfer progress, 0..1. */
  progress: number;
  error: string | null;
  errorKind: UploadErrorKind;
  /** Demo switch: makes the next transfer fail so the error path is reachable. */
  simulateFailure: boolean;
  /** Title of the post that was just published, shown in the confirmation. */
  publishedTitle: string | null;
  publishedPostId: string | null;
  /** Whether the Upload tab is on screen, so the leave guard only applies there. */
  isFocused: boolean;
  /** Route the user tried to leave for, waiting on the discard dialog. */
  pendingLeave: Href | null;

  setFile: (file: PickedAudioFile) => void;
  clearFile: () => void;
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  setCategory: (category: UploadCategory) => void;
  setSimulateFailure: (value: boolean) => void;
  /** Surfaces a picker failure inline instead of throwing. */
  reportPickError: (message: string) => void;
  startUpload: () => void;
  cancelUpload: () => void;
  reset: () => void;
  setFocused: (value: boolean) => void;
  /** Returns true when leaving was blocked and the discard dialog is now open. */
  requestLeave: (href: Href) => boolean;
  /** Discards the draft and returns the route the user wanted. */
  confirmLeave: () => Href | null;
  cancelLeave: () => void;
}

let uploadTimer: ReturnType<typeof setInterval> | null = null;

function stopTimer(): void {
  if (uploadTimer === null) return;
  clearInterval(uploadTimer);
  uploadTimer = null;
}

function fileExtension(name: string): string {
  const parts = name.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

/** Human-readable reason the file cannot be uploaded, or null when it is fine. */
export function validateAudioFile(file: PickedAudioFile): string | null {
  const isAudioMime = file.mimeType?.startsWith('audio/') ?? false;
  const hasAudioExtension = ALLOWED_EXTENSIONS.includes(fileExtension(file.name));

  if (!isAudioMime && !hasAudioExtension) {
    return `“${file.name}” is not a supported audio format. Pick an MP3, M4A, AAC, WAV, OGG or FLAC file.`;
  }

  if (file.size > MAX_FILE_BYTES) {
    return `“${file.name}” is ${formatFileSize(file.size)}. Uploads are limited to ${formatFileSize(MAX_FILE_BYTES)}.`;
  }

  return null;
}

const EMPTY_DRAFT = {
  file: null,
  title: '',
  description: '',
  category: 'Interview' as UploadCategory,
  status: 'idle' as UploadStatus,
  progress: 0,
  error: null,
  errorKind: null,
  publishedTitle: null,
  publishedPostId: null,
  pendingLeave: null,
};

export const useUploadStore = create<UploadState>((set, get) => {
  /** Adds the finished upload to the feed and queues it in the player. */
  const publish = (): void => {
    const { file, title, description, category } = get();
    if (!file) return;

    const post = useFeedStore.getState().addPost({
      title,
      description,
      category,
      durationSec: file.durationSec,
      audioUrl: file.uri,
    });

    const feed = useFeedStore.getState();
    const queueIds = sortPostsForCategory(feed.posts, feed.category).map((item) => item.id);
    // Browsers block audio that starts without a user gesture, so web queues it paused.
    usePlayerStore
      .getState()
      .playPost(post.id, queueIds, { autoplay: Platform.OS !== 'web', expand: false });

    set({
      status: 'success',
      progress: 1,
      error: null,
      errorKind: null,
      publishedTitle: post.title,
      publishedPostId: post.id,
    });
  };

  return {
    ...EMPTY_DRAFT,
    simulateFailure: false,
    isFocused: false,

    setFile: (file) => {
      const invalid = validateAudioFile(file);
      if (invalid) {
        // Keep the typed fields: only the rejected file is dropped.
        set({ error: invalid, errorKind: 'file', status: 'error', progress: 0 });
        return;
      }
      set({ file, error: null, errorKind: null, status: 'idle', progress: 0 });
    },

    clearFile: () => {
      if (get().status === 'uploading') return;
      set({ file: null, status: 'idle', progress: 0, error: null, errorKind: null });
    },

    setTitle: (title) => set({ title: title.slice(0, TITLE_MAX_LENGTH) }),
    setDescription: (description) =>
      set({ description: description.slice(0, DESCRIPTION_MAX_LENGTH) }),
    setCategory: (category) => set({ category }),
    setSimulateFailure: (value) => set({ simulateFailure: value }),

    reportPickError: (message) => set({ error: message, errorKind: 'file', status: 'error' }),

    startUpload: () => {
      const state = get();
      if (state.status === 'uploading') return;

      const file = state.file;
      if (!file || state.title.trim().length === 0) return;

      const invalid = validateAudioFile(file);
      if (invalid) {
        set({ error: invalid, errorKind: 'file', status: 'error', progress: 0 });
        return;
      }

      stopTimer();
      set({ status: 'uploading', progress: 0, error: null, errorKind: null });

      // Stands in for the real transfer until a backend is connected.
      uploadTimer = setInterval(() => {
        const current = get();
        if (current.status !== 'uploading') {
          stopTimer();
          return;
        }

        const next = current.progress + UPLOAD_STEP;

        if (current.simulateFailure && next >= FAILURE_PROGRESS) {
          stopTimer();
          set({
            status: 'error',
            errorKind: 'transfer',
            error: NETWORK_ERROR,
            progress: FAILURE_PROGRESS,
          });
          return;
        }

        if (next >= 1) {
          stopTimer();
          set({ progress: 1 });
          publish();
          return;
        }

        set({ progress: next });
      }, UPLOAD_TICK_MS);
    },

    cancelUpload: () => {
      stopTimer();
      if (get().status !== 'uploading') return;
      set({ status: 'idle', progress: 0, error: null, errorKind: null });
    },

    reset: () => {
      stopTimer();
      set({ ...EMPTY_DRAFT });
    },

    setFocused: (value) => set({ isFocused: value }),

    requestLeave: (href) => {
      const state = get();
      if (!state.isFocused || state.status === 'success') return false;
      if (!isDraftDirty(state)) return false;
      set({ pendingLeave: href });
      return true;
    },

    confirmLeave: () => {
      const href = get().pendingLeave;
      get().reset();
      return href;
    },

    cancelLeave: () => set({ pendingLeave: null }),
  };
});

/** Whether leaving the screen would throw away work. */
export function isDraftDirty(state: {
  file: PickedAudioFile | null;
  title: string;
  description: string;
  status: UploadStatus;
}): boolean {
  if (state.status === 'uploading') return true;
  return (
    state.file !== null || state.title.trim().length > 0 || state.description.trim().length > 0
  );
}

/** Post is only allowed once a file and a title exist. */
export function canPublishDraft(state: {
  file: PickedAudioFile | null;
  title: string;
  status: UploadStatus;
}): boolean {
  return state.file !== null && state.title.trim().length > 0 && state.status !== 'uploading';
}
