import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import {
  Button,
  Description,
  FieldError,
  Input,
  Label,
  Separator,
  Spinner,
  TextField,
  Typography,
} from 'heroui-native';

import { AuthNotice } from '@/components/auth/AuthNotice';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import type { AuthFailure } from '@/lib/auth/errors';
import { closeAuthFlow } from '@/lib/navigation';
import { PALETTE } from '@/lib/palette';
import { useSessionStore } from '@/lib/store/sessionStore';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

function goNext(next: 'verify' | 'profile' | 'done' | undefined) {
  if (next === 'verify') router.push('/auth/verify');
  else if (next === 'profile') router.replace('/auth/profile-setup');
  else if (next === 'done') closeAuthFlow();
}

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localFailure, setLocalFailure] = useState<AuthFailure | null>(null);
  const [busyProvider, setBusyProvider] = useState<'email' | 'google' | null>(null);

  const isSubmitting = useSessionStore((state) => state.isSubmitting);
  const storeFailure = useSessionStore((state) => state.error);
  const signUpWithEmail = useSessionStore((state) => state.signUpWithEmail);
  const signInWithGoogle = useSessionStore((state) => state.signInWithGoogle);
  const clearFeedback = useSessionStore((state) => state.clearFeedback);

  useEffect(() => {
    clearFeedback();
  }, [clearFeedback]);

  const failure = localFailure ?? storeFailure;
  const emailInvalid = failure?.field === 'email';
  const passwordInvalid = failure?.field === 'password';

  const handleSignUp = async () => {
    if (isSubmitting) return;

    if (!EMAIL_PATTERN.test(email.trim())) {
      setLocalFailure({ message: 'Enter a valid email address.', field: 'email' });
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setLocalFailure({
        message: `Use at least ${PASSWORD_MIN_LENGTH} characters for your password.`,
        field: 'password',
      });
      return;
    }

    setLocalFailure(null);
    setBusyProvider('email');
    const result = await signUpWithEmail(email, password);
    setBusyProvider(null);
    if (result.ok) goNext(result.next);
  };

  const handleGoogleSignIn = async () => {
    if (isSubmitting) return;
    setLocalFailure(null);
    setBusyProvider('google');
    const result = await signInWithGoogle();
    setBusyProvider(null);
    if (result.ok) goNext(result.next);
  };

  const isEmailBusy = isSubmitting && busyProvider === 'email';
  const isGoogleBusy = isSubmitting && busyProvider === 'google';

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
        <Typography type="h3">Create your account</Typography>
        <Typography type="body-sm" color="muted" className="mt-1.5">
          You need an account to upload. Next you will pick a display name and, if you want, a
          photo.
        </Typography>

        <View className="mt-6 gap-4">
          {failure ? <AuthNotice message={failure.message} /> : null}

          <TextField isInvalid={emailInvalid}>
            <Label isInvalid={emailInvalid}>Email</Label>
            <Input
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (localFailure) setLocalFailure(null);
              }}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!isSubmitting}
              returnKeyType="next"
            />
            {emailInvalid ? <FieldError>{failure?.message}</FieldError> : null}
          </TextField>

          <TextField isInvalid={passwordInvalid}>
            <Label isInvalid={passwordInvalid}>Password</Label>
            <Input
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (localFailure) setLocalFailure(null);
              }}
              placeholder="Create a password"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              editable={!isSubmitting}
              returnKeyType="go"
              onSubmitEditing={() => void handleSignUp()}
            />
            {passwordInvalid ? (
              <FieldError>{failure?.message}</FieldError>
            ) : (
              <Description>At least {PASSWORD_MIN_LENGTH} characters.</Description>
            )}
          </TextField>

          <Button size="lg" isDisabled={isSubmitting} onPress={() => void handleSignUp()}>
            <Button.Label>
              <View className="flex-row items-center gap-2">
                {isEmailBusy ? <Spinner size="sm" /> : null}
                <Typography
                  type="body"
                  weight="semibold"
                  style={{ color: PALETTE.accentForeground }}
                >
                  {isEmailBusy ? 'Creating account…' : 'Continue'}
                </Typography>
              </View>
            </Button.Label>
          </Button>

          <View className="flex-row items-center gap-3">
            <Separator className="flex-1" />
            <Typography type="body-xs" color="muted">
              or
            </Typography>
            <Separator className="flex-1" />
          </View>

          <GoogleSignInButton
            isBusy={isGoogleBusy}
            isDisabled={isSubmitting}
            onPress={() => void handleGoogleSignIn()}
          />

          <View className="mt-2 items-center">
            <Typography type="body-sm" color="muted">
              Already have an account?
            </Typography>
            <Button
              variant="ghost"
              isDisabled={isSubmitting}
              onPress={() => router.replace('/auth/sign-in')}
            >
              <Button.Label>
                <Typography type="body" weight="semibold" className="text-accent">
                  Sign in instead
                </Typography>
              </Button.Label>
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
