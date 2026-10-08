import React, { useState } from 'react';
import { View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../../navigation/types';
import { AppInput, AppText, Button, Screen, ScreenHeader, Entrance, EntranceTop, Gradient, Card } from '../../components';
import { useTheme } from '../../theme';
import { forgotPassword } from '../../api/auth';

const schema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
});
type FormValues = z.infer<typeof schema>;

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { phone: '' } });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      await forgotPassword(values.phone.trim());
      navigation.navigate('Otp', { phone: values.phone.trim(), purpose: 'forgot' });
    } catch {
      // fall through to OTP screen anyway in mock/dev flows
      navigation.navigate('Otp', { phone: values.phone.trim(), purpose: 'forgot' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Reset password" subtitle="We will text you a code" onBack={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: theme.spacing.xl }}>
        <EntranceTop delay={0}>
          <Card variant="glass" padded style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xl }}>
            <Gradient preset="cta" style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="cube" size={24} color={theme.colors.onPrimary} />
            </Gradient>
            <View style={{ marginLeft: theme.spacing.md, flex: 1 }}>
              <AppText variant="eyebrow" tone="primary" weight="800">
                RECOVER ACCESS
              </AppText>
              <AppText variant="heading3" weight="800" style={{ marginTop: 2 }}>
                Forgot password
              </AppText>
            </View>
          </Card>
        </EntranceTop>
        <Entrance delay={120}>
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <AppInput label="Registered mobile number" placeholder="9000000000" leftIcon="call-outline" keyboardType="phone-pad" maxLength={10} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.phone?.message ?? null} />
            )}
          />
        </Entrance>
        <Entrance delay={180}>
          <Button label="Send Reset Code" loading={loading} iconRight="arrow-forward" onPress={handleSubmit(onSubmit)} style={{ marginTop: theme.spacing.sm }} />
        </Entrance>
      </View>
    </Screen>
  );
};