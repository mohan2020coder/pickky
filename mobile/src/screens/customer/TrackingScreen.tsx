import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomerFlowStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Avatar, Button, DeliveryMap, MapOverlay, StatusTimeline, ScreenHeader } from '../../components';
import { useDelivery } from '../../hooks/queries';
import { useRealtimeStore } from '../../stores/realtimeStore';
import { STATUS_META, isActiveStatus, isTerminalStatus } from '../../constants/delivery';
import { formatMinutes } from '../../utils/format';
import { useCancelDelivery } from '../../hooks/queries';
import { toast } from '../../stores/uiStore';
import { DeliveryStatus } from '../../types';

type Props = NativeStackScreenProps<CustomerFlowStackParamList, 'Tracking'>;

export const TrackingScreen = ({ navigation, route }: Props) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { deliveryId, autoVerifyStage } = route.params ?? {};
  const { data: delivery } = useDelivery(deliveryId);
  const realtimeStatus = useRealtimeStore((s) => (deliveryId ? s.activeDeliveries[deliveryId] : undefined));
  const riderLocation = useRealtimeStore((s) => (deliveryId ? s.riderLocations[deliveryId] ?? null : null));
  const cancel = useCancelDelivery();

  const status: DeliveryStatus = (realtimeStatus ?? delivery?.status ?? 'CREATED') as DeliveryStatus;
  const meta = STATUS_META[status];

  const stage = autoVerifyStage ?? (status === 'PICKUP_VERIFICATION' ? 'pickup' : status === 'DELIVERY_VERIFICATION' ? 'delivery' : null);

  useEffect(() => {
    if (!deliveryId || !stage) return;
    const hasVerificationScreen = navigation.getState().routes.some((r) => r.name === (stage === 'pickup' ? 'PickupVerification' : 'DeliveryVerification'));
    if (!hasVerificationScreen) return;
    const t = setTimeout(() => {
      if (stage === 'pickup') navigation.replace('PickupVerification', { deliveryId });
      else navigation.replace('DeliveryVerification', { deliveryId });
    }, 400);
    return () => clearTimeout(t);
  }, [stage, deliveryId, navigation]);

  useEffect(() => {
    if (status === 'DELIVERED' && deliveryId) {
      const hasCompleted = navigation.getState().routes.some((r) => r.name === 'DeliveryCompleted');
      if (hasCompleted) navigation.replace('DeliveryCompleted', { deliveryId });
    }
  }, [status, deliveryId, navigation]);

  const handleCancel = () => {
    if (!deliveryId) return;
    cancel.mutate(
      { id: deliveryId, reason: 'Cancelled from tracking' },
      {
        onSuccess: () => {
          toast('Delivery cancelled.', { tone: 'info' });
          navigation.getParent()?.goBack();
        },
        onError: () => toast('We could not cancel the delivery.', { tone: 'error' }),
      },
    );
  };

  const connecting = realtimeStatus === undefined;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <MapOverlay style={{ top: insets.top + 12 }}>
        <ScreenHeader
          transparent
          title={delivery?.reference ?? 'Delivery'}
          subtitle={meta.label}
          onBack={() => navigation.getParent()?.goBack()}
          iconRight={{
            icon: 'chatbubbles-outline' as const,
            label: 'Open chat',
            onPress: () => {
              if (deliveryId) navigation.navigate('Chat', { conversationId: deliveryId, deliveryId });
            },
          }}
        />
      </MapOverlay>

      <DeliveryMap pickup={delivery?.pickup} dropoff={delivery?.dropoff} riderLocation={riderLocation} following={Boolean(riderLocation)} />

      <MapOverlay>
        <View style={[styles.bottomCard, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.large, borderColor: theme.colors.border, borderWidth: 1 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Avatar name={delivery?.rider?.name ?? 'R'} ring />
            <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
              <AppText variant="body" weight="700">
                {delivery?.rider?.name ?? 'Assigning a rider…'}
              </AppText>
              <AppText variant="bodySmall" tone="secondary">
                {delivery?.rider?.vehicle_type ? `${delivery.rider.vehicle_type} · ${delivery.rider.license_plate ?? ''}`.trim() : ''}
              </AppText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Ionicons name="navigate" size={16} color={theme.colors.primary} />
              <AppText variant="caption" tone="primary" weight="600">
                {delivery ? formatMinutes(delivery.eta_minutes) : '—'}
              </AppText>
            </View>
          </View>

          <StatusTimeline compact status={status} />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: theme.spacing.sm }}>
            {isActiveStatus(status) && status !== 'DELIVERED' && status !== 'CANCELLED' && status !== 'PICKUP_VERIFICATION' && status !== 'DELIVERY_VERIFICATION' ? (
              <>
                <Button
                  label={connecting ? 'Connecting live…' : 'Live'}
                  variant="secondary"
                  size="md"
                  style={{ flex: 1 }}
                  icon="radio-outline"
                  onPress={undefined}
                />
                <Button
                  label={delivery?.rider ? 'Chat' : 'Chat'}
                  variant="secondary"
                  size="md"
                  style={{ flexShrink: 0 }}
                  icon="chatbubble-outline"
                  onPress={() => deliveryId && navigation.navigate('Chat', { conversationId: deliveryId, deliveryId })}
                />
              </>
            ) : status === 'CANCELLED' || status === 'FAILED' ? null : null}
            {isTerminalStatus(status) ? null : (
              <Button label="Cancel" variant="danger" size="md" style={{ flexShrink: 0 }} icon="close" onPress={handleCancel} loading={cancel.isPending} />
            )}
          </View>
        </View>
      </MapOverlay>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomCard: { padding: 16, paddingBottom: 12 },
});