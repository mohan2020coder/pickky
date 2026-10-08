import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, GradientPreset } from '../../theme';
import { AppText, Avatar, Button, Card, Entrance, SectionHeader, StatusBadge, StatusTimeline, Screen, ScreenHeader } from '../../components';
import { useDelivery, useCancelDelivery } from '../../hooks/queries';
import { toast } from '../../stores/uiStore';
import { formatDateTime, formatDistance, formatMinutes, formatMoney } from '../../utils/format';
import { isActiveStatus, isTerminalStatus } from '../../constants/delivery';
import type { DeliveryStatus as DeliveryStatusType } from '../../types';
import type { CustomerFlowStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CustomerFlowStackParamList, 'DeliveryDetails'>;

const gradientForStatus = (status: DeliveryStatusType): GradientPreset => {
  if (status === 'DELIVERED') return 'success';
  if (status === 'CANCELLED' || status === 'FAILED') return 'danger';
  if (status === 'PICKED_UP' || status === 'IN_TRANSIT' || status === 'NEAR_DESTINATION' || status === 'DELIVERY_VERIFICATION') return 'ocean';
  return 'hero';
};

export const DeliveryDetailsScreen = ({ navigation, route }: Props) => {
  const theme = useTheme();
  const { deliveryId } = route.params ?? {};
  const { data: delivery } = useDelivery(deliveryId as string | undefined);
  const cancel = useCancelDelivery();

  const [showItems, setShowItems] = useState(true);

  if (!delivery) {
    return (
      <Screen>
        <ScreenHeader title="Delivery" onBack={() => navigation.goBack()} />
        <AppText variant="body" tone="secondary" center style={{ marginTop: theme.spacing.xl }}>
          Loading…
        </AppText>
      </Screen>
    );
  }

  const status = delivery.status as DeliveryStatusType;
  const active = isActiveStatus(status);

  const handleCancel = () => {
    cancel.mutate(
      { id: delivery.id, reason: 'Cancelled from delivery details' },
      {
        onSuccess: () => toast('Delivery cancelled.', { tone: 'info' }),
        onError: () => toast('We could not cancel the delivery.', { tone: 'error' }),
      },
    );
  };

  const goLive = () => {
    navigation.navigate('Tracking', { deliveryId: delivery.id });
  };

  const handleChat = () => {
    navigation.navigate('Chat', { conversationId: delivery.id, deliveryId: delivery.id });
  };

  return (
    <Screen>
      <ScreenHeader title={delivery.reference ?? 'Delivery'} subtitle={`${formatDateTime(delivery.created_at)} · ${formatDistance(delivery.distance_km)}`} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Entrance delay={0}>
          <Card variant="gradient" gradientPreset={gradientForStatus(status)} accessibilityLabel={`Delivery ${delivery.reference ?? ''} summary`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
                <AppText variant="eyebrow" color={theme.colors.textOnGradient} style={{ opacity: 0.85 }}>
                  {delivery.reference ?? 'DELIVERY'}
                </AppText>
                <AppText variant="heading1" color={theme.colors.textOnGradient} style={{ marginTop: theme.spacing.xs }}>
                  {formatMoney(delivery.price_minor, delivery.currency)}
                </AppText>
              </View>
              <StatusBadge status={status} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.45)',
                  borderRadius: theme.radius.pill,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: 5,
                }}
              >
                <Ionicons name="navigate-outline" size={12} color="#FFFFFF" style={{ marginRight: 5 }} />
                <AppText variant="caption" color="#FFFFFF" weight="800">
                  {formatDistance(delivery.distance_km)}
                </AppText>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.45)',
                  borderRadius: theme.radius.pill,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: 5,
                }}
              >
                <Ionicons name="time-outline" size={12} color="#FFFFFF" style={{ marginRight: 5 }} />
                <AppText variant="caption" color="#FFFFFF" weight="800">
                  {formatMinutes(delivery.eta_minutes)}
                </AppText>
              </View>
            </View>
          </Card>
        </Entrance>

        <Entrance delay={80}>
          <Card style={{ marginTop: theme.spacing.lg }}>
            <AppText variant="eyebrow" tone="muted" style={{ marginBottom: theme.spacing.md }}>
              ROUTE
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ alignItems: 'center', width: 24 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.successSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.success }} />
                </View>
                <View style={{ width: 2, flex: 1, minHeight: 28, backgroundColor: theme.colors.border, marginVertical: 4 }} />
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.errorSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="flag" size={12} color={theme.colors.error} />
                </View>
              </View>
              <View style={{ flex: 1, paddingLeft: theme.spacing.md }}>
                <AppText variant="eyebrow" tone="muted">
                  PICKUP
                </AppText>
                <AppText variant="body" weight="600" style={{ marginTop: 2 }}>
                  {delivery.pickup.addr ?? 'Pickup location'}
                </AppText>
                <AppText variant="eyebrow" tone="muted" style={{ marginTop: theme.spacing.md }}>
                  DROP-OFF
                </AppText>
                <AppText variant="body" weight="600" style={{ marginTop: 2 }}>
                  {delivery.dropoff.addr ?? 'Destination'}
                </AppText>
              </View>
            </View>
            <AppText variant="caption" tone="muted" style={{ marginTop: theme.spacing.md }}>
              Estimated {formatMinutes(delivery.eta_minutes)} · {formatDistance(delivery.distance_km)}
            </AppText>
          </Card>
        </Entrance>

        <Entrance delay={140}>
          <Card style={{ marginTop: theme.spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Avatar name={delivery.rider?.name ?? 'R'} ring />
              <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                <AppText variant="body" weight="700">
                  {delivery.rider?.name ?? 'Pending assignment'}
                </AppText>
                <AppText variant="caption" tone="secondary">
                  {delivery.rider?.vehicle_type ?? 'No rider yet'} · {delivery.rider?.license_plate ?? '—'}
                </AppText>
              </View>
              {delivery.rider ? (
                <Button label="Chat" variant="secondary" size="md" icon="chatbubble-outline" onPress={handleChat} />
              ) : null}
            </View>
          </Card>
        </Entrance>

        <Card style={{ marginTop: theme.spacing.lg }}>
          <SectionHeader
            title="Items"
            subtitle={`${delivery.items.length} ${delivery.items.length === 1 ? 'item' : 'items'}`}
            actionLabel={showItems ? 'Hide' : 'Show'}
            onAction={() => setShowItems((v) => !v)}
          />
          {showItems
            ? delivery.items.map((item, i) => (
                <View
                  key={item.id ?? i}
                  style={{
                    flexDirection: 'row',
                    marginTop: theme.spacing.sm,
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: theme.colors.surfaceSunken,
                    borderRadius: theme.radius.medium,
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.sm,
                  }}
                >
                  <AppText variant="body" weight="600" style={{ flex: 1, paddingRight: theme.spacing.sm }}>
                    ×{item.quantity} {item.description}
                  </AppText>
                  {item.weight_kg ? <AppText variant="caption" tone="muted">{item.weight_kg} kg</AppText> : null}
                </View>
              ))
            : null}
          {delivery.instructions ? (
            <AppText variant="bodySmall" tone="secondary" style={{ marginTop: theme.spacing.md }}>
              Note: {delivery.instructions}
            </AppText>
          ) : null}
        </Card>

        <Card style={{ marginTop: theme.spacing.lg }}>
          <SectionHeader title="Details" subtitle="Distance, timing and payment" />
          <View style={styles.row}>
            <AppText variant="body" tone="secondary">Distance</AppText>
            <AppText variant="body" weight="700">{formatDistance(delivery.distance_km)}</AppText>
          </View>
          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: theme.colors.divider }]}>
            <AppText variant="body" tone="secondary">Est. time</AppText>
            <AppText variant="body" weight="700">{formatMinutes(delivery.eta_minutes)}</AppText>
          </View>
          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: theme.colors.divider }]}>
            <AppText variant="body" tone="secondary">Paid</AppText>
            <AppText variant="price" color={theme.colors.primary} style={{ fontSize: 18 }}>
              {formatMoney(delivery.price_minor, delivery.currency)}
            </AppText>
          </View>
        </Card>

        <Card style={{ marginTop: theme.spacing.lg }}>
          <SectionHeader title="Status history" subtitle="Every step of this delivery" />
          <StatusTimeline status={status} />
        </Card>

        {active ? (
          <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.lg }}>
            <Button label="View live" style={{ flex: 1 }} icon="navigate" onPress={goLive} />
            <Button label="Cancel" variant="danger" style={{ flexShrink: 0 }} icon="close" onPress={handleCancel} loading={cancel.isPending} />
          </View>
        ) : isTerminalStatus(status) ? (
          <AppText variant="caption" tone="muted" center style={{ marginTop: theme.spacing.lg }}>
            This delivery is {status.toLowerCase().replace('_', ' ')}. Contact support if you have questions.
          </AppText>
        ) : null}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
});
