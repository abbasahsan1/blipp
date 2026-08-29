import { waveformForId } from '@/lib/audio/waveform';
import { bilt } from '@/lib/bilt';
import { type ProfileRow, toCreator } from '@/lib/profile/identity';
import type { AudioPost, Creator, FeedSort } from '@/lib/types';
import { finiteSeconds } from '@/lib/utils';

/** Storage bucket holding every published audio file. */
export const AUDIO_BUCKET = 'audio';

const POST_COLUMNS =
  'id, user_id, title, description, category, duration_sec, audio_path, plays, likes, total_listen_seconds, created_at';
const PROFILE_COLUMNS = 'id, display_name, handle, avatar_url, bio, created_at';
/** How many posts one page of the feed holds. */
const PAGE_SIZE = 100;

const LOAD_FAILED = 'We could not load posts. Check your connection and try again.';

/** Carries wording that is safe to show in the UI as-is. */
export class PostsError extends Error {}

interface PostRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  duration_sec: number;
  audio_path: string;
  plays: number;
  likes: number;
  /** A bigint column, which some responses carry as a string. */
  total_listen_seconds: number | string;
  created_at: string;
}

/** Public URL for a stored audio object, playable without a session. */
export function audioUrlFor(path: string): string {
  return bilt.storage.from(AUDIO_BUCKET).getPublicUrl(path).data.publicUrl;
}

function toAudioPost(row: PostRow, creator: Creator, isLiked: boolean): AudioPost {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    creator,
    creatorId: row.user_id,
    category: row.category,
    audioUrl: audioUrlFor(row.audio_path),
    audioPath: row.audio_path,
    durationSec: Math.round(finiteSeconds(row.duration_sec)),
    plays: Math.max(0, Math.round(row.plays || 0)),
    likes: Math.max(0, Math.round(row.likes || 0)),
    totalListenSeconds: Math.max(0, Math.round(Number(row.total_listen_seconds) || 0)),
    createdAt: new Date(row.created_at).getTime(),
    waveform: waveformForId(row.id),
    isLiked,
  };
}

async function fetchCreators(userIds: string[]): Promise<Map<string, Creator>> {
  const { data, error } = await bilt.from('profiles').select(PROFILE_COLUMNS).in('id', userIds);

  if (error) throw new PostsError(LOAD_FAILED);

  const rows = (data ?? []) as ProfileRow[];
  return new Map(rows.map((row) => [row.id, toCreator(row)]));
}

/**
 * Which of these posts the viewer already liked. A failure here only costs the
 * filled-in hearts, so the feed still loads.
 */
async function fetchLikedIds(viewerId: string, postIds: string[]): Promise<Set<string>> {
  const { data, error } = await bilt
    .from('post_likes')
    .select('post_id')
    .eq('user_id', viewerId)
    .in('post_id', postIds);

  if (error || !data) return new Set();
  return new Set((data as { post_id: string }[]).map((row) => row.post_id));
}

export interface FetchPostsOptions {
  /** Restricts the result to one account's posts. */
  ownerId?: string;
  /** Signed-in user, so their own likes come back marked. Null when browsing anonymously. */
  viewerId?: string | null;
  /** Ranking. Defaults to newest first, which is what a profile wants. */
  sort?: FeedSort;
}

/**
 * A page of posts in the requested order. Public: anyone signed in or not sees
 * every account's posts. Ranking happens in the database so the top of the feed
 * is the top of the whole table, not just of what was already loaded.
 */
export async function fetchPosts({ ownerId, viewerId, sort }: FetchPostsOptions = {}): Promise<
  AudioPost[]
> {
  let query = bilt.from('posts').select(POST_COLUMNS);

  if (sort === 'most_listened') {
    query = query.order('total_listen_seconds', { ascending: false });
  }
  query = query.order('created_at', { ascending: false }).limit(PAGE_SIZE);

  if (ownerId) query = query.eq('user_id', ownerId);

  const { data, error } = await query;
  if (error) throw new PostsError(LOAD_FAILED);

  const rows = (data ?? []) as PostRow[];
  if (rows.length === 0) return [];

  const creators = await fetchCreators([...new Set(rows.map((row) => row.user_id))]);
  const liked = viewerId
    ? await fetchLikedIds(
        viewerId,
        rows.map((row) => row.id),
      )
    : new Set<string>();

  return rows.flatMap((row) => {
    const creator = creators.get(row.user_id);
    return creator ? [toAudioPost(row, creator, liked.has(row.id))] : [];
  });
}

export interface NewPostRecord {
  userId: string;
  title: string;
  description: string;
  category: string;
  durationSec: number;
  audioPath: string;
  /** The publisher's own profile, shown on the post straight away. */
  creator: Creator;
}

/** Creates the post row for an already uploaded audio file. */
export async function insertPost(record: NewPostRecord): Promise<AudioPost> {
  const { data, error } = await bilt
    .from('posts')
    .insert({
      user_id: record.userId,
      title: record.title,
      description: record.description,
      category: record.category,
      duration_sec: Math.round(finiteSeconds(record.durationSec)),
      audio_path: record.audioPath,
    })
    .select(POST_COLUMNS)
    .single();

  if (error || !data) {
    throw new PostsError('Your file uploaded but the post could not be saved. Try posting again.');
  }

  return toAudioPost(data, record.creator, false);
}

/**
 * Deletes one of the caller's own posts. The row goes first because it is what
 * listeners see; the audio file is cleaned up after.
 */
export async function deletePost(post: { id: string; audioPath: string }): Promise<void> {
  const { error } = await bilt.from('posts').delete().eq('id', post.id);
  if (error) throw new PostsError('We could not delete that post. Try again in a moment.');
  await bilt.storage.from(AUDIO_BUCKET).remove([post.audioPath]);
}

export interface LikeOutcome {
  ok: boolean;
  /** Authoritative like count, when the server reported one. */
  likes: number | null;
}

/** Adds or removes the caller's like and reports the post's new like count. */
export async function setPostLiked(postId: string, liked: boolean): Promise<LikeOutcome> {
  const { data, error } = await bilt.rpc(liked ? 'like_post' : 'unlike_post', {
    p_post_id: postId,
  });
  if (error) return { ok: false, likes: null };
  return { ok: true, likes: typeof data === 'number' ? data : null };
}

/** Counts one listen. Open to anonymous listeners, who cannot write posts otherwise. */
export async function countPostPlay(postId: string): Promise<void> {
  await bilt.rpc('increment_post_plays', { p_post_id: postId });
}

export interface ListenOutcome {
  ok: boolean;
  /** The post's accumulated listening time after this batch, when reported. */
  totalListenSeconds: number | null;
}

/**
 * Records seconds actually listened to a post within one listening session, and
 * adds them to the post's running total. Open to anonymous listeners; the row is
 * tied to the account as well when the listener is signed in.
 */
export async function logListenSeconds(
  postId: string,
  sessionId: string,
  seconds: number,
): Promise<ListenOutcome> {
  const whole = Math.floor(seconds);
  if (whole < 1) return { ok: true, totalListenSeconds: null };

  const { data, error } = await bilt.rpc('log_listen_seconds', {
    p_post_id: postId,
    p_session_id: sessionId,
    p_seconds: whole,
  });
  if (error) return { ok: false, totalListenSeconds: null };

  const total = Number(data);
  return { ok: true, totalListenSeconds: Number.isFinite(total) ? total : null };
}
