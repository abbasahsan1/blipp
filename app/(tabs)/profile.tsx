import { BadgeCheck, Headphones, LogOut, Mail, Mic, CalendarDays } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button, Dialog, Separator, Spinner, Surface, Typography } from 'heroui-native';

import { AudioPostCard } from '@/components/audio/AudioPostCard';
import { AudioPostSkeleton } from '@/components/audio/AudioPostSkeleton';
import { CoverArt } from '@/components/audio/CoverArt';
import { formatCount } from '@/lib/format';
import { MINI_PLAYER_INSET } from '@/lib/layout';
import { CREATORS_BY_ID, MY_CREATOR_ID } from '@/lib/mockData';
import { PALETTE } from '@/lib/palette';
import { useFeedStore } from '@/lib/store/feedStore';
import { usePlayerStore } from '@/lib/store/playerStore';
import { useSessionStore } from '@/lib/store/sessionStore';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();

  const status = useSessionStore((state) => state.status);
  const account = useSessionStore((state) => state.account);
  const isLoadingProfile = useSessionStore((state) => state.isLoadingProfile);
  const isSigningIn = useSessionStore((state) => state.isSigningIn);
  const signIn = useSessionStore((state) => state.signIn);
  const signOut = useSessionStore((state) => state.signOut);

  const posts = useFeedStore((state) => state.posts);
  const isFeedLoading = useFeedStore((state) => state.isLoading);
  const toggleLike = useFeedStore((state) => state.toggleLike);

  const currentId = usePlayerStore((state) => state.currentId);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const position = usePlayerStore((state) => state.position);
  const duration = usePlayerStore((state) => state.duration);
  const playPost = usePlayerStore((state) => state.playPost);
  const stopPlayback = usePlayerStore((state) => state.stop);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const myPosts = useMemo(() => posts.filter((post) => post.creatorId === MY_CREATOR_ID), [posts]);
  const myPostIds = useMemo(() => myPosts.map((post) => post.id), [myPosts]);
  const totalLikes = useMemo(() => myPosts.reduce((sum, post) => sum + post.likes, 0), [myPosts]);

  const bottomPadding = (currentId ? MINI_PLAYER_INSET : 0) + insets.bottom + 24;

  if (status === 'signed-out') {
    return (
      <View className="bg-background flex-1 items-center justify-center px-8">
        <View className="bg-surface-secondary h-16 w-16 items-center justify-center rounded-full">
          <Headphones color={PALETTE.muted} size={26} />
        </View>
        <Typography type="h4" align="center" className="mt-5">
          You are signed out
        </Typography>
        <Typography type="body-sm" color="muted" align="center" className="mt-2">
          Sign back in to see your posts, listening stats and account details.
        </Typography>
        <Button
          size="lg"
          className="mt-6 w-full"
          isDisabled={isSigningIn}
          onPress={() => void signIn()}
        >
          <Button.Label>
            {isSigningIn ? (
              <View className="flex-row items-center gap-2">
                <Spinner size="sm" />
                <Typography
                  type="body"
                  weight="semibold"
                  style={{ color: PALETTE.accentForeground }}
                >
                  Signing in…
                </Typography>
              </View>
            ) : (
              <Typography type="body" weight="semibold" style={{ color: PALETTE.accentForeground }}>
                Sign in
              </Typography>
            )}
          </Button.Label>
        </Button>
        <Typography type="body-xs" color="muted" align="center" className="mt-4">
          Accounts are mocked until a backend is connected.
        </Typography>
      </View>
    );
  }

  if (isLoadingProfile || !account) {
    return (
      <View className="bg-background flex-1 items-center justify-center gap-3">
        <Spinner size="lg" />
        <Typography type="body-sm" color="muted">
          Loading your profile…
        </Typography>
      </View>
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
            <CoverArt gradient={account.gradient} size={72} radius={36}>
              <Typography type="h4" style={{ color: PALETTE.onCover }}>
                {account.initials}
              </Typography>
            </CoverArt>
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                <Typography type="h5" numberOfLines={1}>
                  {account.name}
                </Typography>
                {account.isVerified ? <BadgeCheck color={PALETTE.accent} size={16} /> : null}
              </View>
              <Typography type="body-sm" color="muted">
                {account.handle}
              </Typography>
            </View>
          </View>

          <Typography type="body-sm" color="muted" className="mt-4">
            {account.bio}
          </Typography>

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
                {formatCount(account.totalListens)}
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
            <View className="flex-1 items-center">
              <Typography type="body" weight="semibold">
                {formatCount(account.followers)}
              </Typography>
              <Typography type="body-xs" color="muted">
                Followers
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

        {isFeedLoading ? (
          <AudioPostSkeleton count={2} />
        ) : myPosts.length === 0 ? (
          <Surface className="items-center rounded-3xl p-6">
            <Mic color={PALETTE.muted} size={26} />
            <Typography type="body-sm" weight="semibold" align="center" className="mt-3">
              No posts yet
            </Typography>
            <Typography type="body-xs" color="muted" align="center" className="mt-1">
              Record your first clip and it will show up here.
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
              const creator = CREATORS_BY_ID[post.creatorId] ?? account;
              const isCurrent = post.id === currentId;
              const total = isCurrent && duration > 0 ? duration : post.durationSec;
              return (
                <AudioPostCard
                  key={post.id}
                  post={post}
                  creator={creator}
                  isCurrent={isCurrent}
                  isPlaying={isCurrent && isPlaying}
                  progress={isCurrent && total > 0 ? Math.min(1, position / total) : 0}
                  onPress={() => playPost(post.id, myPostIds, { expand: true })}
                  onToggleLike={() => toggleLike(post.id)}
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

      <Dialog isOpen={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content className="w-full max-w-sm">
            <Dialog.Title>Sign out of Blipp?</Dialog.Title>
            <Dialog.Description>
              Playback stops and your profile is hidden until you sign back in.
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
                  signOut();
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
