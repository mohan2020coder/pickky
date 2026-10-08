import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomerHomeStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import {
  AppText,
  Avatar,
  Button,
  Card,
  Chip,
  DeliveryCard,
  EmptyView,
  Entrance,
  EntranceTop,
  ErrorView,
  LoadingView,
  SectionHeader,
} from '../../components';
import { useAuthStore } from '../../stores/authStore';
import { useBookingStore } from '../../stores/bookingStore';
import { useDeliveries, useSavedAddresses, useUnreadCount } from '../../hooks/queries';
import { ROLE_META } from '../../constants/delivery';
import { isActiveStatus } from '../../constants/delivery';

type Props = NativeStackScreenProps<CustomerHomeStackParamList, 'CustomerHome'>;

const QUICK_CATEGORIES = [
  { id: 'documents', label: 'Documents', icon: 'document-outline' as const },
  { id: 'parcels', label: 'Parcels', icon: 'cube-outline' as const },
  { id: 'groceries', label: 'Groceries', icon: 'cart-outline' as const },
  { id: 'keys', label: 'Keys', icon: 'key-outline' as const },
  { id: 'gifts', label: 'Gifts', icon: 'gift-outline' as const },
];

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
  const firstName = user?.name?.split(' ')[0];

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
          <EntranceTop delay={0}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
                <AppText variant="eyebrow" tone="primary">
                  Good to see you
                </AppText>
                <AppText variant="heading1" weight="800" numberOfLines={1} style={{ marginTop: theme.spacing.xs }}>
                  {ROLE_META[roleLabel]?.home ?? 'Send anything'}
                </AppText>
                <AppText variant="bodySmall" tone="secondary" style={{ marginTop: 4 }}>
                  {firstName ? `${firstName}, what should we pick up today?` : 'What should we pick up today?'}
                </AppText>
              </View>
              <Avatar name={user?.name ?? 'U'} size={52} ring />
            </View>
          </EntranceTop>

          <Entrance delay={80}>
            <Card
              variant="gradient"
              gradientPreset="hero"
              style={{ marginTop: theme.spacing.xl }}
              accessibilityLabel="Create a delivery"
            >
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <View
                  style={[styles.circle, { top: -46, right: -24, width: 150, height: 150, backgroundColor: 'rgba(255,255,255,0.10)' }]}
                />
                <View
                  style={[styles.circle, { bottom: -54, left: -30, width: 132, height: 132, backgroundColor: 'rgba(255,255,255,0.07)' }]}
                />
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
                  <AppText variant="eyebrow" color="rgba(255,255,255,0.72)">
                    Anything, anywhere
                  </AppText>
                  <AppText variant="heading3" color="#FFFFFF" weight="800" style={{ marginTop: 6 }}>
                    It&apos;s easy
                  </AppText>
                  <AppText variant="bodySmall" color="rgba(255,255,255,0.85)" style={{ marginTop: 4 }}>
                    Documents · parcels · groceries · keys · gifts
                  </AppText>
                </View>
                <View style={styles.medallion}>
                  <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
                </View>
              </View>

              <Button
                label="Picky something up"
                size="md"
                variant="secondary"
                onPress={() => startBooking(null)}
                style={{ marginTop: theme.spacing.lg }}
              />
            </Card>
          </Entrance>

          <View style={{ marginTop: theme.spacing.lg }}>
            <AppText variant="eyebrow" tone="muted" style={{ marginBottom: theme.spacing.sm }}>
              Quick start
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
              {QUICK_CATEGORIES.map((category) => (
                <Chip key={category.id} small icon={category.icon} label={category.label} onPress={() => startBooking(null)} />
              ))}
            </ScrollView>
          </View>

          {saved && saved.length > 0 ? (
            <View style={{ marginTop: theme.spacing.xl }}>
              <AppText variant="eyebrow" tone="muted" style={{ marginBottom: theme.spacing.sm }}>
                Pick up from
              </AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
                {saved.slice(0, 6).map((addr) => (
                  <Chip key={addr.id} icon="home-outline" label={addr.label} small onPress={() => startBooking(addr)} />
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: theme.spacing.xxl }}>
          <SectionHeader
            title="Active deliveries"
            subtitle={
              loadingActive
                ? 'Loading your deliveries…'
                : active && active.length > 0
                  ? `${active.length} in progress, updating live`
                  : 'Nothing on the road right now'
            }
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
            active.slice(0, 3).map((delivery, index) => (
              <Entrance key={delivery.id} delay={index * 80}>
                <DeliveryCard
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
              </Entrance>
            ))
          ) : (
            <View style={{ minHeight: 260, justifyContent: 'center' }}>
              <EmptyView
                icon="bicycle-outline"
                title="No deliveries in progress"
                message="Create a pickup and watch your rider move in real time."
              />
            </View>
          )}
        </View>

        {unread && unread > 0 ? (
          <Entrance delay={240} style={{ paddingHorizontal: 20, marginTop: theme.spacing.xs }}>
            <Card
              variant="glass"
              onPress={() => navigation.getParent()?.getParent()?.navigate('NotificationsTab' as never)}
              accessibilityLabel={`${unread} unread notifications`}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <View style={[styles.iconMedallion, { backgroundColor: theme.colors.primarySoft }]}>
                <Ionicons name="notifications" size={18} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                <AppText variant="label" weight="700">
                  {unread} unread {unread === 1 ? 'notification' : 'notifications'}
                </AppText>
                <AppText variant="caption" tone="secondary" style={{ marginTop: 2 }}>
                  Tap to open your notification center
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </Card>
          </Entrance>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    position: 'absolute',
    borderRadius: 999,
  },
  medallion: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconMedallion: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
