import type { Session } from '@biltme/backend';
import { create } from 'zustand';

import { bilt } from '@/lib/bilt';
import { type AuthFailure, describeAuthError, isEmailNotConfirmed } from '@/lib/auth/errors';
import { startGoogleSignIn } from '@/lib/auth/google';
import { AvatarError, type PickedAvatar, uploadAvatar } from '@/lib/profile/avatar';
import { handleFrom, suggestedNameFrom, toAccount } from '@/lib/profile/identity';
import { useFeedStore } from '@/lib/store/feedStore';
import type { Account } from '@/lib/types';

export const DISPLAY_NAME_MAX_LENGTH = 40;
const PROFILE_COLUMNS = 'id, display_name, handle, avatar_url, bio, created_at';

export type SessionStatus =
  /** Restoring a stored session at launch. */
  | 'loading'
  | 'signed-out'
  /** Signed in, but the profile step was never finished. */
  | 'needs-profile'
  | 'signed-in';

/** Where the caller should go next after an auth action succeeds. */
export type AuthNext = 'verify' | 'profile' | 'done';

export interface AuthResult {
  ok: boolean;
  next?: AuthNext;
}

interface SessionState {
  status: SessionStatus;
  /** Auth user id. Null while signed out. */
  userId: string | null;
  email: string | null;
  account: Account | null;
  /** True while a sign-in, sign-up or code check is in flight. */
  isSubmitting: boolean;
  isSavingProfile: boolean;
  /** Inline auth error with the field it belongs to. */
  error: AuthFailure | null;
  /** Non-error feedback, e.g. after resending a code. */
  notice: string | null;
  /** Email awaiting a verification code. */
  pendingEmail: string | null;
  /** Name prefilled on the profile step. */
  suggestedName: string;

  initialize: () => Promise<void>;
  clearFeedback: () => void;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signUpWithEmail: (email: string, password: string) => Promise<AuthResult>;
  verifyEmailCode: (code: string) => Promise<AuthResult>;
  resendEmailCode: () => Promise<void>;
  signInWithGoogle: () => Promise<AuthResult>;
  saveProfile: (input: { displayName: string; avatar: PickedAvatar | null }) => Promise<boolean>;
  signOut: () => Promise<void>;
}

let isInitialized = false;

export const useSessionStore = create<SessionState>((set, get) => {
  /**
   * Reflects a session (or its absence) into the store, loading the profile row
   * so the UI can tell "signed in" from "still needs a profile".
   */
  const applySession = async (session: Session | null): Promise<void> => {
    if (!session) {
      set({
        status: 'signed-out',
        userId: null,
        email: null,
        account: null,
        suggestedName: '',
      });
      return;
    }

    const user = session.user;
    const email = user.email ?? null;

    // A token refresh for the user we already loaded changes nothing on screen.
    if (user.id === get().userId && get().account) {
      set({ email });
      return;
    }

    set({ userId: user.id, email });

    const { data, error } = await bilt
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      // Reachable when the profile request fails; the account still exists, so
      // the profile step is the safe place to land.
      set({
        status: 'needs-profile',
        account: null,
        suggestedName: suggestedNameFrom(user.user_metadata, email),
      });
      return;
    }

    if (!data) {
      set({
        status: 'needs-profile',
        account: null,
        suggestedName: suggestedNameFrom(user.user_metadata, email),
      });
      return;
    }

    set({ status: 'signed-in', account: toAccount(data, email), suggestedName: data.display_name });
  };

  const nextFromStatus = (): AuthNext => (get().status === 'signed-in' ? 'done' : 'profile');

  return {
    status: 'loading',
    userId: null,
    email: null,
    account: null,
    isSubmitting: false,
    isSavingProfile: false,
    error: null,
    notice: null,
    pendingEmail: null,
    suggestedName: '',

    initialize: async () => {
      if (isInitialized) return;
      isInitialized = true;

      const { data } = await bilt.auth.getSession();
      await applySession(data.session);

      bilt.auth.onAuthStateChange((_event, session) => {
        // Never call back into the client from inside this callback directly.
        setTimeout(() => {
          void applySession(session);
        }, 0);
      });
    },

    clearFeedback: () => set({ error: null, notice: null }),

    signInWithEmail: async (email, password) => {
      if (get().isSubmitting) return { ok: false };
      const trimmed = email.trim();
      set({ isSubmitting: true, error: null, notice: null });

      const { data, error } = await bilt.auth.signInWithPassword({
        email: trimmed,
        password,
      });

      if (error) {
        // An unconfirmed account cannot sign in yet: send a fresh code instead.
        if (isEmailNotConfirmed(error)) {
          await bilt.auth.resend({ type: 'signup', email: trimmed });
          set({
            isSubmitting: false,
            pendingEmail: trimmed,
            error: describeAuthError(error, 'We could not sign you in.'),
          });
          return { ok: true, next: 'verify' };
        }

        set({
          isSubmitting: false,
          error: describeAuthError(error, 'We could not sign you in. Try again.'),
        });
        return { ok: false };
      }

      await applySession(data.session);
      set({ isSubmitting: false, pendingEmail: null });
      return { ok: true, next: nextFromStatus() };
    },

    signUpWithEmail: async (email, password) => {
      if (get().isSubmitting) return { ok: false };
      const trimmed = email.trim();
      set({ isSubmitting: true, error: null, notice: null });

      const { data, error } = await bilt.auth.signUp({ email: trimmed, password });

      if (error) {
        set({
          isSubmitting: false,
          error: describeAuthError(error, 'We could not create your account. Try again.'),
        });
        return { ok: false };
      }

      // An existing address comes back as a user with no identities rather than
      // an error, so signing up twice is not mistaken for a new account.
      if (data.user && (data.user.identities?.length ?? 0) === 0) {
        set({
          isSubmitting: false,
          error: {
            message: 'An account already uses this email. Sign in instead.',
            field: 'email',
          },
        });
        return { ok: false };
      }

      if (data.session) {
        await applySession(data.session);
        set({ isSubmitting: false, pendingEmail: null });
        return { ok: true, next: nextFromStatus() };
      }

      set({ isSubmitting: false, pendingEmail: trimmed });
      return { ok: true, next: 'verify' };
    },

    verifyEmailCode: async (code) => {
      const email = get().pendingEmail;
      if (!email || get().isSubmitting) return { ok: false };

      set({ isSubmitting: true, error: null, notice: null });

      const { data, error } = await bilt.auth.verifyOtp({
        email,
        token: code.trim(),
        type: 'signup',
      });

      if (error || !data.session) {
        set({
          isSubmitting: false,
          error: describeAuthError(error, 'That code did not work. Send yourself a new one.'),
        });
        return { ok: false };
      }

      await applySession(data.session);
      set({ isSubmitting: false, pendingEmail: null });
      return { ok: true, next: nextFromStatus() };
    },

    resendEmailCode: async () => {
      const email = get().pendingEmail;
      if (!email) return;
      set({ error: null, notice: null });

      const { error } = await bilt.auth.resend({ type: 'signup', email });
      if (error) {
        set({ error: describeAuthError(error, 'We could not send another code just yet.') });
        return;
      }
      set({ notice: `A new code is on its way to ${email}.` });
    },

    signInWithGoogle: async () => {
      if (get().isSubmitting) return { ok: false };
      set({ isSubmitting: true, error: null, notice: null });

      const outcome = await startGoogleSignIn();

      if (outcome.kind === 'redirecting') {
        // The page is leaving; keep the button busy until it does.
        return { ok: true };
      }
      if (outcome.kind === 'cancelled') {
        set({ isSubmitting: false });
        return { ok: false };
      }
      if (outcome.kind === 'failed') {
        set({
          isSubmitting: false,
          error: describeAuthError(outcome.error, 'Google sign-in did not finish. Try again.'),
        });
        return { ok: false };
      }

      const { data } = await bilt.auth.getSession();
      await applySession(data.session);
      set({ isSubmitting: false, pendingEmail: null });
      return { ok: true, next: nextFromStatus() };
    },

    saveProfile: async ({ displayName, avatar }) => {
      const userId = get().userId;
      const name = displayName.trim().slice(0, DISPLAY_NAME_MAX_LENGTH);

      if (!userId) {
        set({ error: { message: 'Your session expired. Sign in again.', field: null } });
        return false;
      }
      if (name.length === 0) {
        set({
          error: { message: 'Add a display name so listeners know who you are.', field: 'name' },
        });
        return false;
      }
      if (get().isSavingProfile) return false;

      set({ isSavingProfile: true, error: null, notice: null });

      let avatarUrl = get().account?.avatarUrl ?? null;
      if (avatar) {
        try {
          avatarUrl = await uploadAvatar(userId, avatar);
        } catch (uploadError) {
          set({
            isSavingProfile: false,
            error: {
              message:
                uploadError instanceof AvatarError
                  ? uploadError.message
                  : 'Your photo did not upload. Skip it and add one later.',
              field: null,
            },
          });
          return false;
        }
      }

      const email = get().email;
      const { data, error } = await bilt
        .from('profiles')
        .upsert(
          {
            id: userId,
            display_name: name,
            handle: handleFrom(name, email ?? ''),
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' },
        )
        .select(PROFILE_COLUMNS)
        .single();

      if (error || !data) {
        set({
          isSavingProfile: false,
          error: {
            message: 'We could not save your profile. Check your connection and try again.',
            field: null,
          },
        });
        return false;
      }

      set({
        status: 'signed-in',
        account: toAccount(data, email),
        suggestedName: name,
        isSavingProfile: false,
      });
      return true;
    },

    signOut: async () => {
      await bilt.auth.signOut();
      // Nothing tied to the previous account may stay on screen.
      useFeedStore.getState().clearAccountState();
      set({
        status: 'signed-out',
        userId: null,
        email: null,
        account: null,
        pendingEmail: null,
        suggestedName: '',
        error: null,
        notice: null,
      });
    },
  };
});
