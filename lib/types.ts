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

export interface AudioPost {
  id: string;
  title: string;
  description: string;
  creatorId: string;
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
  tags: string[];
  durationSec: number;
  waveform: number[];
  isPublic: boolean;
}
