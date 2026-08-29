import { Camera, ImagePlus, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import {
  Button,
  Description,
  FieldError,
  Input,
  Label,
  Spinner,
  TextField,
  Typography,
} from 'heroui-native';

import { AuthNotice } from '@/components/auth/AuthNotice';
import { Avatar } from '@/components/Avatar';
import { closeAuthFlow } from '@/lib/navigation';
import { PALETTE } from '@/lib/palette';
import { AvatarError, pickAvatarImage, type PickedAvatar } from '@/lib/profile/avatar';
import { gradientForSeed, initialsFrom } from '@/lib/profile/identity';
import { DISPLAY_NAME_MAX_LENGTH, useSessionStore } from '@/lib/store/sessionStore';

const AVATAR_SIZE = 104;

export default function ProfileSetupScreen() {
  const status = useSessionStore((state) => state.status);
  const userId = useSessionStore((state) => state.userId);
  const email = useSessionStore((state) => state.email);
  const suggestedName = useSessionStore((state) => state.suggestedName);
  const isSavingProfile = useSessionStore((state) => state.isSavingProfile);
  const failure = useSessionStore((state) => state.error);
  const saveProfile = useSessionStore((state) => state.saveProfile);
  const signOut = useSessionStore((state) => state.signOut);

  const [displayName, setDisplayName] = useState(suggestedName);
  const [avatar, setAvatar] = useState<PickedAvatar | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);

  // Nothing to set up without an account behind it.
  useEffect(() => {
    if (status === 'signed-out') router.replace('/auth/sign-in');
  }, [status]);

  useEffect(() => {
    setDisplayName((current) => (current.length > 0 ? current : suggestedName));
  }, [suggestedName]);

  const trimmedName = displayName.trim();
  const gradient = gradientForSeed(userId ?? email ?? 'listener');
  const initials = initialsFrom(trimmedName, email);
  const nameInvalid = failure?.field === 'name';

  const handlePick = async () => {
    if (isPicking || isSavingProfile) return;
    setPickError(null);
    setIsPicking(true);
    try {
      const picked = await pickAvatarImage();
      if (picked) setAvatar(picked);
    } catch (error) {
      setPickError(
        error instanceof AvatarError
          ? error.message
          : 'We could not open your photo library. You can skip the photo for now.',
      );
    } finally {
      setIsPicking(false);
    }
  };

  const handleSave = async () => {
    const saved = await saveProfile({ displayName, avatar });
    if (saved) closeAuthFlow();
  };

  return (
    <KeyboardAvoidingView
      className="bg-background flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Typography type="h3">Almost there</Typography>
        <Typography type="body-sm" color="muted" className="mt-1.5">
          This is how you appear on the posts you publish. The photo is optional.
        </Typography>

        <View className="mt-7 items-center">
          <Pressable
            onPress={() => void handlePick()}
            disabled={isPicking || isSavingProfile}
            accessibilityRole="button"
            accessibilityLabel={avatar ? 'Change profile photo' : 'Add a profile photo'}
            className="relative"
          >
            {avatar ? (
              <Image
                source={{ uri: avatar.uri }}
                accessibilityIgnoresInvertColors
                resizeMode="cover"
                style={{
                  width: AVATAR_SIZE,
                  height: AVATAR_SIZE,
                  borderRadius: AVATAR_SIZE / 2,
                  backgroundColor: PALETTE.surfaceSecondary,
                }}
              />
            ) : (
              <Avatar
                initials={initials}
                gradient={gradient}
                size={AVATAR_SIZE}
                textType="h4"
                url={null}
              />
            )}
            <View className="bg-surface-tertiary border-background absolute right-0 bottom-0 h-9 w-9 items-center justify-center rounded-full border-2">
              {isPicking ? <Spinner size="sm" /> : <Camera color={PALETTE.foreground} size={17} />}
            </View>
          </Pressable>

          <View className="mt-3 flex-row items-center gap-2">
            <Button
              size="sm"
              variant="tertiary"
              isDisabled={isPicking || isSavingProfile}
              onPress={() => void handlePick()}
            >
              <Button.Label>
                <View className="flex-row items-center gap-1.5">
                  <ImagePlus color={PALETTE.foreground} size={15} />
                  <Typography type="body-sm" weight="medium">
                    {avatar ? 'Change photo' : 'Add a photo'}
                  </Typography>
                </View>
              </Button.Label>
            </Button>
            {avatar ? (
              <Button
                size="sm"
                variant="ghost"
                isDisabled={isSavingProfile}
                onPress={() => setAvatar(null)}
              >
                <Button.Label>
                  <View className="flex-row items-center gap-1.5">
                    <Trash2 color={PALETTE.muted} size={15} />
                    <Typography type="body-sm" color="muted">
                      Remove
                    </Typography>
                  </View>
                </Button.Label>
              </Button>
            ) : null}
          </View>

          {avatar ? null : (
            <Typography type="body-xs" color="muted" align="center" className="mt-2">
              Skip it and your initials are used instead.
            </Typography>
          )}
        </View>

        <View className="mt-7 gap-4">
          {pickError ? <AuthNotice message={pickError} /> : null}
          {failure ? <AuthNotice message={failure.message} /> : null}

          <TextField isInvalid={nameInvalid}>
            <Label isInvalid={nameInvalid}>Display name</Label>
            <Input
              value={displayName}
              onChangeText={(value) => setDisplayName(value.slice(0, DISPLAY_NAME_MAX_LENGTH))}
              placeholder="What should listeners call you?"
              maxLength={DISPLAY_NAME_MAX_LENGTH}
              editable={!isSavingProfile}
              returnKeyType="done"
              onSubmitEditing={() => void handleSave()}
            />
            {nameInvalid ? (
              <FieldError>{failure?.message}</FieldError>
            ) : (
              <Description>
                {trimmedName.length}/{DISPLAY_NAME_MAX_LENGTH} · required
              </Description>
            )}
          </TextField>

          <Button
            size="lg"
            isDisabled={isSavingProfile || trimmedName.length === 0}
            onPress={() => void handleSave()}
          >
            <Button.Label>
              <View className="flex-row items-center gap-2">
                {isSavingProfile ? <Spinner size="sm" /> : null}
                <Typography
                  type="body"
                  weight="semibold"
                  style={{ color: PALETTE.accentForeground }}
                >
                  {isSavingProfile ? 'Saving profile…' : 'Start posting'}
                </Typography>
              </View>
            </Button.Label>
          </Button>

          <View className="items-center">
            <Button
              variant="ghost"
              isDisabled={isSavingProfile}
              onPress={() => {
                void signOut();
                router.replace('/auth/sign-in');
              }}
            >
              <Button.Label>
                <Typography type="body-sm" color="muted">
                  Use a different account
                </Typography>
              </Button.Label>
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
