import { Upload } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  Button,
  Chip,
  Input,
  Label,
  Spinner,
  Surface,
  Switch,
  TextArea,
  TextField,
  Typography,
} from 'heroui-native';

import { DiscardDraftDialog } from '@/components/upload/DiscardDraftDialog';
import { FilePickerCard } from '@/components/upload/FilePickerCard';
import { UploadErrorBanner } from '@/components/upload/UploadErrorBanner';
import { UploadProgressCard } from '@/components/upload/UploadProgressCard';
import { UploadSuccessOverlay } from '@/components/upload/UploadSuccessOverlay';
import { MINI_PLAYER_INSET } from '@/lib/layout';
import { PALETTE } from '@/lib/palette';
import { usePlayerStore } from '@/lib/store/playerStore';
import {
  canPublishDraft,
  DESCRIPTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  useUploadStore,
} from '@/lib/store/uploadStore';
import { pickAudioFile } from '@/lib/upload/pickAudioFile';
import { UPLOAD_CATEGORIES } from '@/lib/types';

/** How long the confirmation stays up before the feed opens. */
const SUCCESS_HOLD_MS = 1_300;
const PICKER_ERROR = 'The file picker could not be opened. Try again in a moment.';

export default function UploadScreen() {
  const insets = useSafeAreaInsets();
  const currentId = usePlayerStore((state) => state.currentId);

  const file = useUploadStore((state) => state.file);
  const title = useUploadStore((state) => state.title);
  const description = useUploadStore((state) => state.description);
  const category = useUploadStore((state) => state.category);
  const status = useUploadStore((state) => state.status);
  const progress = useUploadStore((state) => state.progress);
  const error = useUploadStore((state) => state.error);
  const errorKind = useUploadStore((state) => state.errorKind);
  const simulateFailure = useUploadStore((state) => state.simulateFailure);
  const publishedTitle = useUploadStore((state) => state.publishedTitle);
  const pendingLeave = useUploadStore((state) => state.pendingLeave);

  const setFile = useUploadStore((state) => state.setFile);
  const clearFile = useUploadStore((state) => state.clearFile);
  const setTitle = useUploadStore((state) => state.setTitle);
  const setDescription = useUploadStore((state) => state.setDescription);
  const setCategory = useUploadStore((state) => state.setCategory);
  const setSimulateFailure = useUploadStore((state) => state.setSimulateFailure);
  const reportPickError = useUploadStore((state) => state.reportPickError);
  const startUpload = useUploadStore((state) => state.startUpload);
  const cancelUpload = useUploadStore((state) => state.cancelUpload);
  const reset = useUploadStore((state) => state.reset);
  const setFocused = useUploadStore((state) => state.setFocused);
  const confirmLeave = useUploadStore((state) => state.confirmLeave);
  const cancelLeave = useUploadStore((state) => state.cancelLeave);

  const [isPicking, setIsPicking] = useState(false);

  const isUploading = status === 'uploading';
  const canPost = canPublishDraft({ file, title, status });

  // The leave guard only applies while this screen is the one on screen.
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [setFocused]),
  );

  // Android hardware back leaves the tab, so it goes through the same guard.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return undefined;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () =>
        useUploadStore.getState().requestLeave('/'),
      );
      return () => subscription.remove();
    }, []),
  );

  // Hold the confirmation briefly, then hand over to the feed.
  useEffect(() => {
    if (status !== 'success') return undefined;
    const timer = setTimeout(() => {
      reset();
      router.navigate('/');
    }, SUCCESS_HOLD_MS);
    return () => clearTimeout(timer);
  }, [status, reset]);

  const handlePick = useCallback(async () => {
    if (isPicking || isUploading) return;
    setIsPicking(true);
    try {
      const picked = await pickAudioFile();
      if (picked) setFile(picked);
    } catch {
      reportPickError(PICKER_ERROR);
    } finally {
      setIsPicking(false);
    }
  }, [isPicking, isUploading, setFile, reportPickError]);

  const handleDiscard = () => {
    const target = confirmLeave();
    if (target) router.navigate(target);
  };

  return (
    <KeyboardAvoidingView
      className="bg-background flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: (currentId ? MINI_PLAYER_INSET : 0) + insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <FilePickerCard
          file={file}
          isPicking={isPicking}
          isUploading={isUploading}
          onPick={() => void handlePick()}
          onRemove={clearFile}
        />

        {isUploading ? (
          <UploadProgressCard
            progress={progress}
            fileName={file?.name ?? 'Your file'}
            onCancel={cancelUpload}
          />
        ) : null}

        {error ? (
          <UploadErrorBanner
            message={error}
            actionLabel={errorKind === 'transfer' ? 'Retry upload' : 'Choose another file'}
            onAction={errorKind === 'transfer' ? startUpload : () => void handlePick()}
          />
        ) : null}

        <View className="mt-6 gap-5">
          <TextField>
            <Label>Title</Label>
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="Name this clip"
              maxLength={TITLE_MAX_LENGTH}
              editable={!isUploading}
              returnKeyType="next"
            />
            <View className="mt-1 flex-row items-center justify-between">
              <Typography type="body-xs" color="muted">
                Required
              </Typography>
              <Typography
                type="body-xs"
                color="muted"
                className={title.length === TITLE_MAX_LENGTH ? 'text-accent' : undefined}
              >
                {title.length}/{TITLE_MAX_LENGTH}
              </Typography>
            </View>
          </TextField>

          <TextField>
            <Label>Description</Label>
            <TextArea
              value={description}
              onChangeText={setDescription}
              placeholder="Add context for listeners (optional)"
              numberOfLines={4}
              maxLength={DESCRIPTION_MAX_LENGTH}
              editable={!isUploading}
            />
            <View className="mt-1 flex-row items-center justify-between">
              <Typography type="body-xs" color="muted">
                Optional
              </Typography>
              <Typography
                type="body-xs"
                color="muted"
                className={
                  description.length === DESCRIPTION_MAX_LENGTH ? 'text-accent' : undefined
                }
              >
                {description.length}/{DESCRIPTION_MAX_LENGTH}
              </Typography>
            </View>
          </TextField>

          <View>
            <Label>Category</Label>
            <Typography type="body-xs" color="muted" className="mt-1">
              Shown as a chip on your post in the feed.
            </Typography>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {UPLOAD_CATEGORIES.map((option) => {
                const isSelected = option === category;
                return (
                  <Chip
                    key={option}
                    size="sm"
                    color="accent"
                    variant={isSelected ? 'primary' : 'tertiary'}
                    disabled={isUploading}
                    onPress={() => setCategory(option)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Chip.Label>{option}</Chip.Label>
                  </Chip>
                );
              })}
            </View>
          </View>

          <Surface variant="secondary" className="flex-row items-center gap-3 rounded-2xl p-4">
            <View className="flex-1">
              <Typography type="body-sm" weight="medium">
                Simulate a failed upload
              </Typography>
              <Typography type="body-xs" color="muted">
                Demo switch: interrupts the next upload so you can see the error and retry.
              </Typography>
            </View>
            <Switch
              isSelected={simulateFailure}
              onSelectedChange={setSimulateFailure}
              isDisabled={isUploading}
            />
          </Surface>

          <View>
            <Button size="lg" isDisabled={!canPost} onPress={startUpload}>
              <Button.Label>
                <View className="flex-row items-center gap-2">
                  {isUploading ? (
                    <Spinner size="sm" />
                  ) : (
                    <Upload color={PALETTE.accentForeground} size={18} />
                  )}
                  <Typography
                    type="body"
                    weight="semibold"
                    style={{ color: PALETTE.accentForeground }}
                  >
                    {isUploading ? `Posting… ${Math.round(progress * 100)}%` : 'Post'}
                  </Typography>
                </View>
              </Button.Label>
            </Button>
            {canPost || isUploading ? null : (
              <Typography type="body-xs" color="muted" align="center" className="mt-2">
                Pick an audio file and add a title to post.
              </Typography>
            )}
          </View>
        </View>
      </ScrollView>

      <DiscardDraftDialog
        isOpen={pendingLeave !== null}
        isUploading={isUploading}
        onKeepEditing={cancelLeave}
        onDiscard={handleDiscard}
      />

      {status === 'success' && publishedTitle ? (
        <UploadSuccessOverlay title={publishedTitle} />
      ) : null}
    </KeyboardAvoidingView>
  );
}
