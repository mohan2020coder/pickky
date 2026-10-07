import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerFlowStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Button, Card, OtpInput, Screen, ScreenHeader } from '../../components';
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
      <View style={styles.content}>
        <View style={[styles.iconBubble, { backgroundColor: theme.colors.warningSoft }]}>
          <Ionicons name="key" size={30} color={theme.colors.warning} />
        </View>
        <AppText variant="heading2" center style={{ marginTop: theme.spacing.lg }}>
          {delivery?.rider?.name ?? 'Your rider'} is at the pickup
        </AppText>
        <AppText variant="body" tone="secondary" center style={{ marginTop: theme.spacing.sm }}>
          Share this code with your rider to release the item. On Pickky, the code confirms the handover.
        </AppText>

        <Card style={{ marginTop: theme.spacing.xl, alignItems: 'center' }} accessibilityLabel="Pickup code">
          <AppText variant="caption" tone="muted">Pickup code</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
            <AppText variant="display" weight="800" tone="primary" style={{ letterSpacing: 6 }}>
              {delivery?.pickup_otp ?? '····'}
            </AppText>
          </View>
        </Card>

        <AppText variant="label" tone="secondary" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.sm }}>
          Or enter the code manually
        </AppText>
        <OtpInput value={code} onChange={setCode} onComplete={(v) => submit(v)} disabled={verify.isPending} />
        <Button label="Confirm Pickup" loading={verify.isPending} disabled={code.length < 4} onPress={() => submit(code)} style={{ marginTop: theme.spacing.lg }} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 20, alignItems: 'center', paddingTop: 16 },
  iconBubble: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
});