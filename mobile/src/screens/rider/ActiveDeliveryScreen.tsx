import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderHomeStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Button, Card, Screen, ScreenHeader, StatusTimeline } from '../../components';
import { useDelivery, useUpdateDeliveryStatus } from '../../hooks/queries';
import { toast } from '../../stores/uiStore';
import { STATUS_META } from '../../constants/delivery';
import { formatDistance, formatMinutes } from '../../utils/format';
import { DeliveryStatus } from '../../types';

type Props = NativeStackScreenProps<RiderHomeStackParamList, 'ActiveDelivery'>;

type Step = { status: DeliveryStatus; label: string };

// Only these transitions may be driven by the rider directly. The OTP
// verification stages and DELIVERED are confirmed by the customer/backend.
const NEXT_STEP: Partial<Record<DeliveryStatus, Step>> = {
  RIDER_ASSIGNED: { status: 'RIDER_ARRIVING_PICKUP', label: 'Start to pickup' },
  RIDER_ARRIVING_PICKUP: { status: 'RIDER_ARRIVED_PICKUP', label: 'I have arrived' },
  PICKED_UP: { status: 'IN_TRANSIT', label: 'Start delivery' },
  IN_TRANSIT: { status: 'NEAR_DESTINATION', label: 'Near destination' },
};

const WAITING_HINT: Partial<Record<DeliveryStatus, string>> = {
  RIDER_ARRIVED_PICKUP: 'Waiting for the customer to confirm pickup.',
  PICKUP_VERIFICATION: 'Waiting for the customer to enter the pickup code.',
  NEAR_DESTINATION: 'Waiting for the customer to confirm delivery.',
  DELIVERY_VERIFICATION: 'Waiting for the customer to enter the delivery code.',
};

export const ActiveDeliveryScreen = ({ navigation, route }: Props) => {
  const theme = useTheme();
  const deliveryId = route.params?.deliveryId;
  const { data: delivery, isPending } = useDelivery(deliveryId);
  const update = useUpdateDeliveryStatus();

  const openChat = () => {
    if (!deliveryId) return;
    navigation.navigate('Chat', { conversationId: deliveryId, deliveryId });
  };

  const advance = (step: Step) => {
    if (!delivery) return;
    update.mutate(
      { id: delivery.id, status: step.status },
      {
        onSuccess: (updated) => toast(STATUS_META[updated.status].label, { tone: 'success' }),
        onError: () => toast('We could not update the delivery.', { tone: 'error' }),
      },
    );
  };

  if (!delivery) {
    return (
      <Screen>
        <ScreenHeader title="Active delivery" onBack={() => navigation.goBack()} />
        <AppText variant="body" tone="secondary" center style={{ marginTop: theme.spacing.xl }}>
          {isPending ? 'Loading delivery…' : 'This delivery is no longer available.'}
        </AppText>
        {!isPending ? (
          <Button
            label="Back to home"
            variant="secondary"
            fullWidth={false}
            style={{ marginTop: theme.spacing.lg, alignSelf: 'center' }}
            onPress={() => navigation.goBack()}
          />
        ) : null}
      </Screen>
    );
  }

  const status = delivery.status;
  const meta = STATUS_META[status];
  const step = NEXT_STEP[status];
  const waitHint = WAITING_HINT[status];
  const delivered = status === 'DELIVERED';
  const closed = status === 'CANCELLED' || status === 'FAILED';

  return (
    <Screen>
      <ScreenHeader
        title={delivery.reference ?? 'Active delivery'}
        subtitle={meta.label}
        onBack={() => navigation.goBack()}
        iconRight={{ icon: 'chatbubbles-outline', label: 'Open chat', onPress: openChat }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <StatusTimeline status={status} />

        <Card style={{ marginTop: theme.spacing.lg }}>
          <AppText variant="label" tone="secondary">
            Verification codes
          </AppText>
          <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.md }}>
            <View style={[styles.codeBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
              <AppText variant="caption" tone="muted">
                PICKUP CODE
              </AppText>
              <AppText variant="heading2" style={{ marginTop: theme.spacing.xxs }}>
                {delivery.pickup_otp ?? '—'}
              </AppText>
            </View>
            <View style={[styles.codeBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
              <AppText variant="caption" tone="muted">
                DELIVERY CODE
              </AppText>
              <AppText variant="heading2" style={{ marginTop: theme.spacing.xxs }}>
                {delivery.delivery_otp ?? '—'}
              </AppText>
            </View>
          </View>
          <AppText variant="caption" tone="muted" style={{ marginTop: theme.spacing.sm }}>
            Share the pickup code at pickup and the delivery code at drop-off.
          </AppText>
        </Card>

        <Card style={{ marginTop: theme.spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="location" size={18} color={theme.colors.success} style={{ marginRight: theme.spacing.sm }} />
            <View style={{ flex: 1 }}>
              <AppText variant="caption" tone="muted">
                Pickup
              </AppText>
              <AppText variant="body">{delivery.pickup.addr ?? 'Pickup location'}</AppText>
            </View>
          </View>
          <View style={{ height: 14, width: 2, backgroundColor: theme.colors.border, marginLeft: 9, marginVertical: 4 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="flag" size={18} color={theme.colors.error} style={{ marginRight: theme.spacing.sm }} />
            <View style={{ flex: 1 }}>
              <AppText variant="caption" tone="muted">
                Drop-off
              </AppText>
              <AppText variant="body">{delivery.dropoff.addr ?? 'Destination'}</AppText>
            </View>
          </View>
          <AppText variant="caption" tone="muted" style={{ marginTop: theme.spacing.sm }}>
            {formatDistance(delivery.distance_km)} · {formatMinutes(delivery.eta_minutes)} estimated
          </AppText>
        </Card>

        {delivery.instructions ? (
          <Card style={{ marginTop: theme.spacing.lg }}>
            <AppText variant="label" tone="secondary">
              Customer note
            </AppText>
            <AppText variant="body" style={{ marginTop: theme.spacing.xs }}>
              {delivery.instructions}
            </AppText>
          </Card>
        ) : null}

        {waitHint ? (
          <Card elevated={false} style={{ marginTop: theme.spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="hourglass-outline" size={18} color={theme.colors.warning} style={{ marginRight: theme.spacing.sm }} />
              <AppText variant="body" tone="secondary" style={{ flex: 1 }}>
                {waitHint}
              </AppText>
            </View>
          </Card>
        ) : null}

        {delivered ? (
          <Card style={{ marginTop: theme.spacing.lg, alignItems: 'center' }}>
            <Ionicons name="checkmark-circle" size={40} color={theme.colors.success} />
            <AppText variant="heading3" tone="success" style={{ marginTop: theme.spacing.sm }}>
              Delivery completed
            </AppText>
            <AppText variant="bodySmall" tone="secondary" center style={{ marginTop: theme.spacing.xs }}>
              Nice work — the item was delivered successfully.
            </AppText>
          </Card>
        ) : closed ? (
          <Card style={{ marginTop: theme.spacing.lg, alignItems: 'center' }}>
            <Ionicons name="close-circle" size={40} color={theme.colors.error} />
            <AppText variant="heading3" tone="error" style={{ marginTop: theme.spacing.sm }}>
              {meta.label}
            </AppText>
            <AppText variant="bodySmall" tone="secondary" center style={{ marginTop: theme.spacing.xs }}>
              {meta.description}
            </AppText>
          </Card>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Chat" variant="secondary" size="md" icon="chatbubble-outline" style={{ flexShrink: 0 }} onPress={openChat} />
        {step && !delivered && !closed ? (
          <Button label={step.label} size="md" style={{ flex: 1 }} loading={update.isPending} onPress={() => advance(step)} />
        ) : (
          <Button label={delivered ? 'Back to home' : 'Close'} size="md" style={{ flex: 1 }} onPress={() => navigation.goBack()} />
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 24 },
  codeBox: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: 'center' },
  footer: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
});
