import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderHomeStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import {
  AppText,
  Button,
  Card,
  EmptyView,
  Entrance,
  Gradient,
  LoadingView,
  Screen,
  ScreenFooter,
  ScreenHeader,
} from '../../components';
import { useAcceptOffer, useRejectOffer, useRiderOffers } from '../../hooks/queries';
import { toast } from '../../stores/uiStore';
import { formatDistance, formatMoney } from '../../utils/format';

type Props = NativeStackScreenProps<RiderHomeStackParamList, 'DeliveryRequest'>;

export const DeliveryRequestScreen = ({ navigation, route }: Props) => {
  const theme = useTheme();
  const offerId = route.params?.offerId;
  const { data: offers = [], isPending } = useRiderOffers();
  const offer = offers.find((o) => o.id === offerId);
  const accept = useAcceptOffer();
  const reject = useRejectOffer();

  const handleAccept = () => {
    if (!offer) return;
    accept.mutate(offer.id, {
      onSuccess: (delivery) => {
        toast('Delivery accepted — head to the pickup point.', { tone: 'success' });
        navigation.replace('ActiveDelivery', { deliveryId: delivery.id });
      },
      onError: () => toast('This request is no longer available.', { tone: 'error' }),
    });
  };

  const handleReject = () => {
    if (!offer) return;
    reject.mutate(offer.id, {
      onSuccess: () => {
        toast('Request declined.', { tone: 'info' });
        navigation.goBack();
      },
      onError: () => toast('We could not decline this request.', { tone: 'error' }),
    });
  };

  const RouteRow = ({ icon, label, value, color, connector }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string; color: string; connector?: boolean }) => (
    <View style={{ flexDirection: 'row' }}>
      <View style={{ alignItems: 'center', width: 26 }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={13} color={color} />
        </View>
        {connector ? <View style={{ width: 2, flex: 1, minHeight: 18, backgroundColor: theme.colors.border, marginVertical: 4 }} /> : null}
      </View>
      <View style={{ flex: 1, paddingLeft: theme.spacing.md, paddingBottom: connector ? theme.spacing.md : 0 }}>
        <AppText variant="caption" tone="muted">
          {label}
        </AppText>
        <AppText variant="body" weight="600" numberOfLines={2}>
          {value}
        </AppText>
      </View>
    </View>
  );

  return (
    <Screen>
      <ScreenHeader title="New delivery request" subtitle="Review the trip before you accept" onBack={() => navigation.goBack()} />

      {isPending && !offer ? (
        <LoadingView label="Loading request…" />
      ) : !offer ? (
        <EmptyView
          icon="time-outline"
          title="This request is gone"
          message="It may have expired or another rider accepted it first."
          actionLabel="Close"
          onAction={() => navigation.goBack()}
        />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Entrance delay={40}>
              <Card variant="gradient" gradientPreset="success" style={{ marginTop: theme.spacing.sm }}>
                <AppText variant="eyebrow" color={theme.colors.textOnGradient} style={{ opacity: 0.9 }}>
                  You earn
                </AppText>
                <AppText variant="display" color={theme.colors.textOnGradient} style={{ marginTop: theme.spacing.xs }}>
                  {formatMoney(offer.earnings_minor, offer.currency)}
                </AppText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
                  <View style={styles.glassPill}>
                    <Ionicons name="navigate" size={13} color={theme.colors.textOnGradient} />
                    <AppText variant="caption" color={theme.colors.textOnGradient} weight="800" style={{ marginLeft: 6 }}>
                      {formatDistance(offer.distance_km)}
                    </AppText>
                  </View>
                  {offer.package_type ? (
                    <View style={styles.glassPill}>
                      <Ionicons name="cube" size={13} color={theme.colors.textOnGradient} />
                      <AppText variant="caption" color={theme.colors.textOnGradient} weight="800" style={{ marginLeft: 6 }}>
                        {offer.package_type}
                      </AppText>
                    </View>
                  ) : null}
                </View>
              </Card>
            </Entrance>

            <Entrance delay={120} style={{ marginTop: theme.spacing.lg }}>
              <Card style={{ marginTop: 0 }}>
                <AppText variant="label" tone="secondary" style={{ marginBottom: theme.spacing.md }}>
                  Route
                </AppText>
                <RouteRow icon="location" label="Pickup" value={offer.pickup_addr} color={theme.colors.success} connector />
                <RouteRow icon="flag" label="Drop-off" value={offer.dropoff_addr} color={theme.colors.error} />
              </Card>
            </Entrance>

            {offer.customer_rating != null ? (
              <Entrance delay={180} style={{ marginTop: theme.spacing.lg }}>
                <Card style={{ marginTop: 0, flexDirection: 'row', alignItems: 'center' }}>
                  <Gradient preset="sunset" style={styles.ratingMedallion}>
                    <Ionicons name="star" size={18} color="#FFFFFF" />
                  </Gradient>
                  <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                    <AppText variant="label">Customer rating</AppText>
                    <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                      {offer.customer_rating.toFixed(1)} out of 5
                    </AppText>
                  </View>
                </Card>
              </Entrance>
            ) : null}
          </ScrollView>

          <ScreenFooter>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <Button
                label="Decline"
                variant="secondary"
                size="lg"
                style={{ flex: 1 }}
                loading={reject.isPending}
                onPress={handleReject}
              />
              <Button
                label="Accept"
                size="lg"
                style={{ flex: 1 }}
                loading={accept.isPending}
                onPress={handleAccept}
              />
            </View>
          </ScreenFooter>
        </>
      )}
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
  ratingMedallion: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});