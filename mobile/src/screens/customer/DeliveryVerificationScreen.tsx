import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerFlowStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Button, Card, Gradient, OtpInput, Screen, ScreenFooter, ScreenHeader } from '../../components';
import { useDelivery, useVerifyDeliveryOtp } from '../../hooks/queries';
import { toast } from '../../stores/uiStore';
import { isActiveStatus } from '../../constants/delivery';

type Props = NativeStackScreenProps<CustomerFlowStackParamList, 'DeliveryVerification'>;

export const DeliveryVerificationScreen = ({ navigation, route }: Props) => {
  const theme = useTheme();
  const { deliveryId } = route.params ?? {};
  const { data: delivery } = useDelivery(deliveryId);
  const verify = useVerifyDeliveryOtp();
  const [code, setCode] = useState('');

  const stillActive = delivery ? isActiveStatus(delivery.status) : true;

  const submit = (value: string) => {
    if (!deliveryId) return;
    verify.mutate(
      { id: deliveryId, otp: value, stage: 'delivery' },
      {
        onSuccess: () => {
          toast('Delivery completed!', { tone: 'success' });
          navigation.replace('DeliveryCompleted', { deliveryId });
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
      <ScreenHeader title="Delivery verification" subtitle="Confirm the handover" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.xxl, alignItems: 'center' }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Gradient preset="success" style={styles.medallion}>
          <Ionicons name="checkmark-done" size={32} color="#FFFFFF" />
        </Gradient>

        <AppText variant="eyebrow" tone="primary" center style={{ marginTop: theme.spacing.lg }}>
          Confirm arrival
        </AppText>
        <AppText variant="heading2" weight="800" center style={{ marginTop: theme.spacing.xs }}>
          {delivery?.rider?.name ?? 'Your rider'} is at the destination
        </AppText>
        <AppText variant="body" tone="secondary" center style={{ marginTop: theme.spacing.sm, maxWidth: 320 }}>
          Ask your rider for the 4-digit delivery code shown in their Pickky app, then enter it below to confirm the item arrived safely.
        </AppText>

        <Card style={{ marginTop: theme.spacing.xl, paddingVertical: theme.spacing.xl, alignSelf: 'stretch' }} accessibilityLabel="Enter delivery code">
          <AppText variant="eyebrow" tone="muted" center>
            Delivery code
          </AppText>
          <AppText variant="body" tone="secondary" center style={{ marginTop: theme.spacing.xs, marginBottom: theme.spacing.lg }}>
            The code your rider reads to you
          </AppText>
          <OtpInput value={code} onChange={setCode} onComplete={(v) => submit(v)} disabled={verify.isPending} label="Delivery code" />
        </Card>
      </ScrollView>

      <ScreenFooter>
        <Button label="Confirm Delivery" loading={verify.isPending} disabled={code.length < 4 || !stillActive} onPress={() => submit(code)} />
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
