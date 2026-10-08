import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../../navigation/types';
import {
  AppText,
  AppInput,
  Button,
  ScreenHeader,
  Screen,
  Chip,
  EntranceTop,
  Entrance,
  Gradient,
  Card,
} from '../../components';
import { useTheme } from '../../theme';
import { login } from '../../api/auth';
import { startSession } from '../../auth/session';
import { toast } from '../../stores/uiStore';
import { DEMO_ACCOUNTS } from './WelcomeScreen';

const schema = z.object({
  identifier: z.string().min(3, 'Enter your phone number or email'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
});
type FormValues = z.infer<typeof schema>;

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen = ({ navigation, route }: Props) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: route.params?.identifier ?? '', password: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const session = await login({ identifier: values.identifier.trim(), password: values.password });
      await startSession(session.user, session.tokens);
    } catch (e) {
      const message =
        e instanceof Error && e.message
          ? e.message
          : 'We could not sign you in right now. Please try again.';
      toast(message, { tone: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Welcome back" subtitle="Sign in to Pickky" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.xxxl }} keyboardShouldPersistTaps="handled">
        <EntranceTop delay={0}>
          <Card variant="glass" padded style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.lg }}>
            <Gradient preset="cta" style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="cube" size={24} color={theme.colors.onPrimary} />
            </Gradient>
            <View style={{ marginLeft: theme.spacing.md, flex: 1 }}>
              <AppText variant="eyebrow" tone="primary" weight="800">
                WELCOME BACK
              </AppText>
              <AppText variant="heading3" weight="800" style={{ marginTop: 2 }}>
                Pickky
              </AppText>
            </View>
          </Card>
        </EntranceTop>
        <Controller
          control={control}
          name="identifier"
          render={({ field }) => (
            <AppInput
              label="Phone or email"
              placeholder="9000000000"
              leftIcon="person-outline"
              autoCapitalize="none"
              autoCorrect={false}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.identifier?.message ?? null}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <AppInput
              label="Password"
              placeholder="Your password"
              leftIcon="lock-closed-outline"
              secureTextEntry
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.password?.message ?? null}
            />
          )}
        />

        <Entrance delay={120}>
          <Button label="Sign In" loading={loading} iconRight="arrow-forward" onPress={handleSubmit(onSubmit)} style={{ marginTop: theme.spacing.sm }} />
        </Entrance>

        <Entrance delay={180}>
          <AppText variant="bodySmall" tone="primary" center style={{ marginTop: theme.spacing.md }}>
            <AppText variant="bodySmall" tone="primary" onPress={() => navigation.navigate('ForgotPassword')} suppressHighlighting>
              Forgot password?
            </AppText>
          </AppText>
        </Entrance>

        <Entrance delay={240}>
          <AppText variant="label" tone="muted" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.sm }}>
            Quick demo accounts
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {DEMO_ACCOUNTS.map((acct) => (
              <Chip
                key={acct.label}
                selected
                label={`${acct.label} · ${acct.phone}`}
                onPress={() => {
                  setValue('identifier', acct.phone, { shouldValidate: true });
                  setValue('password', acct.password, { shouldValidate: true });
                }}
              />
            ))}
          </ScrollView>
        </Entrance>

        <Entrance delay={300}>
          <AppText variant="caption" tone="muted" center style={{ marginTop: theme.spacing.xl }}>
            {`New to Pickky? `}
            <AppText variant="caption" tone="primary" weight="700" onPress={() => navigation.navigate('Register')} suppressHighlighting>
              Create an account
            </AppText>
          </AppText>
        </Entrance>
      </ScrollView>
    </Screen>
  );
};