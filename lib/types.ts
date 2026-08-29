export interface Creator {
  id: string;
  name: string;
  handle: string;
  initials: string;
  /** Hex gradient pair used for avatars and cover art. */
  gradient: [string, string];
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
] as const;

export type PostCategory = (typeof POST_CATEGORIES)[number];

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
  totalListens: number;
}

export interface NewPostInput {
  title: string;
  description: string;
  category: PostCategory;
  tags: string[];
  durationSec: number;
  waveform: number[];
  isPublic: boolean;
}
