import { create } from 'zustand';

import { makeWaveform, MOCK_POSTS, MY_CREATOR_ID } from '@/lib/mockData';
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
      durationSec: input.durationSec,
      plays: 0,
      likes: 0,
      comments: 0,
      tags: input.tags,
      createdAt: Date.now(),
      waveform: input.waveform.length > 8 ? input.waveform : makeWaveform(Date.now() % 9_999),
      isLiked: false,
    };
    set((state) => ({ posts: [post, ...state.posts] }));
    return post;
  },
}));

export function sortPostsForCategory(posts: AudioPost[], category: FeedCategory): AudioPost[] {
  if (category === 'trending') return [...posts].sort((a, b) => b.plays - a.plays);
  if (category === 'fresh') return [...posts].sort((a, b) => b.createdAt - a.createdAt);
  return posts;
}
