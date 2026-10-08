import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../../navigation/types';
import { AppText, AppInput, Button, OtpInput, Screen, ScreenHeader, Entrance, EntranceTop, Gradient, Card } from '../../components';
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
      <ScrollView contentContainerStyle={{ paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.xxxl }} keyboardShouldPersistTaps="handled">
        <EntranceTop delay={0}>
          <Card variant="glass" padded style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xl }}>
            <Gradient preset="cta" style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="cube" size={24} color={theme.colors.onPrimary} />
            </Gradient>
            <View style={{ marginLeft: theme.spacing.md, flex: 1 }}>
              <AppText variant="eyebrow" tone="primary" weight="800">
                RESET ACCESS
              </AppText>
              <AppText variant="heading3" weight="800" style={{ marginTop: 2 }}>
                New password
              </AppText>
            </View>
          </Card>
        </EntranceTop>
        <Entrance delay={120}>
          <AppText variant="label" tone="secondary" style={{ marginBottom: theme.spacing.sm }}>
            Verification code (sent to +91 {phone})
          </AppText>
          {config.isMock ? (
            <AppText variant="caption" tone="primary">
              Mock mode: use code 1234
            </AppText>
          ) : null}
          <OtpInput value={code} onChange={setCode} error={error} />
        </Entrance>
        <Entrance delay={180}>
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <AppInput label="New password" placeholder="Minimum 6 characters" leftIcon="lock-closed-outline" secureTextEntry value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.password?.message ?? null} containerStyle={{ marginTop: theme.spacing.sm }} />
            )}
          />
        </Entrance>
        <Entrance delay={240}>
          <Controller
            control={control}
            name="confirm"
            render={({ field }) => (
              <AppInput label="Confirm password" placeholder="Repeat your password" leftIcon="lock-closed-outline" secureTextEntry value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.confirm?.message ?? null} />
            )}
          />
        </Entrance>
        <Entrance delay={300}>
          <Button label="Reset Password" loading={loading} disabled={code.length < 4} iconRight="key" onPress={handleSubmit(onSubmit)} style={{ marginTop: theme.spacing.sm }} />
        </Entrance>
      </ScrollView>
    </Screen>
  );
};