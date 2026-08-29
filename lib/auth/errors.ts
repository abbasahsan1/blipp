/**
 * Turns backend auth errors into wording a listener can act on, plus the field
 * the message belongs to so the form can mark the right input invalid.
 */
export type AuthErrorField =
  | 'email'
  | 'password'
  | 'credentials'
  | 'code'
  | 'google'
  | 'name'
  | null;

export interface AuthFailure {
  message: string;
  field: AuthErrorField;
}

function messageOf(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' ? message : '';
  }
  return '';
}

function statusOf(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}

/** True when the account exists but the email was never confirmed. */
export function isEmailNotConfirmed(error: unknown): boolean {
  return messageOf(error).toLowerCase().includes('email not confirmed');
}

export function describeAuthError(error: unknown, fallback: string): AuthFailure {
  const raw = messageOf(error).toLowerCase();
  const status = statusOf(error);

  if (raw.includes('invalid login credentials') || raw.includes('invalid credentials')) {
    return {
      message: 'That email and password do not match an account. Check both and try again.',
      field: 'credentials',
    };
  }

  if (raw.includes('email not confirmed')) {
    return {
      message: 'This email is not confirmed yet. Enter the code we just sent you.',
      field: 'code',
    };
  }

  if (raw.includes('already registered') || raw.includes('already been registered')) {
    return { message: 'An account already uses this email. Sign in instead.', field: 'email' };
  }

  if (raw.includes('unable to validate email') || raw.includes('invalid email')) {
    return { message: 'That email address does not look right.', field: 'email' };
  }

  if (raw.includes('password should be at least') || raw.includes('weak password')) {
    return { message: 'Use at least 8 characters for your password.', field: 'password' };
  }

  if (
    raw.includes('token has expired') ||
    raw.includes('invalid token') ||
    raw.includes('otp_expired') ||
    raw.includes('invalid otp')
  ) {
    return {
      message: 'That code is wrong or has expired. Send yourself a new one.',
      field: 'code',
    };
  }

  if (raw.includes('for security purposes') || raw.includes('rate limit') || status === 429) {
    return { message: 'Too many attempts. Wait a minute and try again.', field: null };
  }

  if (
    raw.includes('provider is not enabled') ||
    raw.includes('unsupported provider') ||
    raw.includes('provider not found')
  ) {
    return {
      message:
        'Google sign-in is not switched on for this app yet. Use email and password for now.',
      field: 'google',
    };
  }

  if (raw.includes('email logins are disabled') || raw.includes('signups not allowed')) {
    return { message: 'Email sign-in is switched off for this app right now.', field: null };
  }

  if (
    raw.includes('network request failed') ||
    raw.includes('failed to fetch') ||
    raw.includes('load failed') ||
    raw.includes('network error')
  ) {
    return {
      message: 'We could not reach the server. Check your connection and try again.',
      field: null,
    };
  }

  return { message: fallback, field: null };
}
