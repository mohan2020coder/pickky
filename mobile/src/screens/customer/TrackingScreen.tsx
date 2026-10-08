import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomerFlowStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Avatar, Button, Card, DeliveryMap, Entrance, IconButton, MapOverlay, ProgressIndicator, StatusBadge, StatusTimeline } from '../../components';
import { useDelivery } from '../../hooks/queries';
import { useRealtimeStore } from '../../stores/realtimeStore';
import { DELIVERY_FLOW, STATUS_META, isActiveStatus, isTerminalStatus } from '../../constants/delivery';
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

  // When the delivery is waiting for a code, show an explicit "Enter code" button.
  // The backend accepts verification from RIDER_ARRIVED_PICKUP / NEAR_DESTINATION
  // (the *_VERIFICATION statuses are only set transiently server-side).
  const stage =
    autoVerifyStage ??
    (status === 'RIDER_ARRIVED_PICKUP' || status === 'PICKUP_VERIFICATION'
      ? 'pickup'
      : status === 'NEAR_DESTINATION' || status === 'DELIVERY_VERIFICATION'
        ? 'delivery'
        : null);

  const openedCompletedRef = React.useRef(false);

  // Verification is never auto-opened: "View live" and back-navigation must land
  // on Tracking. The explicit "Enter code" button below is the entry point.

  useEffect(() => {
    if (!deliveryId || status !== 'DELIVERED') {
      openedCompletedRef.current = false;
      return;
    }
    const state = navigation.getState();
    if (state.routes[state.index]?.name === 'DeliveryCompleted') return;
    if (openedCompletedRef.current) return;
    const t = setTimeout(() => {
      openedCompletedRef.current = true;
      navigation.replace('DeliveryCompleted', { deliveryId });
    }, 400);
    return () => clearTimeout(t);
  }, [status, deliveryId, navigation]);

  const handleCancel = () => {
    if (!deliveryId) return;
    cancel.mutate(
      { id: deliveryId, reason: 'Cancelled from tracking' },
      {
        onSuccess: () => {
          toast('Delivery cancelled.', { tone: 'info' });
          navigation.popToTop();
        },
        onError: () => toast('We could not cancel the delivery.', { tone: 'error' }),
      },
    );
  };

  const connecting = realtimeStatus === undefined;
  const routeProgress =
    status === 'CANCELLED' || status === 'FAILED' || meta.stepIndex < 0
      ? 0
      : Math.min(1, (meta.stepIndex + 1) / DELIVERY_FLOW.length);
  const canChat =
    isActiveStatus(status) && status !== 'DELIVERED' && status !== 'CANCELLED' && status !== 'PICKUP_VERIFICATION' && status !== 'DELIVERY_VERIFICATION';
  const canCancel = !isTerminalStatus(status);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <DeliveryMap pickup={delivery?.pickup} dropoff={delivery?.dropoff} riderLocation={riderLocation} following={Boolean(riderLocation)} />

      <MapOverlay style={{ top: insets.top, justifyContent: 'flex-start' }}>
        <Card variant="glass" padded={false} style={{ overflow: 'hidden' }}>
          <View style={{ paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <IconButton
                icon="chevron-back"
                accessibilityLabel="Go back"
                size={38}
                onPress={() => navigation.popToTop()}
              />
              <View style={{ flex: 1, marginHorizontal: theme.spacing.sm }}>
                <AppText variant="label" weight="800" numberOfLines={1}>
                  {delivery?.reference ?? 'Delivery'}
                </AppText>
                <AppText variant="caption" tone="secondary" numberOfLines={1} style={{ marginTop: 1 }}>
                  {meta.label}
                </AppText>
              </View>
              <IconButton
                icon="chatbubbles-outline"
                accessibilityLabel="Open chat"
                size={38}
                onPress={() => {
                  if (deliveryId) navigation.navigate('Chat', { conversationId: deliveryId, deliveryId });
                }}
              />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.md }}>
              <StatusBadge status={status} />
              <View style={{ flex: 1 }} />
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: connecting ? theme.colors.warningSoft : theme.colors.successSoft,
                  borderRadius: theme.radius.pill,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: 5,
                }}
                accessibilityLabel={connecting ? 'Connecting to live updates' : 'Live updates connected'}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: connecting ? theme.colors.warning : theme.colors.success,
                  }}
                />
                <AppText
                  variant="caption"
                  weight="800"
                  color={connecting ? theme.colors.warning : theme.colors.success}
                  style={{ marginLeft: 6 }}
                >
                  {connecting ? 'Connecting…' : 'Live'}
                </AppText>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.md }}>
              <Avatar name={delivery?.rider?.name ?? 'R'} size={38} ring />
              <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                <AppText variant="label" weight="700" numberOfLines={1}>
                  {delivery?.rider?.name ?? 'Assigning a rider…'}
                </AppText>
                <AppText variant="caption" tone="secondary" numberOfLines={1} style={{ marginTop: 1 }}>
                  {delivery?.rider?.vehicle_type ? `${delivery.rider.vehicle_type} · ${delivery.rider.license_plate ?? ''}`.trim() : 'Searching for your rider'}
                </AppText>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: theme.colors.primarySoft,
                  borderRadius: theme.radius.pill,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: 5,
                }}
              >
                <Ionicons name="navigate" size={12} color={theme.colors.primary} />
                <AppText variant="caption" weight="800" color={theme.colors.primary} style={{ marginLeft: 4 }}>
                  {delivery ? formatMinutes(delivery.eta_minutes) : '—'}
                </AppText>
              </View>
            </View>
          </View>
        </Card>
      </MapOverlay>

      <MapOverlay>
        <View
          style={[
            styles.bottomPanel,
            {
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: theme.radius.xl,
              borderTopRightRadius: theme.radius.xl,
              borderColor: theme.colors.divider,
              ...theme.shadows.high,
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: theme.colors.borderStrong }]} />

          <ProgressIndicator progress={routeProgress} label="Route progress" />

          <Card style={{ marginTop: theme.spacing.md }}>
            <StatusTimeline compact status={status} />
          </Card>

          {stage && deliveryId ? (
            <Entrance delay={0} style={{ marginTop: theme.spacing.md }}>
              <Button
                label={stage === 'pickup' ? 'Enter pickup code' : 'Enter delivery code'}
                icon="keypad-outline"
                onPress={() => navigation.replace(stage === 'pickup' ? 'PickupVerification' : 'DeliveryVerification', { deliveryId })}
              />
            </Entrance>
          ) : null}

          {canChat || canCancel ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: theme.spacing.lg }}>
              {canChat ? (
                <IconButton
                  icon="chatbubble-outline"
                  accessibilityLabel="Chat with your rider"
                  onPress={() => deliveryId && navigation.navigate('Chat', { conversationId: deliveryId, deliveryId })}
                />
              ) : null}
              <View style={{ flex: 1 }} />
              {canCancel ? (
                <Button label="Cancel" variant="danger" size="md" style={{ flexShrink: 0 }} icon="close" onPress={handleCancel} loading={cancel.isPending} />
              ) : null}
            </View>
          ) : null}
        </View>
      </MapOverlay>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomPanel: {
    padding: 16,
    paddingBottom: 12,
    borderWidth: 1,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
});
