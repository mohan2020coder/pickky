import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerFlowStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Button, Card, OtpInput, Screen, ScreenHeader } from '../../components';
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
      <View style={styles.content}>
        <View style={[styles.iconBubble, { backgroundColor: theme.colors.successSoft }]}>
          <Ionicons name="checkmark-done" size={30} color={theme.colors.success} />
        </View>
        <AppText variant="heading2" center style={{ marginTop: theme.spacing.lg }}>
          {delivery?.rider?.name ?? 'Your rider'} is at the destination
        </AppText>
        <AppText variant="body" tone="secondary" center style={{ marginTop: theme.spacing.sm }}>
          Share this code with your rider to confirm the item arrived safely.
        </AppText>

        <Card style={{ marginTop: theme.spacing.xl, alignItems: 'center' }} accessibilityLabel="Delivery code">
          <AppText variant="caption" tone="muted">Delivery code</AppText>
          <AppText variant="display" weight="800" tone="primary" style={{ marginTop: 6, letterSpacing: 6 }}>
            {delivery?.delivery_otp ?? '····'}
          </AppText>
        </Card>

        <AppText variant="label" tone="secondary" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.sm }}>
          Or enter the code manually
        </AppText>
        <OtpInput value={code} onChange={setCode} onComplete={(v) => submit(v)} disabled={verify.isPending} />
        <Button label="Confirm Delivery" loading={verify.isPending} disabled={code.length < 4 || !stillActive} onPress={() => submit(code)} style={{ marginTop: theme.spacing.lg }} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 20, alignItems: 'center', paddingTop: 16 },
  iconBubble: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
});