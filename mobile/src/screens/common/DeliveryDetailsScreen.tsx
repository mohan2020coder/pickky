import React, { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { AppText, Avatar, Button, Card, Screen, ScreenHeader, StatusTimeline } from '../../components';
import { useDelivery, useCancelDelivery } from '../../hooks/queries';
import { toast } from '../../stores/uiStore';
import { formatDateTime, formatDistance, formatMinutes, formatMoney } from '../../utils/format';
import { isActiveStatus, isTerminalStatus } from '../../constants/delivery';
import type { DeliveryStatus as DeliveryStatusType } from '../../types';
import type { CustomerFlowStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CustomerFlowStackParamList, 'DeliveryDetails'>;

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
      <ScrollView contentContainerStyle={styles.scroll}>
        <StatusTimeline status={status} />

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

        <Card style={{ marginTop: theme.spacing.lg }}>
          <AppText variant="label" tone="secondary">Pickup</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.sm }}>
            <Ionicons name="location" size={18} color={theme.colors.success} style={{ marginRight: theme.spacing.sm }} />
            <AppText variant="body" style={{ flex: 1 }}>{delivery.pickup.addr ?? 'Pickup location'}</AppText>
          </View>
          <View style={{ height: 14, width: 2, backgroundColor: theme.colors.border, marginLeft: 9, marginVertical: 4 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="flag" size={18} color={theme.colors.error} style={{ marginRight: theme.spacing.sm }} />
            <AppText variant="body" style={{ flex: 1 }}>{delivery.dropoff.addr ?? 'Destination'}</AppText>
          </View>
          <AppText variant="caption" tone="muted" style={{ marginTop: theme.spacing.sm }}>
            Estimated {formatMinutes(delivery.eta_minutes)} · {formatDistance(delivery.distance_km)}
          </AppText>
        </Card>

        <Card style={{ marginTop: theme.spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="label" tone="secondary">Items · {delivery.items.length}</AppText>
            <Button label={showItems ? 'Hide' : 'Show'} variant="ghost" size="sm" onPress={() => setShowItems((v) => !v)} />
          </View>
          {showItems
            ? delivery.items.map((item, i) => (
                <View key={item.id ?? i} style={{ flexDirection: 'row', marginTop: theme.spacing.sm, justifyContent: 'space-between' }}>
                  <AppText variant="body" style={{ flex: 1 }}>×{item.quantity} {item.description}</AppText>
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="body" tone="secondary">Distance</AppText>
            <AppText variant="body" weight="600">{formatDistance(delivery.distance_km)}</AppText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.sm }}>
            <AppText variant="body" tone="secondary">Est. time</AppText>
            <AppText variant="body" weight="600">{formatMinutes(delivery.eta_minutes)}</AppText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.sm }}>
            <AppText variant="body" tone="secondary">Paid</AppText>
            <AppText variant="body" weight="800" color={theme.colors.primary}>{formatMoney(delivery.price_minor, delivery.currency)}</AppText>
          </View>
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
});