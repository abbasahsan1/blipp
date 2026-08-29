import { CalendarDays, Headphones, LogOut, Mail, Mic, TriangleAlert } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Button, Dialog, Separator, Spinner, Surface, Typography } from 'heroui-native';

import { AudioPostCard } from '@/components/audio/AudioPostCard';
import { AudioPostSkeleton } from '@/components/audio/AudioPostSkeleton';
import { Avatar } from '@/components/Avatar';
import { SignInGate } from '@/components/auth/SignInGate';
import { formatCount } from '@/lib/format';
import { MINI_PLAYER_INSET } from '@/lib/layout';
import { PALETTE } from '@/lib/palette';
import { useFeedStore } from '@/lib/store/feedStore';
import { usePlayerStore } from '@/lib/store/playerStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useUploadStore } from '@/lib/store/uploadStore';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();

  const status = useSessionStore((state) => state.status);
  const userId = useSessionStore((state) => state.userId);
  const account = useSessionStore((state) => state.account);
  const signOut = useSessionStore((state) => state.signOut);

  const myPosts = useFeedStore((state) => state.myPosts);
  const isMineLoading = useFeedStore((state) => state.isMineLoading);
  const mineError = useFeedStore((state) => state.mineError);
  const loadMyPosts = useFeedStore((state) => state.loadMyPosts);
  const toggleLike = useFeedStore((state) => state.toggleLike);
  const deletePost = useFeedStore((state) => state.deletePost);

  const currentId = usePlayerStore((state) => state.currentId);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const position = usePlayerStore((state) => state.position);
  const duration = usePlayerStore((state) => state.duration);
  const playPost = usePlayerStore((state) => state.playPost);
  const stopPlayback = usePlayerStore((state) => state.stop);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const myPostIds = useMemo(() => myPosts.map((post) => post.id), [myPosts]);
  const totalLikes = useMemo(() => myPosts.reduce((sum, post) => sum + post.likes, 0), [myPosts]);
  const totalListens = useMemo(() => myPosts.reduce((sum, post) => sum + post.plays, 0), [myPosts]);

  const pendingDelete = myPosts.find((post) => post.id === pendingDeleteId) ?? null;
  const bottomPadding = (currentId ? MINI_PLAYER_INSET : 0) + insets.bottom + 24;

  // Reload on every visit so posts published or removed elsewhere stay in step.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      void loadMyPosts(userId);
    }, [userId, loadMyPosts]),
  );

  const handleDelete = async (postId: string) => {
    setPendingDeleteId(null);
    setDeleteError(null);
    setDeletingId(postId);
    // Nothing should keep playing from a post that is being removed.
    if (currentId === postId) stopPlayback();
    const failure = await deletePost(postId);
    setDeletingId(null);
    if (failure) setDeleteError(failure);
  };

  if (status === 'loading') {
    return (
      <View className="bg-background flex-1 items-center justify-center gap-3">
        <Spinner size="lg" />
        <Typography type="body-sm" color="muted">
          Loading your profile…
        </Typography>
      </View>
    );
  }

  if (status === 'signed-out') {
    return (
      <SignInGate
        variant="signed-out"
        icon={<Headphones color={PALETTE.muted} size={26} />}
        title="You are browsing as a guest"
        message="Sign in to see your posts and account details. Listening works either way."
      />
    );
  }

  if (status === 'needs-profile' || !account) {
    return (
      <SignInGate
        variant="needs-profile"
        icon={<Headphones color={PALETTE.muted} size={26} />}
        title="Finish setting up"
        message="Add a display name and, if you like, a photo. Then your profile shows up here."
      />
    );
  }

  return (
    <View className="bg-background flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPadding }}
        showsVerticalScrollIndicator={false}
      >
        <Surface className="mt-2 rounded-3xl p-5">
          <View className="flex-row items-center gap-4">
            <Avatar
              initials={account.initials}
              gradient={account.gradient}
              url={account.avatarUrl}
              size={72}
              textType="h4"
            />
            <View className="flex-1">
              <Typography type="h5" numberOfLines={1}>
                {account.name}
              </Typography>
              <Typography type="body-sm" color="muted">
                {account.handle}
              </Typography>
            </View>
          </View>

          {account.bio.length > 0 ? (
            <Typography type="body-sm" color="muted" className="mt-4">
              {account.bio}
            </Typography>
          ) : null}

          <View className="mt-5 flex-row">
            <View className="flex-1 items-center">
              <Typography type="body" weight="semibold">
                {myPosts.length}
              </Typography>
              <Typography type="body-xs" color="muted">
                Posts
              </Typography>
            </View>
            <View className="flex-1 items-center">
              <Typography type="body" weight="semibold">
                {formatCount(totalListens)}
              </Typography>
              <Typography type="body-xs" color="muted">
                Listens
              </Typography>
            </View>
            <View className="flex-1 items-center">
              <Typography type="body" weight="semibold">
                {formatCount(totalLikes)}
              </Typography>
              <Typography type="body-xs" color="muted">
                Likes
              </Typography>
            </View>
          </View>
        </Surface>

        <Surface variant="secondary" className="mt-4 rounded-3xl px-4">
          <View className="flex-row items-center gap-3 py-3.5">
            <Mail color={PALETTE.muted} size={18} />
            <Typography type="body-sm" color="muted" className="flex-1">
              Email
            </Typography>
            <Typography type="body-sm">{account.email}</Typography>
          </View>
          <Separator />
          <View className="flex-row items-center gap-3 py-3.5">
            <CalendarDays color={PALETTE.muted} size={18} />
            <Typography type="body-sm" color="muted" className="flex-1">
              Member since
            </Typography>
            <Typography type="body-sm">{account.memberSince}</Typography>
          </View>
        </Surface>

        <Typography type="body-xs" color="muted" className="mt-7 mb-3">
          YOUR POSTS
        </Typography>

        {deleteError ? (
          <Surface
            variant="secondary"
            className="border-danger mb-3 flex-row items-center gap-3 rounded-2xl border p-3.5"
          >
            <TriangleAlert color={PALETTE.danger} size={18} />
            <Typography type="body-xs" color="muted" className="flex-1">
              {deleteError}
            </Typography>
          </Surface>
        ) : null}

        {isMineLoading && myPosts.length === 0 ? (
          <AudioPostSkeleton count={2} />
        ) : mineError ? (
          <Surface className="items-center rounded-3xl p-6">
            <TriangleAlert color={PALETTE.danger} size={24} />
            <Typography type="body-sm" weight="semibold" align="center" className="mt-3">
              Your posts didn’t load
            </Typography>
            <Typography type="body-xs" color="muted" align="center" className="mt-1">
              {mineError}
            </Typography>
            <Button
              size="sm"
              variant="tertiary"
              className="mt-4"
              onPress={() => userId && void loadMyPosts(userId)}
            >
              <Button.Label>Try again</Button.Label>
            </Button>
          </Surface>
        ) : myPosts.length === 0 ? (
          <Surface className="items-center rounded-3xl p-6">
            <Mic color={PALETTE.muted} size={26} />
            <Typography type="body-sm" weight="semibold" align="center" className="mt-3">
              You haven’t posted anything yet
            </Typography>
            <Typography type="body-xs" color="muted" align="center" className="mt-1">
              Upload your first clip and it will show up here.
            </Typography>
            <Button
              size="sm"
              variant="tertiary"
              className="mt-4"
              onPress={() => router.navigate('/upload')}
            >
              <Button.Label>Go to Upload</Button.Label>
            </Button>
          </Surface>
        ) : (
          <View className="gap-3">
            {myPosts.map((post) => {
              const isCurrent = post.id === currentId;
              const total = isCurrent && duration > 0 ? duration : post.durationSec;
              return (
                <AudioPostCard
                  key={post.id}
                  post={post}
                  creator={post.creator}
                  isCurrent={isCurrent}
                  isPlaying={isCurrent && isPlaying}
                  progress={isCurrent && total > 0 ? Math.min(1, position / total) : 0}
                  onPress={() => playPost(post.id, myPostIds, { expand: true })}
                  onToggleLike={() => void toggleLike(post.id, userId)}
                  onDelete={() => setPendingDeleteId(post.id)}
                  isDeleting={deletingId === post.id}
                />
              );
            })}
          </View>
        )}

        <Button variant="danger-soft" className="mt-7" onPress={() => setIsConfirmOpen(true)}>
          <Button.Label>
            <View className="flex-row items-center gap-2">
              <LogOut color={PALETTE.danger} size={18} />
              <Typography type="body" weight="semibold" className="text-danger">
                Sign out
              </Typography>
            </View>
          </Button.Label>
        </Button>
      </ScrollView>

      <Dialog isOpen={pendingDelete !== null} onOpenChange={() => setPendingDeleteId(null)}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content className="w-full max-w-sm">
            <Dialog.Title>Delete this post?</Dialog.Title>
            <Dialog.Description>
              “{pendingDelete?.title}” and its audio file are removed for everyone. This cannot be
              undone.
            </Dialog.Description>
            <View className="mt-5 flex-row gap-3">
              <Button
                variant="tertiary"
                className="flex-1"
                onPress={() => setPendingDeleteId(null)}
              >
                <Button.Label>Keep it</Button.Label>
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onPress={() => {
                  if (pendingDelete) void handleDelete(pendingDelete.id);
                }}
              >
                <Button.Label>Delete</Button.Label>
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>

      <Dialog isOpen={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content className="w-full max-w-sm">
            <Dialog.Title>Sign out of Blipp?</Dialog.Title>
            <Dialog.Description>
              Playback stops and any unsaved upload draft is cleared. You can still browse the feed.
            </Dialog.Description>
            <View className="mt-5 flex-row gap-3">
              <Button variant="tertiary" className="flex-1" onPress={() => setIsConfirmOpen(false)}>
                <Button.Label>Cancel</Button.Label>
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onPress={() => {
                  setIsConfirmOpen(false);
                  stopPlayback();
                  // A signed-out device must not keep the previous user's draft.
                  useUploadStore.getState().reset();
                  void signOut();
                }}
              >
                <Button.Label>Sign out</Button.Label>
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </View>
  );
}
