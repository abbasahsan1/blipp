import { logListenSeconds } from '@/lib/posts';
import { useFeedStore } from '@/lib/store/feedStore';

/**
 * Identifies this run of the app, so listening is grouped per session: one row
 * per post per session, whether the listener is signed in or browsing as a
 * guest.
 */
export const LISTEN_SESSION_ID = `${Date.now().toString(36)}-${Math.random()
  .toString(36)
  .slice(2, 10)}`;

/** Listened seconds are sent once this much has piled up, not only at the end. */
const FLUSH_AFTER_SECONDS = 10;

/** Listened seconds recorded locally but not yet sent, per post. */
const pending = new Map<string, number>();
/** Posts with a request in flight, so seconds are never sent twice. */
const inFlight = new Set<string>();

/**
 * Sends one post's whole pending seconds. The fractional remainder stays behind
 * for the next flush, and a failed request puts its seconds back so nothing is
 * lost when the connection drops mid-listen.
 */
async function flushPost(postId: string): Promise<void> {
  if (inFlight.has(postId)) return;

  const accumulated = pending.get(postId) ?? 0;
  const seconds = Math.floor(accumulated);
  if (seconds < 1) return;

  pending.set(postId, accumulated - seconds);
  inFlight.add(postId);
  try {
    const outcome = await logListenSeconds(postId, LISTEN_SESSION_ID, seconds);
    if (!outcome.ok) {
      pending.set(postId, (pending.get(postId) ?? 0) + seconds);
      return;
    }
    if (outcome.totalListenSeconds !== null) {
      useFeedStore.getState().setListenTotal(postId, outcome.totalListenSeconds);
    }
  } finally {
    inFlight.delete(postId);
  }
}

/**
 * Adds audio that was actually heard. Called from the audio engine for every
 * status update while a post is playing, so partial listens count even when the
 * listener skips away long before the end.
 */
export function recordListenSeconds(postId: string, seconds: number): void {
  if (!(seconds > 0)) return;
  const accumulated = (pending.get(postId) ?? 0) + seconds;
  pending.set(postId, accumulated);
  if (accumulated >= FLUSH_AFTER_SECONDS) void flushPost(postId);
}

/** Sends everything listened to but not yet logged — on pause, skip or stop. */
export function flushListenSeconds(): void {
  const postIds = Array.from(pending.keys());
  for (const postId of postIds) void flushPost(postId);
}
