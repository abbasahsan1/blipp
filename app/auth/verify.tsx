import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Description, InputOTP, Label, Spinner, Typography } from 'heroui-native';

import { AuthNotice } from '@/components/auth/AuthNotice';
import { closeAuthFlow } from '@/lib/navigation';
import { PALETTE } from '@/lib/palette';
import { useSessionStore } from '@/lib/store/sessionStore';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SEC = 30;

export default function VerifyEmailScreen() {
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SEC);

  const pendingEmail = useSessionStore((state) => state.pendingEmail);
  const isSubmitting = useSessionStore((state) => state.isSubmitting);
  const failure = useSessionStore((state) => state.error);
  const notice = useSessionStore((state) => state.notice);
  const verifyEmailCode = useSessionStore((state) => state.verifyEmailCode);
  const resendEmailCode = useSessionStore((state) => state.resendEmailCode);

  // Opening this route without a pending sign-up has nothing to confirm.
  useEffect(() => {
    if (!pendingEmail) router.replace('/auth/sign-in');
  }, [pendingEmail]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1_000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const submit = async (value: string) => {
    if (isSubmitting || value.length !== CODE_LENGTH) return;
    const result = await verifyEmailCode(value);
    if (!result.ok) {
      setCode('');
      return;
    }
    if (result.next === 'profile') router.replace('/auth/profile-setup');
    else closeAuthFlow();
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setCode('');
    setCooldown(RESEND_COOLDOWN_SEC);
    await resendEmailCode();
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
        <Typography type="h3">Enter your code</Typography>
        <Typography type="body-sm" color="muted" className="mt-1.5">
          We sent a {CODE_LENGTH}-digit code to {pendingEmail ?? 'your email'}. It confirms the
          address belongs to you.
        </Typography>

        <View className="mt-6 gap-5">
          {failure ? <AuthNotice message={failure.message} /> : null}
          {!failure && notice ? <AuthNotice message={notice} variant="info" /> : null}

          <View className="items-center">
            <Label>Confirmation code</Label>
            <Description className="mb-3">Six digits, no spaces.</Description>
            <InputOTP
              maxLength={CODE_LENGTH}
              value={code}
              onChange={setCode}
              onComplete={(value) => void submit(value)}
              isDisabled={isSubmitting}
              isInvalid={failure?.field === 'code'}
            >
              <InputOTP.Group>
                <InputOTP.Slot index={0} />
                <InputOTP.Slot index={1} />
                <InputOTP.Slot index={2} />
              </InputOTP.Group>
              <InputOTP.Separator />
              <InputOTP.Group>
                <InputOTP.Slot index={3} />
                <InputOTP.Slot index={4} />
                <InputOTP.Slot index={5} />
              </InputOTP.Group>
            </InputOTP>
          </View>

          <Button
            size="lg"
            isDisabled={isSubmitting || code.length !== CODE_LENGTH}
            onPress={() => void submit(code)}
          >
            <Button.Label>
              <View className="flex-row items-center gap-2">
                {isSubmitting ? <Spinner size="sm" /> : null}
                <Typography
                  type="body"
                  weight="semibold"
                  style={{ color: PALETTE.accentForeground }}
                >
                  {isSubmitting ? 'Checking code…' : 'Confirm email'}
                </Typography>
              </View>
            </Button.Label>
          </Button>

          <View className="items-center">
            <Button
              variant="ghost"
              isDisabled={isSubmitting || cooldown > 0}
              onPress={() => void handleResend()}
            >
              <Button.Label>
                <Typography
                  type="body-sm"
                  weight="semibold"
                  className={cooldown > 0 ? undefined : 'text-accent'}
                  color={cooldown > 0 ? 'muted' : undefined}
                >
                  {cooldown > 0 ? `Send a new code in ${cooldown}s` : 'Send a new code'}
                </Typography>
              </Button.Label>
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
