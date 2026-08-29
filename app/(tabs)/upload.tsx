import { AudioLines, Check, Mic, RotateCcw, Square, Upload } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
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

import { Waveform } from '@/components/audio/Waveform';
import { MINI_PLAYER_INSET } from '@/lib/layout';
import { formatDuration } from '@/lib/format';
import { makeWaveform, TAG_SUGGESTIONS } from '@/lib/mockData';
import { PALETTE } from '@/lib/palette';
import { useFeedStore } from '@/lib/store/feedStore';
import { usePlayerStore } from '@/lib/store/playerStore';

type RecordStage = 'idle' | 'recording' | 'ready';

const TICK_MS = 150;
const MAX_CLIP_SECONDS = 300;
const MAX_TAGS = 3;

export default function UploadScreen() {
  const insets = useSafeAreaInsets();
  const addPost = useFeedStore((state) => state.addPost);
  const currentId = usePlayerStore((state) => state.currentId);

  const [stage, setStage] = useState<RecordStage>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [bars, setBars] = useState<number[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [publishedTitle, setPublishedTitle] = useState<string | null>(null);
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (stage !== 'recording') return undefined;

    const interval = setInterval(() => {
      elapsedRef.current += TICK_MS / 1000;
      setElapsed(elapsedRef.current);
      setBars((previous) => [...previous, 0.2 + Math.random() * 0.8]);
      if (elapsedRef.current >= MAX_CLIP_SECONDS) setStage('ready');
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [stage]);

  const startRecording = () => {
    elapsedRef.current = 0;
    setElapsed(0);
    setBars([]);
    setPublishedTitle(null);
    setStage('recording');
  };

  const stopRecording = () => {
    setStage(elapsedRef.current >= 1 ? 'ready' : 'idle');
  };

  const useSampleClip = () => {
    elapsedRef.current = 48;
    setElapsed(48);
    setBars(makeWaveform(Date.now() % 5_000));
    setPublishedTitle(null);
    setStage('ready');
  };

  const discardClip = () => {
    elapsedRef.current = 0;
    setElapsed(0);
    setBars([]);
    setStage('idle');
  };

  const toggleTag = (tag: string) => {
    setTags((previous) => {
      if (previous.includes(tag)) return previous.filter((item) => item !== tag);
      if (previous.length >= MAX_TAGS) return previous;
      return [...previous, tag];
    });
  };

  const trimmedTitle = title.trim();
  const isTitleValid = trimmedTitle.length >= 3;
  const hasClip = stage === 'ready' && elapsed >= 1;
  const canPublish = isTitleValid && hasClip && !isPublishing;

  const handlePublish = async () => {
    setHasSubmitted(true);
    if (!canPublish) return;

    setIsPublishing(true);
    // Stands in for the upload request until a backend is connected.
    await new Promise<void>((resolve) => setTimeout(resolve, 900));

    addPost({
      title: trimmedTitle,
      description: description.trim(),
      tags,
      durationSec: Math.round(elapsed),
      waveform: bars,
      isPublic,
    });

    setIsPublishing(false);
    setPublishedTitle(trimmedTitle);
    setTitle('');
    setDescription('');
    setTags([]);
    setHasSubmitted(false);
    discardClip();
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
        {publishedTitle ? (
          <Surface className="border-accent mb-4 flex-row items-center gap-3 rounded-2xl border p-3.5">
            <View className="bg-accent h-9 w-9 items-center justify-center rounded-full">
              <Check color={PALETTE.accentForeground} size={18} />
            </View>
            <View className="flex-1">
              <Typography type="body-sm" weight="semibold">
                Posted “{publishedTitle}”
              </Typography>
              <Typography type="body-xs" color="muted">
                It is at the top of your feed and profile.
              </Typography>
            </View>
            <Button size="sm" variant="tertiary" onPress={() => router.navigate('/')}>
              <Button.Label>Open feed</Button.Label>
            </Button>
          </Surface>
        ) : null}

        <Surface variant="default" className="items-center rounded-3xl p-6">
          {stage === 'recording' ? (
            <>
              <Typography type="h2">{formatDuration(elapsed)}</Typography>
              <Typography type="body-xs" className="text-danger mt-1">
                Recording…
              </Typography>
              <Waveform
                data={bars.slice(-36)}
                progress={1}
                bars={36}
                height={56}
                barWidth={4}
                gap={3}
                className="mt-5"
                activeClassName="bg-wave"
              />
              <Pressable
                onPress={stopRecording}
                accessibilityRole="button"
                accessibilityLabel="Stop recording"
                className="bg-danger mt-6 h-20 w-20 items-center justify-center rounded-full"
              >
                <Square color="#FFFFFF" size={26} fill="#FFFFFF" />
              </Pressable>
              <Typography type="body-xs" color="muted" className="mt-3">
                Tap to stop
              </Typography>
            </>
          ) : null}

          {stage === 'ready' ? (
            <>
              <View className="flex-row items-center gap-2">
                <AudioLines color={PALETTE.wave} size={18} />
                <Typography type="body-sm" weight="semibold">
                  Clip ready · {formatDuration(elapsed)}
                </Typography>
              </View>
              <Waveform
                data={bars}
                progress={1}
                bars={40}
                height={56}
                barWidth={4}
                gap={3}
                className="mt-5"
                activeClassName="bg-wave"
              />
              <View className="mt-6 flex-row gap-3">
                <Button variant="tertiary" size="sm" onPress={discardClip}>
                  <Button.Label>
                    <View className="flex-row items-center gap-2">
                      <RotateCcw color={PALETTE.foreground} size={15} />
                      <Typography type="body-sm">Record again</Typography>
                    </View>
                  </Button.Label>
                </Button>
              </View>
            </>
          ) : null}

          {stage === 'idle' ? (
            <>
              <Pressable
                onPress={startRecording}
                accessibilityRole="button"
                accessibilityLabel="Start recording"
                className="bg-accent h-24 w-24 items-center justify-center rounded-full"
              >
                <Mic color={PALETTE.accentForeground} size={34} />
              </Pressable>
              <Typography type="body" weight="semibold" className="mt-5">
                Record a Blipp
              </Typography>
              <Typography type="body-sm" color="muted" align="center" className="mt-1">
                Up to five minutes of audio. No camera, no video.
              </Typography>
              <Button variant="ghost" size="sm" className="mt-3" onPress={useSampleClip}>
                <Button.Label>Use a sample clip</Button.Label>
              </Button>
            </>
          ) : null}
        </Surface>

        {hasSubmitted && !hasClip ? (
          <Typography type="body-xs" className="text-danger mt-2">
            Record or add a clip before publishing.
          </Typography>
        ) : null}

        <View className="mt-6 gap-5">
          <TextField isInvalid={hasSubmitted && !isTitleValid}>
            <Label>Title</Label>
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="What is this clip about?"
              maxLength={90}
              returnKeyType="next"
            />
            {hasSubmitted && !isTitleValid ? (
              <Typography type="body-xs" className="text-danger">
                Add a title of at least 3 characters.
              </Typography>
            ) : (
              <Typography type="body-xs" color="muted">
                {title.length}/90
              </Typography>
            )}
          </TextField>

          <TextField>
            <Label>Description</Label>
            <TextArea
              value={description}
              onChangeText={setDescription}
              placeholder="Add context for listeners (optional)"
              numberOfLines={4}
              maxLength={280}
            />
          </TextField>

          <View>
            <Label>Tags</Label>
            <Typography type="body-xs" color="muted" className="mt-1">
              Pick up to {MAX_TAGS} so listeners can find it.
            </Typography>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {TAG_SUGGESTIONS.map((tag) => {
                const isSelected = tags.includes(tag);
                return (
                  <Chip
                    key={tag}
                    size="sm"
                    color="accent"
                    variant={isSelected ? 'primary' : 'tertiary'}
                    onPress={() => toggleTag(tag)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Chip.Label>#{tag}</Chip.Label>
                  </Chip>
                );
              })}
            </View>
          </View>

          <Surface variant="secondary" className="flex-row items-center gap-3 rounded-2xl p-4">
            <View className="flex-1">
              <Typography type="body-sm" weight="medium">
                Public in the feed
              </Typography>
              <Typography type="body-xs" color="muted">
                {isPublic ? 'Anyone can listen to this clip.' : 'Only visible on your profile.'}
              </Typography>
            </View>
            <Switch isSelected={isPublic} onSelectedChange={setIsPublic} />
          </Surface>

          <Button size="lg" isDisabled={isPublishing} onPress={() => void handlePublish()}>
            <Button.Label>
              {isPublishing ? (
                <View className="flex-row items-center gap-2">
                  <Spinner size="sm" />
                  <Typography
                    type="body"
                    weight="semibold"
                    style={{ color: PALETTE.accentForeground }}
                  >
                    Publishing…
                  </Typography>
                </View>
              ) : (
                <View className="flex-row items-center gap-2">
                  <Upload color={PALETTE.accentForeground} size={18} />
                  <Typography
                    type="body"
                    weight="semibold"
                    style={{ color: PALETTE.accentForeground }}
                  >
                    Publish audio
                  </Typography>
                </View>
              )}
            </Button.Label>
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
