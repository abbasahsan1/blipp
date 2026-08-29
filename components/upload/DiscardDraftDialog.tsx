import { View } from 'react-native';
import { Button, Dialog, Typography } from 'heroui-native';

interface DiscardDraftDialogProps {
  isOpen: boolean;
  isUploading: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
}

export function DiscardDraftDialog({
  isOpen,
  isUploading,
  onKeepEditing,
  onDiscard,
}: DiscardDraftDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onKeepEditing();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <View className="mb-5 gap-1.5">
            <Dialog.Title>{isUploading ? 'Stop this upload?' : 'Discard this draft?'}</Dialog.Title>
            <Dialog.Description>
              {isUploading
                ? 'The file is still uploading. Leaving now cancels it and clears what you have entered.'
                : 'Your file, title and description have not been posted yet. Leaving now clears them.'}
            </Dialog.Description>
          </View>
          <View className="flex-row justify-end gap-3">
            <Button variant="ghost" size="sm" onPress={onKeepEditing}>
              <Button.Label>Keep editing</Button.Label>
            </Button>
            <Button size="sm" className="bg-danger" onPress={onDiscard}>
              <Button.Label>
                <Typography type="body-sm" weight="semibold" style={{ color: '#FFFFFF' }}>
                  {isUploading ? 'Stop and discard' : 'Discard'}
                </Typography>
              </Button.Label>
            </Button>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
