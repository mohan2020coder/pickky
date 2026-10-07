import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderHomeStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Button, Card, Screen, ScreenHeader } from '../../components';
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

  return (
    <Screen>
      <ScreenHeader title="New delivery request" subtitle="Review the trip before you accept" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {isPending && !offer ? (
          <AppText variant="body" tone="secondary" center style={{ marginTop: theme.spacing.xl }}>
            Loading request…
          </AppText>
        ) : !offer ? (
          <Card style={{ alignItems: 'center', marginTop: theme.spacing.lg }}>
            <Ionicons name="time-outline" size={32} color={theme.colors.textMuted} />
            <AppText variant="heading3" center style={{ marginTop: theme.spacing.sm }}>
              This request is gone
            </AppText>
            <AppText variant="bodySmall" tone="secondary" center style={{ marginTop: theme.spacing.xs }}>
              It may have expired or another rider accepted it first.
            </AppText>
            <Button
              label="Close"
              variant="secondary"
              size="md"
              fullWidth={false}
              style={{ marginTop: theme.spacing.lg }}
              onPress={() => navigation.goBack()}
            />
          </Card>
        ) : (
          <Card style={{ marginTop: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="label" tone="secondary">
                You earn
              </AppText>
              <AppText variant="price" color={theme.colors.primary}>
                {formatMoney(offer.earnings_minor, offer.currency)}
              </AppText>
            </View>

            <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: theme.colors.primarySoft,
                  borderRadius: theme.radius.pill,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: 6,
                }}
              >
                <Ionicons name="navigate-outline" size={14} color={theme.colors.primary} style={{ marginRight: 6 }} />
                <AppText variant="caption" color={theme.colors.primary} weight="700">
                  {formatDistance(offer.distance_km)}
                </AppText>
              </View>
              {offer.package_type ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: theme.colors.surfaceElevated,
                    borderRadius: theme.radius.pill,
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: 6,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                >
                  <Ionicons name="cube-outline" size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
                  <AppText variant="caption" tone="secondary" weight="700">
                    {offer.package_type}
                  </AppText>
                </View>
              ) : null}
            </View>

            <View style={{ marginTop: theme.spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="location" size={18} color={theme.colors.success} style={{ marginRight: theme.spacing.sm }} />
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" tone="muted">
                    Pickup
                  </AppText>
                  <AppText variant="body">{offer.pickup_addr}</AppText>
                </View>
              </View>
              <View style={{ height: 14, width: 2, backgroundColor: theme.colors.border, marginLeft: 9, marginVertical: 4 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="flag" size={18} color={theme.colors.error} style={{ marginRight: theme.spacing.sm }} />
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" tone="muted">
                    Drop-off
                  </AppText>
                  <AppText variant="body">{offer.dropoff_addr}</AppText>
                </View>
              </View>
            </View>

            {offer.customer_rating ? (
              <AppText variant="caption" tone="muted" style={{ marginTop: theme.spacing.md }}>
                Customer rating {offer.customer_rating.toFixed(1)} · {formatMoney(offer.earnings_minor, offer.currency)} payout
              </AppText>
            ) : null}
          </Card>
        )}
      </ScrollView>

      {offer ? (
        <View style={styles.footer}>
          <Button
            label="Decline"
            variant="secondary"
            size="md"
            style={{ flex: 1 }}
            disabled={reject.isPending || accept.isPending}
            onPress={handleReject}
          />
          <Button
            label="Accept"
            size="md"
            style={{ flex: 1 }}
            loading={accept.isPending}
            disabled={reject.isPending}
            onPress={handleAccept}
          />
        </View>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 24 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
});
