import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { AppText, AppInput, Button, ScreenHeader, Screen } from '../../components';
import { useTheme } from '../../theme';
import { register } from '../../api/auth';
import { startSession } from '../../auth/session';
import { Role, User } from '../../types';

const schema = z.object({
  name: z.string().min(2, 'Enter your full name'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type FormValues = z.infer<typeof schema>;

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', email: '', password: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setError(null);
    try {
      const session = await register({
        name: values.name.trim(),
        phone: values.phone.trim(),
        email: values.email?.trim() || undefined,
        password: values.password,
      });

      if (session && session.user) {
        const user = session.user as User;
        if (user.roles?.includes('CUSTOMER' as Role)) {
          await startSession(user, session.tokens);
          return;
        }
      }
      navigation.navigate('Otp', { phone: values.phone.trim(), purpose: 'register' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Create account" subtitle="Join Pickky in a minute" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        {error ? (
          <AppText variant="bodySmall" tone="error" style={{ marginBottom: theme.spacing.sm }}>
            {error}
          </AppText>
        ) : null}
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <AppInput label="Full name" placeholder="Aarav Mehta" leftIcon="person-outline" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.name?.message ?? null} />
          )}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <AppInput label="Mobile number" placeholder="9000000000" leftIcon="call-outline" keyboardType="phone-pad" maxLength={10} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.phone?.message ?? null} />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <AppInput label="Email (optional)" placeholder="you@example.com" leftIcon="mail-outline" autoCapitalize="none" keyboardType="email-address" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.email?.message ?? null} />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <AppInput label="Password" placeholder="Minimum 6 characters" leftIcon="lock-closed-outline" secureTextEntry value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.password?.message ?? null} />
          )}
        />

        <Button label="Create Account" loading={loading} onPress={handleSubmit(onSubmit)} style={{ marginTop: theme.spacing.sm }} />

        <AppText variant="caption" tone="muted" center style={{ marginTop: theme.spacing.lg }}>
          By continuing you agree to Pickky&apos;s Terms of Service and Privacy Policy.
        </AppText>
        <AppText variant="caption" tone="muted" center style={{ marginTop: theme.spacing.md }}>
          {`Already have an account? `}
          <AppText variant="caption" tone="primary" onPress={() => navigation.navigate('Login')} suppressHighlighting>
            Sign in
          </AppText>
        </AppText>
      </ScrollView>
    </Screen>
  );
};