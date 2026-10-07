import React from 'react';
import { ScrollView, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomerHomeStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Button, Card, DeliveryCard, Avatar, LoadingView, ErrorView, SectionHeader, Chip } from '../../components';
import { useAuthStore } from '../../stores/authStore';
import { useBookingStore } from '../../stores/bookingStore';
import { useDeliveries, useSavedAddresses, useUnreadCount } from '../../hooks/queries';
import { ROLE_META } from '../../constants/delivery';
import { isActiveStatus } from '../../constants/delivery';

type Props = NativeStackScreenProps<CustomerHomeStackParamList, 'CustomerHome'>;

export const CustomerHomeScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const {
    data: active,
    isLoading: loadingActive,
    isError: errorActive,
    refetch: refetchActive,
  } = useDeliveries({ scope: 'active' });
  const { data: saved } = useSavedAddresses();
  const { data: unread } = useUnreadCount();

  const roleLabel = user?.roles[0] ?? 'CUSTOMER';

  const startBooking = (pickupAddr?: { address: string; lat: number; lng: number } | null) => {
    useBookingStore.getState().reset();
    if (pickupAddr) {
      useBookingStore.getState().setPickup({ lat: pickupAddr.lat, lng: pickupAddr.lng, addr: pickupAddr.address });
    }
    navigation.navigate('CreateDelivery');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + theme.spacing.lg, paddingBottom: insets.bottom + theme.spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" tone="secondary">
                Hello, {user?.name?.split(' ')[0] ?? 'there'} 👋
              </AppText>
              <AppText variant="heading1" weight="800" numberOfLines={1}>
                {ROLE_META[roleLabel]?.home ?? 'Send anything'}
              </AppText>
            </View>
            <Avatar name={user?.name ?? 'U'} size={44} ring />
          </View>

          <Card
            elevated
            style={{ marginTop: theme.spacing.lg, backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }}
            accessibilityLabel="Create a delivery"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <AppText variant="heading3" color="#FFFFFF" weight="700">
                  It&apos;s easy
                </AppText>
                <AppText variant="bodySmall" color="rgba(255,255,255,0.85)" style={{ marginTop: 4 }}>
                  Documents · parcels · groceries · keys · gifts
                </AppText>
              </View>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
              </View>
            </View>
            <Button label="Picky something up" size="md" variant="secondary" onPress={() => startBooking(null)} style={{ marginTop: theme.spacing.lg }} />
          </Card>

          {saved && saved.length > 0 ? (
            <View style={{ marginTop: theme.spacing.lg }}>
              <AppText variant="label" tone="secondary" style={{ marginBottom: theme.spacing.sm }}>
                Pick up from
              </AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {saved.slice(0, 6).map((addr) => (
                  <Chip key={addr.id} icon="home-outline" label={addr.label} onPress={() => startBooking(addr)} small />
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: theme.spacing.xl }}>
          <SectionHeader
            title="Active deliveries"
            actionLabel={active && active.length > 0 ? 'View all' : undefined}
            onAction={() => navigation.getParent()?.getParent()?.navigate('HistoryTab' as never)}
          />
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {loadingActive ? (
            <LoadingView label="Loading your deliveries…" />
          ) : errorActive ? (
            <ErrorView compact message="We could not load your deliveries." onRetry={() => void refetchActive()} />
          ) : active && active.length > 0 ? (
            active.slice(0, 3).map((delivery) => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                style={{ marginBottom: theme.spacing.md }}
                onPress={() => {
                  if (isActiveStatus(delivery.status) && !['DELIVERED'].includes(delivery.status)) {
                    navigation.navigate('Tracking', { deliveryId: delivery.id });
                  } else {
                    navigation.navigate('DeliveryDetails', { deliveryId: delivery.id });
                  }
                }}
              />
            ))
          ) : (
            <Card accessibilityLabel="No active deliveries">
              <AppText variant="body" tone="secondary">
                No deliveries in progress. Create one to get started.
              </AppText>
            </Card>
          )}
        </View>

        {unread && unread > 0 ? (
          <View style={{ paddingHorizontal: 20, marginTop: theme.spacing.md }}>
            <Card
              onPress={() => navigation.getParent()?.getParent()?.navigate('NotificationsTab' as never)}
              elevated
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <Ionicons name="notifications" size={18} color={theme.colors.primary} />
              <AppText variant="bodySmall" tone="primary" style={{ marginLeft: theme.spacing.sm }}>
                {unread} unread {unread === 1 ? 'notification' : 'notifications'}
              </AppText>
            </Card>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};