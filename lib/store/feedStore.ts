import { create } from 'zustand';

import {
  countPostPlay,
  deletePost as deletePostRow,
  fetchPosts,
  PostsError,
  setPostLiked,
} from '@/lib/posts';
import type { AudioPost, FeedSort } from '@/lib/types';

const GENERIC_ERROR = 'Something went wrong loading posts. Try again.';

function messageFor(error: unknown): string {
  return error instanceof PostsError ? error.message : GENERIC_ERROR;
}

interface FeedState {
  /** Public feed: every account's posts, newest first. */
  posts: AudioPost[];
  /** The signed-in user's own posts, shown on the Profile tab. */
  myPosts: AudioPost[];
  sort: FeedSort;
  isLoading: boolean;
  isRefreshing: boolean;
  hasLoaded: boolean;
  error: string | null;
  /** Viewer the loaded feed belongs to, so likes are reloaded when it changes. */
  loadedFor: string | null;
  isMineLoading: boolean;
  mineError: string | null;

  loadFeed: (viewerId: string | null) => Promise<void>;
  refresh: (viewerId: string | null) => Promise<void>;
  setSort: (sort: FeedSort) => void;
  loadMyPosts: (userId: string) => Promise<void>;
  /** Optimistic like toggle, reconciled with the count the server returns. */
  toggleLike: (postId: string, viewerId: string | null) => Promise<void>;
  /** Puts a freshly published post at the top of both lists. */
  addPost: (post: AudioPost) => void;
  /** Deletes one of the user's own posts. Returns an error message on failure. */
  deletePost: (postId: string) => Promise<string | null>;
  countPlay: (postId: string) => void;
  /** Replaces a post's stored duration with the real length of its audio file. */
  syncDuration: (postId: string, durationSec: number) => void;
  /** Drops everything tied to the previous account after signing out. */
  clearAccountState: () => void;
}

/** Posts already counted as played in this session, so a replay is not double counted. */
const countedPlays = new Set<string>();

export const useFeedStore = create<FeedState>((set, get) => {
  /** Applies a change to a post wherever it appears. */
  const patch = (postId: string, change: (post: AudioPost) => AudioPost): void => {
    const apply = (list: AudioPost[]) =>
      list.map((post) => (post.id === postId ? change(post) : post));
    set((state) => ({ posts: apply(state.posts), myPosts: apply(state.myPosts) }));
  };

  return {
    posts: [],
    myPosts: [],
    sort: 'newest',
    isLoading: false,
    isRefreshing: false,
    hasLoaded: false,
    error: null,
    loadedFor: null,
    isMineLoading: false,
    mineError: null,

    loadFeed: async (viewerId) => {
      if (get().isLoading) return;
      set({ isLoading: true, error: null });
      try {
        const posts = await fetchPosts({ viewerId });
        set({ posts, isLoading: false, hasLoaded: true, loadedFor: viewerId });
      } catch (error) {
        // loadedFor moves even on failure: the screen shows a retry action
        // instead of asking for the same viewer's feed again and again.
        set({
          isLoading: false,
          hasLoaded: true,
          error: messageFor(error),
          loadedFor: viewerId,
        });
      }
    },

    refresh: async (viewerId) => {
      if (get().isRefreshing) return;
      set({ isRefreshing: true, error: null });
      try {
        const posts = await fetchPosts({ viewerId });
        set({ posts, isRefreshing: false, loadedFor: viewerId });
      } catch (error) {
        set({ isRefreshing: false, error: messageFor(error), loadedFor: viewerId });
      }
    },

    setSort: (sort) => {
      if (get().sort === sort) return;
      set({ sort });
    },

    loadMyPosts: async (userId) => {
      if (get().isMineLoading) return;
      set({ isMineLoading: true, mineError: null });
      try {
        const myPosts = await fetchPosts({ ownerId: userId, viewerId: userId });
        set({ myPosts, isMineLoading: false });
      } catch (error) {
        set({ isMineLoading: false, mineError: messageFor(error) });
      }
    },

    toggleLike: async (postId, viewerId) => {
      // Liking is recorded per account, so it needs a signed-in listener.
      if (!viewerId) return;
      const current =
        get().posts.find((post) => post.id === postId) ??
        get().myPosts.find((post) => post.id === postId);
      if (!current) return;

      const liked = !current.isLiked;
      patch(postId, (post) => ({
        ...post,
        isLiked: liked,
        likes: Math.max(0, post.likes + (liked ? 1 : -1)),
      }));

      const outcome = await setPostLiked(postId, liked);
      if (!outcome.ok) {
        // The like did not stick, so the heart goes back to what the server has.
        patch(postId, (post) => ({
          ...post,
          isLiked: current.isLiked,
          likes: current.likes,
        }));
        return;
      }
      const confirmed = outcome.likes;
      if (confirmed !== null) {
        patch(postId, (post) => ({ ...post, likes: confirmed }));
      }
    },

    addPost: (post) => {
      set((state) => ({
        posts: [post, ...state.posts.filter((item) => item.id !== post.id)],
        myPosts: [post, ...state.myPosts.filter((item) => item.id !== post.id)],
        // A brand new post is the newest, so the feed shows it first.
        sort: 'newest',
      }));
    },

    deletePost: async (postId) => {
      const post =
        get().myPosts.find((item) => item.id === postId) ??
        get().posts.find((item) => item.id === postId);
      if (!post) return null;

      try {
        await deletePostRow({ id: post.id, audioPath: post.audioPath });
      } catch (error) {
        return messageFor(error);
      }

      set((state) => ({
        posts: state.posts.filter((item) => item.id !== postId),
        myPosts: state.myPosts.filter((item) => item.id !== postId),
      }));
      return null;
    },

    countPlay: (postId) => {
      if (countedPlays.has(postId)) return;
      countedPlays.add(postId);
      patch(postId, (post) => ({ ...post, plays: post.plays + 1 }));
      void countPostPlay(postId);
    },

    syncDuration: (postId, durationSec) => {
      const rounded = Math.round(durationSec);
      if (rounded <= 0) return;
      const existing =
        get().posts.find((post) => post.id === postId) ??
        get().myPosts.find((post) => post.id === postId);
      if (!existing || existing.durationSec === rounded) return;
      patch(postId, (post) => ({ ...post, durationSec: rounded }));
    },

    clearAccountState: () => {
      set((state) => ({
        posts: state.posts.map((post) => (post.isLiked ? { ...post, isLiked: false } : post)),
        myPosts: [],
        mineError: null,
        loadedFor: null,
      }));
    },
  };
});

/** Finds a post in either list, so the player can play from the feed or a profile. */
export function selectPost(
  state: { posts: AudioPost[]; myPosts: AudioPost[] },
  postId: string | null,
): AudioPost | undefined {
  if (!postId) return undefined;
  return (
    state.posts.find((post) => post.id === postId) ??
    state.myPosts.find((post) => post.id === postId)
  );
}

/** Rows come back newest first, so only 'trending' needs re-ordering. */
export function sortPosts(posts: AudioPost[], sort: FeedSort): AudioPost[] {
  if (sort === 'trending') {
    return [...posts].sort((a, b) => b.plays - a.plays || b.likes - a.likes);
  }
  return posts;
}
