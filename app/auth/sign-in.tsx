import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import {
  Button,
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

function goNext(next: 'verify' | 'profile' | 'done' | undefined) {
  if (next === 'verify') router.push('/auth/verify');
  else if (next === 'profile') router.replace('/auth/profile-setup');
  else if (next === 'done') closeAuthFlow();
}

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localFailure, setLocalFailure] = useState<AuthFailure | null>(null);
  const [busyProvider, setBusyProvider] = useState<'email' | 'google' | null>(null);

  const isSubmitting = useSessionStore((state) => state.isSubmitting);
  const storeFailure = useSessionStore((state) => state.error);
  const notice = useSessionStore((state) => state.notice);
  const signInWithEmail = useSessionStore((state) => state.signInWithEmail);
  const signInWithGoogle = useSessionStore((state) => state.signInWithGoogle);
  const clearFeedback = useSessionStore((state) => state.clearFeedback);

  useEffect(() => {
    clearFeedback();
  }, [clearFeedback]);

  const failure = localFailure ?? storeFailure;
  const emailInvalid = failure?.field === 'email' || failure?.field === 'credentials';
  const passwordInvalid = failure?.field === 'password' || failure?.field === 'credentials';

  const handleEmailSignIn = async () => {
    if (isSubmitting) return;

    if (!EMAIL_PATTERN.test(email.trim())) {
      setLocalFailure({ message: 'Enter the email address you signed up with.', field: 'email' });
      return;
    }
    if (password.length === 0) {
      setLocalFailure({ message: 'Enter your password to continue.', field: 'password' });
      return;
    }

    setLocalFailure(null);
    setBusyProvider('email');
    const result = await signInWithEmail(email, password);
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
        <Typography type="h3">Welcome back</Typography>
        <Typography type="body-sm" color="muted" className="mt-1.5">
          Sign in to post your own audio. Listening never needs an account.
        </Typography>

        <View className="mt-6 gap-4">
          {failure ? <AuthNotice message={failure.message} /> : null}
          {!failure && notice ? <AuthNotice message={notice} variant="info" /> : null}

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
            {emailInvalid && failure?.field === 'email' ? (
              <FieldError>{failure.message}</FieldError>
            ) : null}
          </TextField>

          <TextField isInvalid={passwordInvalid}>
            <Label isInvalid={passwordInvalid}>Password</Label>
            <Input
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (localFailure) setLocalFailure(null);
              }}
              placeholder="Your password"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              editable={!isSubmitting}
              returnKeyType="go"
              onSubmitEditing={() => void handleEmailSignIn()}
            />
            {passwordInvalid && failure?.field === 'password' ? (
              <FieldError>{failure.message}</FieldError>
            ) : null}
          </TextField>

          <Button size="lg" isDisabled={isSubmitting} onPress={() => void handleEmailSignIn()}>
            <Button.Label>
              <View className="flex-row items-center gap-2">
                {isEmailBusy ? <Spinner size="sm" /> : null}
                <Typography
                  type="body"
                  weight="semibold"
                  style={{ color: PALETTE.accentForeground }}
                >
                  {isEmailBusy ? 'Signing in…' : 'Sign in'}
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

          <View className="mt-2 items-center gap-1">
            <Typography type="body-sm" color="muted">
              New here?
            </Typography>
            <Button
              variant="ghost"
              isDisabled={isSubmitting}
              onPress={() => router.push('/auth/sign-up')}
            >
              <Button.Label>
                <Typography type="body" weight="semibold" className="text-accent">
                  Create an account
                </Typography>
              </Button.Label>
            </Button>
            <Button variant="ghost" isDisabled={isSubmitting} onPress={() => closeAuthFlow('/')}>
              <Button.Label>
                <Typography type="body-sm" color="muted">
                  Keep browsing without an account
                </Typography>
              </Button.Label>
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
