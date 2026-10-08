import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerFlowStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Button, Card, Gradient, OtpInput, Screen, ScreenFooter, ScreenHeader } from '../../components';
import { useDelivery, useVerifyDeliveryOtp } from '../../hooks/queries';
import { toast } from '../../stores/uiStore';

type Props = NativeStackScreenProps<CustomerFlowStackParamList, 'PickupVerification'>;

export const PickupVerificationScreen = ({ navigation, route }: Props) => {
  const theme = useTheme();
  const { deliveryId } = route.params ?? {};
  const { data: delivery } = useDelivery(deliveryId);
  const verify = useVerifyDeliveryOtp();
  const [code, setCode] = useState('');

  const submit = (value: string) => {
    if (!deliveryId) return;
    verify.mutate(
      { id: deliveryId, otp: value, stage: 'pickup' },
      {
        onSuccess: () => {
          toast('Pickup verified — item on its way!', { tone: 'success' });
          navigation.replace('Tracking', { deliveryId });
        },
        onError: (e) => {
          toast(e instanceof Error ? e.message : 'Verification failed.', { tone: 'error' });
          setCode('');
        },
      },
    );
  };

  return (
    <Screen>
      <ScreenHeader title="Pickup verification" subtitle="Confirm the pickup to continue" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.xxl, alignItems: 'center' }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Gradient preset="sunset" style={styles.medallion}>
          <Ionicons name="key" size={32} color="#FFFFFF" />
        </Gradient>

        <AppText variant="eyebrow" tone="primary" center style={{ marginTop: theme.spacing.lg }}>
          Confirm handover
        </AppText>
        <AppText variant="heading2" weight="800" center style={{ marginTop: theme.spacing.xs }}>
          {delivery?.rider?.name ?? 'Your rider'} is at the pickup
        </AppText>
        <AppText variant="body" tone="secondary" center style={{ marginTop: theme.spacing.sm, maxWidth: 320 }}>
          Ask your rider for the 4-digit pickup code shown in their Pickky app, then enter it below to release the item.
        </AppText>

        <Card style={{ marginTop: theme.spacing.xl, paddingVertical: theme.spacing.xl, alignSelf: 'stretch' }} accessibilityLabel="Enter pickup code">
          <AppText variant="eyebrow" tone="muted" center>
            Pickup code
          </AppText>
          <AppText variant="body" tone="secondary" center style={{ marginTop: theme.spacing.xs, marginBottom: theme.spacing.lg }}>
            The code your rider reads to you
          </AppText>
          <OtpInput value={code} onChange={setCode} onComplete={(v) => submit(v)} disabled={verify.isPending} label="Pickup code" />
        </Card>
      </ScrollView>

      <ScreenFooter>
        <Button label="Confirm Pickup" loading={verify.isPending} disabled={code.length < 4} onPress={() => submit(code)} />
      </ScreenFooter>
    </Screen>
  );
};

const styles = StyleSheet.create({
  medallion: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
});