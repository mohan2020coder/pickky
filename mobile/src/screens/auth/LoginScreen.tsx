import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { AppText, AppInput, Button, ScreenHeader, Screen, Chip } from '../../components';
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
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
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

        <Button label="Sign In" loading={loading} onPress={handleSubmit(onSubmit)} style={{ marginTop: theme.spacing.sm }} />

        <AppText variant="bodySmall" tone="primary" center style={{ marginTop: theme.spacing.md }}>
          <AppText variant="bodySmall" tone="primary" onPress={() => navigation.navigate('ForgotPassword')} suppressHighlighting>
            Forgot password?
          </AppText>
        </AppText>

        <AppText variant="label" tone="muted" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.sm }}>
          Quick demo accounts
        </AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {DEMO_ACCOUNTS.map((acct) => (
            <Chip
              key={acct.label}
              label={`${acct.label} · ${acct.phone}`}
              onPress={() => {
                setValue('identifier', acct.phone, { shouldValidate: true });
                setValue('password', acct.password, { shouldValidate: true });
              }}
            />
          ))}
        </ScrollView>

        <AppText variant="caption" tone="muted" style={{ marginTop: theme.spacing.lg }}>
          {`New to Pickky? `}
          <AppText variant="caption" tone="primary" onPress={() => navigation.navigate('Register')} suppressHighlighting>
            Create an account
          </AppText>
        </AppText>
      </ScrollView>
    </Screen>
  );
};