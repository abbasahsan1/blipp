export interface Creator {
  /** Auth user id of the account that owns this profile. */
  id: string;
  name: string;
  handle: string;
  initials: string;
  /** Hex gradient pair used for avatars and cover art. */
  gradient: [string, string];
  /** Uploaded profile photo. Falls back to the gradient initials when absent. */
  avatarUrl?: string | null;
  bio: string;
}

/**
 * The fixed list offered when publishing from the Upload tab, and therefore the
 * only categories posts can carry.
 */
export const UPLOAD_CATEGORIES = [
  'Interview',
  'Tech Review',
  'Story',
  'Skit',
  'Discussion',
  'Other',
] as const;

export type UploadCategory = (typeof UPLOAD_CATEGORIES)[number];

export interface AudioPost {
  id: string;
  title: string;
  description: string;
  /** Profile of the account that published it. */
  creator: Creator;
  /** Auth user id of the owner, used for ownership checks. */
  creatorId: string;
  category: string;
  /** Public URL of the stored audio file. */
  audioUrl: string;
  /** Object path inside the audio bucket, needed to delete the file. */
  audioPath: string;
  /**
   * Duration in seconds as measured when the file was picked, corrected to the
   * real file length the first time the player loads it.
   */
  durationSec: number;
  plays: number;
  likes: number;
  /** Seconds listened by everyone, across every session, since it was posted. */
  totalListenSeconds: number;
  /** Epoch milliseconds. */
  createdAt: number;
  /** Normalized bar heights (0..1) used to draw the waveform. */
  waveform: number[];
  isLiked: boolean;
}

/**
 * Ordering offered by the feed's header chips. 'most_listened' ranks by
 * accumulated listening time and is the default.
 */
export type FeedSort = 'most_listened' | 'newest';

export interface Account extends Creator {
  email: string;
  memberSince: string;
}
