import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderHomeStackParamList } from '../../navigation/types';
import { useTheme, GradientPreset } from '../../theme';
import {
  AppText,
  Button,
  Card,
  Entrance,
  Gradient,
  PressableScale,
  Screen,
  ScreenFooter,
  ScreenHeader,
  StatusTimeline,
} from '../../components';
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

const heroPreset = (status: DeliveryStatus): GradientPreset => {
  if (status === 'DELIVERED') return 'success';
  if (status === 'CANCELLED' || status === 'FAILED') return 'danger';
  if (status === 'PICKED_UP' || status === 'IN_TRANSIT' || status === 'NEAR_DESTINATION') return 'ocean';
  return 'hero';
};

export const ActiveDeliveryScreen = ({ navigation, route }: Props) => {
  const theme = useTheme();
  const deliveryId = route.params?.deliveryId;
  const { data: delivery, isPending, refetch } = useDelivery(deliveryId);
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

  const ActionTile = ({ icon, label, onPress, preset }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; preset: GradientPreset }) => (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} scaleTo={0.94} pressedOpacity={0.9} style={{ alignItems: 'center', flex: 1 }}>
      <Gradient preset={preset} style={{ width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', ...theme.shadows.medium }}>
        <Ionicons name={icon} size={24} color="#FFFFFF" />
      </Gradient>
      <AppText variant="caption" weight="700" style={{ marginTop: theme.spacing.sm }}>
        {label}
      </AppText>
    </PressableScale>
  );

  return (
    <Screen>
      <ScreenHeader
        title={delivery.reference ?? 'Active delivery'}
        subtitle={meta.label}
        onBack={() => navigation.goBack()}
        iconRight={{ icon: 'chatbubbles-outline', label: 'Open chat', onPress: openChat }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Entrance delay={30}>
          <Card variant="gradient" gradientPreset={heroPreset(status)} style={{ marginTop: theme.spacing.sm }}>
            <AppText variant="eyebrow" color={theme.colors.textOnGradient} style={{ opacity: 0.9 }}>
              {delivery.reference ?? 'Delivery'}
            </AppText>
            <AppText variant="heading1" color={theme.colors.textOnGradient} style={{ marginTop: theme.spacing.xs }}>
              {meta.label}
            </AppText>
            {meta.description ? (
              <AppText variant="bodySmall" color={theme.colors.textOnGradient} style={{ marginTop: theme.spacing.xs, opacity: 0.85 }}>
                {meta.description}
              </AppText>
            ) : null}
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
              <View style={styles.glassPill}>
                <Ionicons name="navigate" size={13} color={theme.colors.textOnGradient} />
                <AppText variant="caption" color={theme.colors.textOnGradient} weight="800" style={{ marginLeft: 6 }}>
                  {formatDistance(delivery.distance_km)}
                </AppText>
              </View>
              <View style={styles.glassPill}>
                <Ionicons name="time" size={13} color={theme.colors.textOnGradient} />
                <AppText variant="caption" color={theme.colors.textOnGradient} weight="800" style={{ marginLeft: 6 }}>
                  {formatMinutes(delivery.eta_minutes ?? 0)}
                </AppText>
              </View>
            </View>
          </Card>
        </Entrance>

        <Entrance delay={80} style={{ marginTop: theme.spacing.lg }}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.lg, paddingHorizontal: theme.spacing.sm }}>
            <ActionTile icon="chatbubbles" label="Message" onPress={openChat} preset="primary" />
            <ActionTile icon="refresh" label="Refresh" onPress={() => refetch()} preset="ocean" />
          </View>
        </Entrance>

        <Entrance delay={120} style={{ marginTop: theme.spacing.lg }}>
          <Card style={{ marginTop: 0 }}>
            <AppText variant="label" tone="secondary">
              Codes to share with the customer
            </AppText>
            <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.md }}>
              <View style={[styles.codeBox, { backgroundColor: theme.colors.surfaceSunken }]}>
                <AppText variant="caption" tone="muted">
                  PICKUP CODE
                </AppText>
                <AppText variant="heading2" style={{ marginTop: theme.spacing.xxs }}>
                  {delivery.pickup_otp ?? '—'}
                </AppText>
              </View>
              <View style={[styles.codeBox, { backgroundColor: theme.colors.surfaceSunken }]}>
                <AppText variant="caption" tone="muted">
                  DELIVERY CODE
                </AppText>
                <AppText variant="heading2" style={{ marginTop: theme.spacing.xxs }}>
                  {delivery.delivery_otp ?? '—'}
                </AppText>
              </View>
            </View>
            <AppText variant="caption" tone="muted" style={{ marginTop: theme.spacing.sm }}>
              Read the pickup code to your customer at pickup and the delivery code at drop-off — they enter it in their app to confirm.
            </AppText>
          </Card>
        </Entrance>

        <Entrance delay={160} style={{ marginTop: theme.spacing.lg }}>
          <Card style={{ marginTop: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.routeDot, { backgroundColor: theme.colors.success }]}>
                <Ionicons name="location" size={12} color={theme.colors.onPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" tone="muted">
                  Pickup
                </AppText>
                <AppText variant="body" weight="600">
                  {delivery.pickup.addr ?? 'Pickup location'}
                </AppText>
              </View>
            </View>
            <View style={{ height: 16, width: 2, backgroundColor: theme.colors.border, marginLeft: 11, marginVertical: 4 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.routeDot, { backgroundColor: theme.colors.error }]}>
                <Ionicons name="flag" size={12} color={theme.colors.onPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" tone="muted">
                  Drop-off
                </AppText>
                <AppText variant="body" weight="600">
                  {delivery.dropoff.addr ?? 'Destination'}
                </AppText>
              </View>
            </View>
          </Card>
        </Entrance>

        <Entrance delay={200} style={{ marginTop: theme.spacing.lg }}>
          <Card style={{ marginTop: 0 }}>
            <AppText variant="label" tone="secondary" style={{ marginBottom: theme.spacing.md }}>
              Progress
            </AppText>
            <StatusTimeline status={status} />
          </Card>
        </Entrance>

        {delivery.items?.length ? (
          <Entrance delay={240} style={{ marginTop: theme.spacing.lg }}>
            <Card style={{ marginTop: 0 }}>
              <AppText variant="label" tone="secondary" style={{ marginBottom: theme.spacing.sm }}>
                Items
              </AppText>
              {delivery.items.map((item, i) => (
                <View key={item.id ?? i} style={{ flexDirection: 'row', alignItems: 'center', marginTop: i === 0 ? 0 : theme.spacing.sm }}>
                  <Ionicons name="cube-outline" size={15} color={theme.colors.textMuted} style={{ marginRight: theme.spacing.sm }} />
                  <AppText variant="bodySmall" style={{ flex: 1 }} numberOfLines={1}>
                    {item.description ?? 'Item'}
                  </AppText>
                  {item.quantity ? (
                    <AppText variant="caption" tone="muted">
                      ×{item.quantity}
                    </AppText>
                  ) : null}
                </View>
              ))}
            </Card>
          </Entrance>
        ) : null}

        {waitHint ? (
          <Entrance delay={280} style={{ marginTop: theme.spacing.lg }}>
            <Card variant="soft" style={{ marginTop: 0, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="hourglass-outline" size={20} color={theme.colors.primary} style={{ marginRight: theme.spacing.md }} />
              <AppText variant="bodySmall" tone="secondary" style={{ flex: 1 }}>
                {waitHint}
              </AppText>
            </Card>
          </Entrance>
        ) : null}
      </ScrollView>

      <ScreenFooter>
        {step ? (
          <Button label={step.label} size="lg" icon="arrow-forward" loading={update.isPending} onPress={() => advance(step)} />
        ) : delivered ? (
          <Button label="Back to home" size="lg" variant="success" onPress={() => navigation.goBack()} />
        ) : closed ? (
          <Button label="Close" size="lg" variant="secondary" onPress={() => navigation.goBack()} />
        ) : (
          <Button label="Close" size="lg" variant="secondary" onPress={() => navigation.goBack()} />
        )}
      </ScreenFooter>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 24 },
  glassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  codeBox: { flex: 1, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 12, alignItems: 'center' },
  routeDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
});