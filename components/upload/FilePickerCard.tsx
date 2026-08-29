import { FileAudio, Repeat2, X } from 'lucide-react-native';
import { View } from 'react-native';
import { Button, Spinner, Surface, Typography } from 'heroui-native';

import { formatDuration, formatFileSize } from '@/lib/format';
import { ALLOWED_AUDIO_LABEL, MAX_FILE_BYTES } from '@/lib/upload/audioFile';
import type { PickedAudioFile } from '@/lib/upload/audioFile';
import { PALETTE } from '@/lib/palette';

interface FilePickerCardProps {
  file: PickedAudioFile | null;
  isPicking: boolean;
  isUploading: boolean;
  onPick: () => void;
  onRemove: () => void;
}

export function FilePickerCard({
  file,
  isPicking,
  isUploading,
  onPick,
  onRemove,
}: FilePickerCardProps) {
  if (!file) {
    return (
      <Surface
        variant="default"
        className="border-border items-center rounded-3xl border border-dashed p-6"
      >
        <View className="bg-surface-tertiary h-16 w-16 items-center justify-center rounded-full">
          <FileAudio color={PALETTE.wave} size={28} />
        </View>
        <Typography type="body" weight="semibold" className="mt-4">
          Choose an audio file
        </Typography>
        <Typography type="body-sm" color="muted" align="center" className="mt-1">
          {ALLOWED_AUDIO_LABEL}, up to {formatFileSize(MAX_FILE_BYTES)}.
        </Typography>
        <Button size="md" className="mt-5" isDisabled={isPicking} onPress={onPick}>
          <Button.Label>
            <View className="flex-row items-center gap-2">
              {isPicking ? <Spinner size="sm" /> : null}
              <Typography type="body" weight="semibold" style={{ color: PALETTE.accentForeground }}>
                {isPicking ? 'Opening picker…' : 'Browse files'}
              </Typography>
            </View>
          </Button.Label>
        </Button>
      </Surface>
    );
  }

  return (
    <Surface variant="default" className="rounded-3xl p-4">
      <View className="flex-row items-center gap-3">
        <View className="bg-accent h-11 w-11 items-center justify-center rounded-2xl">
          <FileAudio color={PALETTE.accentForeground} size={22} />
        </View>
        <View className="flex-1">
          <Typography type="body-sm" weight="semibold" numberOfLines={1}>
            {file.name}
          </Typography>
          <Typography type="body-xs" color="muted" numberOfLines={1}>
            {formatFileSize(file.size)} ·{' '}
            {file.durationSec > 0
              ? `${file.isDurationEstimated ? '≈' : ''}${formatDuration(file.durationSec)}`
              : 'Length unknown'}
          </Typography>
        </View>
        {isUploading ? null : (
          <Button
            size="sm"
            variant="ghost"
            isIconOnly
            accessibilityLabel="Remove file"
            onPress={onRemove}
          >
            <Button.Label>
              <X color={PALETTE.muted} size={18} />
            </Button.Label>
          </Button>
        )}
      </View>

      {isUploading ? null : (
        <Button
          size="sm"
          variant="tertiary"
          className="mt-4"
          isDisabled={isPicking}
          onPress={onPick}
        >
          <Button.Label>
            <View className="flex-row items-center gap-2">
              {isPicking ? <Spinner size="sm" /> : <Repeat2 color={PALETTE.foreground} size={16} />}
              <Typography type="body-sm" weight="medium">
                {isPicking ? 'Opening picker…' : 'Pick a different file'}
              </Typography>
            </View>
          </Button.Label>
        </Button>
      )}
    </Surface>
  );
}
