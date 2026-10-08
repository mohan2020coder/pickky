import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { AppText, Button, OtpInput, Screen, ScreenHeader, Entrance, EntranceTop, Gradient, Card } from '../../components';
import { useTheme } from '../../theme';
import { verifyOtp, requestOtp } from '../../api/auth';
import { startSession } from '../../auth/session';
import { toast } from '../../stores/uiStore';
import { config } from '../../config';
import { AuthSession } from '../../types';
import { Ionicons } from '@expo/vector-icons';

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
      <View style={{ paddingHorizontal: theme.spacing.xl }}>
        <EntranceTop delay={0}>
          <Card variant="glass" padded style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xl }}>
            <Gradient preset="cta" style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="cube" size={24} color={theme.colors.onPrimary} />
            </Gradient>
            <View style={{ marginLeft: theme.spacing.md, flex: 1 }}>
              <AppText variant="eyebrow" tone="primary" weight="800">
                VERIFICATION
              </AppText>
              <AppText variant="heading3" weight="800" style={{ marginTop: 2 }}>
                Check your SMS
              </AppText>
            </View>
          </Card>
        </EntranceTop>
        <Entrance delay={120}>
          <AppText variant="body" tone="secondary">
            We sent a 4-digit code to
          </AppText>
          <AppText variant="bodyLarge" weight="800" style={{ marginTop: 4 }}>
            +91 {phone}
          </AppText>
          {config.isMock ? (
            <AppText variant="caption" tone="primary" style={{ marginTop: theme.spacing.sm }}>
              Mock mode: use code 1234
            </AppText>
          ) : null}
        </Entrance>
        <Entrance delay={180}>
          <OtpInput value={code} onChange={setCode} onComplete={(v) => void submit(v)} error={error} disabled={loading} />
        </Entrance>
        {error ? (
          <Entrance delay={200}>
            <AppText variant="bodySmall" tone="error" style={{ marginTop: theme.spacing.sm }}>
              {error}
            </AppText>
          </Entrance>
        ) : null}
        <Entrance delay={240}>
          <Button label="Verify" loading={loading} disabled={code.length < 4} iconRight="checkmark" onPress={() => void submit(code)} style={{ marginTop: theme.spacing.lg }} />
        </Entrance>
        <Entrance delay={300}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: theme.spacing.lg }}>
            <AppText variant="bodySmall" tone="muted">
              Did not get the code?{' '}
            </AppText>
            {resendIn > 0 ? (
              <AppText variant="bodySmall" tone="muted">
                Resend in {resendIn}s
              </AppText>
            ) : (
              <AppText variant="bodySmall" tone="primary" weight="700" onPress={resend} suppressHighlighting>
                Resend
              </AppText>
            )}
          </View>
        </Entrance>
      </View>
    </Screen>
  );
};