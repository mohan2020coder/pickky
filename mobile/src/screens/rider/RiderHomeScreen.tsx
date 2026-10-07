import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderHomeStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Button, Card, Screen, ScreenHeader, StatusBadge } from '../../components';
import {
  useCurrentUser,
  useEarnings,
  useRiderDeliveries,
  useRiderOffers,
  useRiderProfile,
  useSetRiderPresence,
} from '../../hooks/queries';
import { toast } from '../../stores/uiStore';
import { isActiveStatus } from '../../constants/delivery';
import { formatMoney } from '../../utils/format';
import { RiderStatus } from '../../types';

type Props = NativeStackScreenProps<RiderHomeStackParamList, 'RiderHome'>;

export const RiderHomeScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { data: user } = useCurrentUser();
  const { data: profile } = useRiderProfile();
  const { data: earnings } = useEarnings();
  const { data: deliveries = [] } = useRiderDeliveries();
  const presence = useSetRiderPresence();

  const online = profile?.status === 'ONLINE';
  const { data: offers = [] } = useRiderOffers(online);
  const offer = offers[0];
  const active = deliveries.find((d) => isActiveStatus(d.status));

  const firstName = (user?.name ?? 'Rider').split(' ')[0] ?? 'Rider';

  const togglePresence = () => {
    const next: RiderStatus = online ? 'OFFLINE' : 'ONLINE';
    presence.mutate(next, {
      onSuccess: () =>
        toast(next === 'ONLINE' ? 'You are online — watching for deliveries.' : 'You are now offline.', {
          tone: next === 'ONLINE' ? 'success' : 'info',
        }),
      onError: () => toast('We could not update your status.', { tone: 'error' }),
    });
  };

  return (
    <Screen>
      <ScreenHeader
        large
        title={`Hi, ${firstName}`}
        subtitle={online ? 'You are online and receiving requests' : 'Go online to start receiving requests'}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Button
          label={online ? "You're online — tap to go offline" : "You're offline — tap to go online"}
          variant={online ? 'secondary' : 'primary'}
          icon={online ? 'radio' : 'radio-outline'}
          loading={presence.isPending}
          onPress={togglePresence}
        />

        {offer ? (
          <Card style={{ marginTop: theme.spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="label" tone="primary">
                New delivery nearby
              </AppText>
              <AppText variant="heading3" color={theme.colors.primary}>
                {formatMoney(offer.earnings_minor, offer.currency)}
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.md }}>
              <Ionicons name="location" size={16} color={theme.colors.success} style={{ marginRight: theme.spacing.sm }} />
              <AppText variant="body" numberOfLines={1} style={{ flex: 1 }}>
                {offer.pickup_addr}
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.xs }}>
              <Ionicons name="flag" size={16} color={theme.colors.error} style={{ marginRight: theme.spacing.sm }} />
              <AppText variant="body" numberOfLines={1} style={{ flex: 1 }}>
                {offer.dropoff_addr}
              </AppText>
            </View>
            <Button
              label="View offer"
              size="md"
              iconRight="chevron-forward"
              style={{ marginTop: theme.spacing.md }}
              onPress={() => navigation.navigate('DeliveryRequest', { offerId: offer.id })}
            />
          </Card>
        ) : null}

        {online && !offer && !active ? (
          <Card style={{ marginTop: theme.spacing.lg, alignItems: 'center' }}>
            <Ionicons name="hourglass-outline" size={28} color={theme.colors.primary} />
            <AppText variant="heading3" style={{ marginTop: theme.spacing.sm }}>
              Waiting for deliveries…
            </AppText>
            <AppText variant="bodySmall" tone="secondary" center style={{ marginTop: theme.spacing.xs }}>
              New requests will pop up here as soon as a customer books a pickup nearby.
            </AppText>
          </Card>
        ) : null}

        {!online && !active ? (
          <Card style={{ marginTop: theme.spacing.lg }}>
            <AppText variant="label">Ready to earn?</AppText>
            <AppText variant="bodySmall" tone="secondary" style={{ marginTop: theme.spacing.xs }}>
              Flip the switch above when you are ready to pick up deliveries around you.
            </AppText>
          </Card>
        ) : null}

        {active ? (
          <Card style={{ marginTop: theme.spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="label">Active delivery</AppText>
              <StatusBadge status={active.status} />
            </View>
            <AppText variant="bodySmall" tone="secondary" numberOfLines={1} style={{ marginTop: theme.spacing.sm }}>
              {active.pickup.addr ?? 'Pickup'} → {active.dropoff.addr ?? 'Destination'}
            </AppText>
            <Button
              label="Open active delivery"
              size="md"
              icon="navigate-outline"
              style={{ marginTop: theme.spacing.md }}
              onPress={() => navigation.navigate('ActiveDelivery', { deliveryId: active.id })}
            />
          </Card>
        ) : null}

        <Card style={{ marginTop: theme.spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <AppText variant="caption" tone="secondary">
                Today's earnings
              </AppText>
              <AppText variant="price" color={theme.colors.primary} style={{ marginTop: theme.spacing.xxs }}>
                {formatMoney(earnings?.today_minor ?? 0, earnings?.currency)}
              </AppText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <AppText variant="caption" tone="muted">
                {earnings?.deliveries_today ?? 0} deliveries
              </AppText>
              <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                {formatMoney(earnings?.week_minor ?? 0, earnings?.currency)} this week
              </AppText>
            </View>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
});
