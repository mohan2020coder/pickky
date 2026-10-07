import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { AppText, AppInput, Button, OtpInput, Screen, ScreenHeader } from '../../components';
import { useTheme } from '../../theme';
import { resetPassword } from '../../api/auth';
import { toast } from '../../stores/uiStore';
import { config } from '../../config';

const schema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm: z.string(),
}).refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });
type FormValues = z.infer<typeof schema>;

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export const ResetPasswordScreen = ({ navigation, route }: Props) => {
  const theme = useTheme();
  const { phone = '' } = route.params ?? {};
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { password: '', confirm: '' } });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setError(null);
    try {
      await resetPassword(phone, code, values.password);
      toast('Password updated. Please sign in.', { tone: 'success' });
      navigation.popToTop();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We could not reset your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="New password" subtitle="Create a strong password" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <AppText variant="label" tone="secondary" style={{ marginBottom: theme.spacing.sm }}>
          Verification code (sent to +91 {phone})
        </AppText>
        {config.isMock ? <AppText variant="caption" tone="primary">Mock mode: use code 1234</AppText> : null}
        <OtpInput value={code} onChange={setCode} error={error} />
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <AppInput label="New password" placeholder="Minimum 6 characters" leftIcon="lock-closed-outline" secureTextEntry value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.password?.message ?? null} containerStyle={{ marginTop: theme.spacing.sm }} />
          )}
        />
        <Controller
          control={control}
          name="confirm"
          render={({ field }) => (
            <AppInput label="Confirm password" placeholder="Repeat your password" leftIcon="lock-closed-outline" secureTextEntry value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.confirm?.message ?? null} />
          )}
        />
        <Button label="Reset Password" loading={loading} disabled={code.length < 4} onPress={handleSubmit(onSubmit)} style={{ marginTop: theme.spacing.sm }} />
      </ScrollView>
    </Screen>
  );
};