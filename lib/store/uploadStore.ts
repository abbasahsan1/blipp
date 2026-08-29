import { Platform } from 'react-native';
import type { Href } from 'expo-router';
import { create } from 'zustand';

import { insertPost } from '@/lib/posts';
import { useFeedStore } from '@/lib/store/feedStore';
import { usePlayerStore } from '@/lib/store/playerStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { checkAudioFile, type PickedAudioFile, type ValidAudioFile } from '@/lib/upload/audioFile';
import {
  AudioUploadError,
  readAudioBody,
  removeAudioFile,
  uploadAudioBody,
  type UploadFailureKind,
} from '@/lib/upload/audioUpload';
import type { UploadCategory } from '@/lib/types';

export const TITLE_MAX_LENGTH = 100;
export const DESCRIPTION_MAX_LENGTH = 300;

export type UploadStatus = 'idle' | 'uploading' | 'error' | 'success';
/** Which part failed, so the UI offers the right recovery action. */
export type UploadErrorKind = UploadFailureKind | null;
/** Stage of a publish in flight, shown on the progress card. */
export type UploadPhase = 'preparing' | 'uploading' | 'saving';

const NOT_SIGNED_IN = 'Sign in again to publish this clip.';
const GENERIC_FAILURE = 'Publishing did not finish. Your draft is safe — try again.';

/** Progress the transfer ramp approaches while waiting on the server. */
const RAMP_CEILING = 0.9;
const RAMP_TICK_MS = 200;

interface UploadState {
  file: ValidAudioFile | null;
  title: string;
  description: string;
  category: UploadCategory;
  status: UploadStatus;
  phase: UploadPhase;
  /** Transfer progress, 0..1. */
  progress: number;
  error: string | null;
  errorKind: UploadErrorKind;
  /** Title of the post that was just published, shown in the confirmation. */
  publishedTitle: string | null;
  publishedPostId: string | null;
  /** Whether the Upload tab is on screen, so the leave guard only applies there. */
  isFocused: boolean;
  /** Route the user tried to leave for, waiting on the discard dialog. */
  pendingLeave: Href | null;

  /** Validates the picked file and keeps it only if it can actually be published. */
  setFile: (file: PickedAudioFile) => void;
  clearFile: () => void;
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  setCategory: (category: UploadCategory) => void;
  /** Surfaces a picker failure inline instead of throwing. */
  reportPickError: (message: string) => void;
  startUpload: () => Promise<void>;
  cancelUpload: () => void;
  reset: () => void;
  setFocused: (value: boolean) => void;
  /** Returns true when leaving was blocked and the discard dialog is now open. */
  requestLeave: (href: Href) => boolean;
  /** Discards the draft and returns the route the user wanted. */
  confirmLeave: () => Href | null;
  cancelLeave: () => void;
}

/** Identifies the publish attempt in flight; bumping it abandons the previous one. */
let activeToken = 0;
let rampTimer: ReturnType<typeof setInterval> | null = null;

function stopRamp(): void {
  if (rampTimer === null) return;
  clearInterval(rampTimer);
  rampTimer = null;
}

const EMPTY_DRAFT = {
  file: null,
  title: '',
  description: '',
  category: 'Interview' as UploadCategory,
  status: 'idle' as UploadStatus,
  phase: 'preparing' as UploadPhase,
  progress: 0,
  error: null,
  errorKind: null,
  publishedTitle: null,
  publishedPostId: null,
  pendingLeave: null,
};

/** Queues the new post so the player is ready when the feed opens. */
function queuePublished(postId: string): void {
  const queueIds = useFeedStore.getState().posts.map((item) => item.id);
  // Browsers block audio that starts without a user gesture, so web queues it paused.
  usePlayerStore
    .getState()
    .playPost(postId, queueIds, { autoplay: Platform.OS !== 'web', expand: false });
}

export const useUploadStore = create<UploadState>((set, get) => {
  /**
   * Byte progress is not reported by the storage client, so the bar eases
   * towards a ceiling while the transfer runs and only completes once the
   * server has confirmed both the file and the post row.
   */
  const startRamp = (): void => {
    stopRamp();
    rampTimer = setInterval(() => {
      const state = get();
      if (state.status !== 'uploading' || state.phase !== 'uploading') {
        stopRamp();
        return;
      }
      set({ progress: state.progress + (RAMP_CEILING - state.progress) * 0.07 });
    }, RAMP_TICK_MS);
  };

  return {
    ...EMPTY_DRAFT,
    isFocused: false,

    setFile: (file) => {
      const checked = checkAudioFile(file);
      if (!checked.ok) {
        // Keep the typed fields: only the rejected file is dropped.
        set({ error: checked.message, errorKind: 'file', status: 'error', progress: 0 });
        return;
      }
      set({ file: checked.file, error: null, errorKind: null, status: 'idle', progress: 0 });
    },

    clearFile: () => {
      if (get().status === 'uploading') return;
      set({ file: null, status: 'idle', progress: 0, error: null, errorKind: null });
    },

    setTitle: (title) => set({ title: title.slice(0, TITLE_MAX_LENGTH) }),
    setDescription: (description) =>
      set({ description: description.slice(0, DESCRIPTION_MAX_LENGTH) }),
    setCategory: (category) => set({ category }),

    reportPickError: (message) => set({ error: message, errorKind: 'file', status: 'error' }),

    startUpload: async () => {
      const state = get();
      if (state.status === 'uploading') return;

      const file = state.file;
      const title = state.title.trim();
      if (!file || title.length === 0) return;

      const session = useSessionStore.getState();
      const userId = session.userId;
      const account = session.account;
      if (!userId || !account) {
        set({ status: 'error', errorKind: 'transfer', error: NOT_SIGNED_IN, progress: 0 });
        return;
      }

      activeToken += 1;
      const token = activeToken;
      const isStale = () => token !== activeToken;

      set({
        status: 'uploading',
        phase: 'preparing',
        progress: 0.04,
        error: null,
        errorKind: null,
      });

      let uploadedPath: string | null = null;

      try {
        const { body } = await readAudioBody(file);
        if (isStale()) return;

        set({ phase: 'uploading' });
        startRamp();
        uploadedPath = await uploadAudioBody({ userId, file, body });
        stopRamp();

        if (isStale()) {
          void removeAudioFile(uploadedPath);
          return;
        }

        set({ phase: 'saving', progress: 0.95 });

        const post = await insertPost({
          userId,
          title,
          description: get().description.trim(),
          category: get().category,
          durationSec: file.durationSec,
          audioPath: uploadedPath,
          creator: account,
        });

        if (isStale()) return;

        useFeedStore.getState().addPost(post);
        queuePublished(post.id);

        set({
          status: 'success',
          progress: 1,
          error: null,
          errorKind: null,
          publishedTitle: post.title,
          publishedPostId: post.id,
        });
      } catch (error) {
        stopRamp();
        // A file that made it to storage but never got a post row is dead weight.
        if (uploadedPath) void removeAudioFile(uploadedPath);
        if (isStale()) return;

        const kind: UploadErrorKind = error instanceof AudioUploadError ? error.kind : 'transfer';
        set({
          status: 'error',
          errorKind: kind,
          error: error instanceof Error && error.message ? error.message : GENERIC_FAILURE,
          progress: 0,
        });
      }
    },

    cancelUpload: () => {
      stopRamp();
      if (get().status !== 'uploading') return;
      // The request in flight is abandoned: its result is discarded and any file
      // that already landed in storage is removed.
      activeToken += 1;
      set({ status: 'idle', progress: 0, error: null, errorKind: null, phase: 'preparing' });
    },

    reset: () => {
      stopRamp();
      activeToken += 1;
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
  file: ValidAudioFile | null;
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
  file: ValidAudioFile | null;
  title: string;
  status: UploadStatus;
}): boolean {
  return state.file !== null && state.title.trim().length > 0 && state.status !== 'uploading';
}

/** What the progress card says about the stage a publish is at. */
export function phaseLabel(phase: UploadPhase): string {
  if (phase === 'preparing') return 'Preparing your file…';
  if (phase === 'saving') return 'Saving your post…';
  return 'Uploading audio…';
}
