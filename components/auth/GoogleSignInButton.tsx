import { View } from 'react-native';
import { Button, Spinner, Typography } from 'heroui-native';

import { GoogleIcon } from '@/components/auth/GoogleIcon';

interface GoogleSignInButtonProps {
  isBusy: boolean;
  isDisabled: boolean;
  onPress: () => void;
}

export function GoogleSignInButton({ isBusy, isDisabled, onPress }: GoogleSignInButtonProps) {
  return (
    <Button size="lg" variant="secondary" isDisabled={isDisabled} onPress={onPress}>
      <Button.Label>
        <View className="flex-row items-center gap-2.5">
          {isBusy ? <Spinner size="sm" /> : <GoogleIcon size={18} />}
          <Typography type="body" weight="semibold">
            {isBusy ? 'Opening Google…' : 'Continue with Google'}
          </Typography>
        </View>
      </Button.Label>
    </Button>
  );
}
