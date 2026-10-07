import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { AppText, Button, OtpInput, Screen, ScreenHeader } from '../../components';
import { useTheme } from '../../theme';
import { verifyOtp, requestOtp } from '../../api/auth';
import { startSession } from '../../auth/session';
import { toast } from '../../stores/uiStore';
import { config } from '../../config';
import { AuthSession } from '../../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Otp'>;

const RESEND_DELAY = 30;

export const OtpScreen = ({ navigation, route }: Props) => {
  const theme = useTheme();
  const { phone = '', purpose = 'login' } = route.params ?? {};
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(RESEND_DELAY);

  useEffect(() => {
    void requestOtp(phone).catch(() => undefined);
  }, [phone]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const submit = useCallback(
    async (value: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await verifyOtp(phone, value);
        if (purpose === 'forgot') {
          navigation.replace('ResetPassword', { phone });
        } else if (result && 'user' in result && (result as AuthSession).user) {
          const session = result as AuthSession;
          await startSession(session.user, session.tokens);
        } else {
          navigation.replace('Login');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'That code did not verify. Please try again.');
        setCode('');
      } finally {
        setLoading(false);
      }
    },
    [phone, purpose, navigation],
  );

  const resend = () => {
    setResendIn(RESEND_DELAY);
    void requestOtp(phone)
      .then(() => toast('A new code has been sent.', { tone: 'success' }))
      .catch(() => toast('We could not send a new code.', { tone: 'error' }));
  };

  const subtitle = purpose === 'register' ? 'Verify your mobile number.' : purpose === 'forgot' ? 'Use it to reset your password.' : 'Enter the 4-digit code we sent you.';

  return (
    <Screen>
      <ScreenHeader title="Enter code" subtitle={subtitle} onBack={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: 20 }}>
        <AppText variant="body" tone="secondary">
          We sent a 4-digit code to
        </AppText>
        <AppText variant="bodyLarge" weight="700" style={{ marginTop: 4 }}>
          +91 {phone}
        </AppText>
        {config.isMock ? (
          <AppText variant="caption" tone="primary" style={{ marginTop: theme.spacing.sm }}>
            Mock mode: use code 1234
          </AppText>
        ) : null}
        <OtpInput value={code} onChange={setCode} onComplete={(v) => void submit(v)} error={error} disabled={loading} />
        {error ? (
          <AppText variant="bodySmall" tone="error" style={{ marginTop: theme.spacing.sm }}>
            {error}
          </AppText>
        ) : null}
        <Button label="Verify" loading={loading} disabled={code.length < 4} onPress={() => void submit(code)} style={{ marginTop: theme.spacing.lg }} />
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: theme.spacing.lg }}>
          <AppText variant="bodySmall" tone="muted">
            Did not get the code?{' '}
          </AppText>
          {resendIn > 0 ? (
            <AppText variant="bodySmall" tone="muted">
              Resend in {resendIn}s
            </AppText>
          ) : (
            <AppText variant="bodySmall" tone="primary" onPress={resend} suppressHighlighting>
              Resend
            </AppText>
          )}
        </View>
      </View>
    </Screen>
  );
};