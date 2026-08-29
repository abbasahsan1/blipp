import { create } from 'zustand';

import { makeWaveform, MOCK_POSTS, MY_CREATOR_ID, sampleAudioUrl } from '@/lib/mockData';
import type { AudioPost, FeedCategory, NewPostInput } from '@/lib/types';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface FeedState {
  posts: AudioPost[];
  category: FeedCategory;
  isLoading: boolean;
  isRefreshing: boolean;
  hasLoaded: boolean;
  loadFeed: () => Promise<void>;
  refresh: () => Promise<void>;
  setCategory: (category: FeedCategory) => Promise<void>;
  toggleLike: (postId: string) => void;
  addPost: (input: NewPostInput) => AudioPost;
  /** Replaces a post's estimated duration with the real length of its audio file. */
  syncDuration: (postId: string, durationSec: number) => void;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  category: 'for-you',
  isLoading: false,
  isRefreshing: false,
  hasLoaded: false,

  loadFeed: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    // Placeholder for a real request while there is no backend yet.
    await delay(900);
    set({ posts: MOCK_POSTS, isLoading: false, hasLoaded: true });
  },

  refresh: async () => {
    if (get().isRefreshing) return;
    set({ isRefreshing: true });
    await delay(1_100);
    set({ isRefreshing: false });
  },

  setCategory: async (category) => {
    if (get().category === category) return;
    set({ category, isLoading: true });
    await delay(550);
    set({ isLoading: false });
  },

  toggleLike: (postId) => {
    set((state) => ({
      posts: state.posts.map((post) =>
        post.id === postId
          ? { ...post, isLiked: !post.isLiked, likes: post.likes + (post.isLiked ? -1 : 1) }
          : post,
      ),
    }));
  },

  addPost: (input) => {
    const post: AudioPost = {
      id: `p-local-${Date.now()}`,
      title: input.title.trim(),
      description: input.description.trim(),
      creatorId: MY_CREATOR_ID,
      category: input.category,
      // Uploads carry the picked file; anything without one borrows a placeholder clip.
      audioUrl: input.audioUrl ?? sampleAudioUrl(get().posts.length),
      durationSec: Math.max(1, Math.round(input.durationSec)),
      plays: 0,
      likes: 0,
      comments: 0,
      tags: input.tags ?? [],
      createdAt: Date.now(),
      waveform:
        input.waveform && input.waveform.length > 8
          ? input.waveform
          : makeWaveform(Date.now() % 9_999),
      isLiked: false,
    };
    // 'for-you' keeps insertion order, so a brand new post lands at the top of
    // the feed instead of being sorted away by plays.
    set((state) => ({ posts: [post, ...state.posts], category: 'for-you' }));
    return post;
  },

  syncDuration: (postId, durationSec) => {
    const rounded = Math.round(durationSec);
    if (rounded <= 0) return;
    const existing = get().posts.find((post) => post.id === postId);
    if (!existing || existing.durationSec === rounded) return;
    set((state) => ({
      posts: state.posts.map((post) =>
        post.id === postId ? { ...post, durationSec: rounded } : post,
      ),
    }));
  },
}));

export function sortPostsForCategory(posts: AudioPost[], category: FeedCategory): AudioPost[] {
  if (category === 'trending') return [...posts].sort((a, b) => b.plays - a.plays);
  if (category === 'fresh') return [...posts].sort((a, b) => b.createdAt - a.createdAt);
  return posts;
}
