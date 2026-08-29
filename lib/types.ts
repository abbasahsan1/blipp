export interface Creator {
  id: string;
  name: string;
  handle: string;
  initials: string;
  /** Hex gradient pair used for avatars and cover art. */
  gradient: [string, string];
  /** Uploaded profile photo. Falls back to the gradient initials when absent. */
  avatarUrl?: string | null;
  bio: string;
  followers: number;
  isVerified: boolean;
}

/** Content type shown as a chip on every post. */
export const POST_CATEGORIES = [
  'Podcast',
  'Interview',
  'Tech Review',
  'Story',
  'Skit',
  'Discussion',
  'Coaching',
  'Ambient',
  'Journal',
  'Other',
] as const;

export type PostCategory = (typeof POST_CATEGORIES)[number];

/**
 * The fixed list offered when publishing from the Upload tab. Narrower than
 * POST_CATEGORIES, which also covers categories only seeded posts use.
 */
export const UPLOAD_CATEGORIES = [
  'Interview',
  'Tech Review',
  'Story',
  'Skit',
  'Discussion',
  'Other',
] as const satisfies readonly PostCategory[];

export type UploadCategory = (typeof UPLOAD_CATEGORIES)[number];

export interface AudioPost {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  category: PostCategory;
  /** Remote audio file played by the audio engine. */
  audioUrl: string;
  /**
   * Duration in seconds. Seeded from mock data and corrected to the real file
   * length the first time the post is loaded by the player.
   */
  durationSec: number;
  plays: number;
  likes: number;
  comments: number;
  tags: string[];
  /** Epoch milliseconds. */
  createdAt: number;
  /** Normalized bar heights (0..1) used to draw the waveform. */
  waveform: number[];
  isLiked: boolean;
}

export type FeedCategory = 'for-you' | 'trending' | 'fresh';

export interface Account extends Creator {
  email: string;
  memberSince: string;
}

export interface NewPostInput {
  title: string;
  description: string;
  category: PostCategory;
  durationSec: number;
  /** Source of the uploaded file. Falls back to a placeholder clip when absent. */
  audioUrl?: string;
  tags?: string[];
  waveform?: number[];
}
