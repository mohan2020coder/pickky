import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderHomeStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import {
  AppText,
  Card,
  Entrance,
  EntranceTop,
  Gradient,
  PressableScale,
  Pulse,
  Screen,
  ScreenHeader,
  StatusBadge,
  useCountUp,
} from '../../components';
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

const OnlineDot = ({ color = '#FFFFFF' }: { color?: string }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.7)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 2.6, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.7, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale, opacity]);
  return (
    <View style={{ width: 10, height: 10, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: 9, height: 9, borderRadius: 5, backgroundColor: color, transform: [{ scale }], opacity }} />
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />
    </View>
  );
};

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
  const animatedToday = useCountUp(earnings?.today_minor ?? 0);

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

  const RouteRow = ({ icon, label, value, color, connector }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string; color: string; connector?: boolean }) => (
    <View style={{ flexDirection: 'row' }}>
      <View style={{ alignItems: 'center', width: 26 }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={12} color={color} />
        </View>
        {connector ? <View style={{ width: 2, flex: 1, minHeight: 18, backgroundColor: 'rgba(255,255,255,0.22)', marginVertical: 4 }} /> : null}
      </View>
      <View style={{ flex: 1, paddingLeft: theme.spacing.sm, paddingBottom: connector ? theme.spacing.sm : 0 }}>
        <AppText variant="caption" color={theme.colors.textOnGradient} style={{ opacity: 0.7 }}>
          {label}
        </AppText>
        <AppText variant="bodySmall" weight="600" color={theme.colors.textOnGradient} numberOfLines={1}>
          {value}
        </AppText>
      </View>
    </View>
  );

  return (
    <Screen>
      <ScreenHeader
        large
        title={`Hi, ${firstName}`}
        subtitle={online ? 'You are online and receiving requests' : 'Go online to start receiving requests'}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <EntranceTop delay={40}>
          <PressableScale
            onPress={togglePresence}
            disabled={presence.isPending}
            accessibilityRole="switch"
            accessibilityState={{ checked: online, busy: presence.isPending }}
            accessibilityLabel={online ? "You're online — tap to go offline" : "You're offline — tap to go online"}
            scaleTo={0.98}
            pressedOpacity={0.94}
            style={[
              styles.toggle,
              online
                ? { ...theme.shadows.medium }
                : { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
            ]}
          >
            {online ? <Gradient preset="success" style={StyleSheet.absoluteFill} /> : null}
            <View
              style={[
                styles.toggleIcon,
                online ? { backgroundColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: theme.colors.primarySoft },
              ]}
            >
              <Ionicons name="power" size={20} color={online ? theme.colors.textOnGradient : theme.colors.primary} />
            </View>
            <View style={{ flex: 1, paddingHorizontal: theme.spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                {online ? <OnlineDot /> : null}
                <AppText
                  variant="heading3"
                  color={online ? theme.colors.textOnGradient : undefined}
                  numberOfLines={1}
                >
                  {online ? "You're Online" : "You're Offline"}
                </AppText>
              </View>
              <AppText
                variant="bodySmall"
                color={online ? theme.colors.textOnGradient : undefined}
                tone={online ? undefined : 'secondary'}
                style={{ marginTop: 2, opacity: online ? 0.85 : 1 }}
              >
                {online ? 'Receiving delivery requests nearby' : 'Tap to start earning'}
              </AppText>
            </View>
            {presence.isPending ? (
              <ActivityIndicator color={online ? theme.colors.textOnGradient : theme.colors.primary} />
            ) : (
              <View
                style={[
                  styles.switchTrack,
                  {
                    backgroundColor: online ? 'rgba(255,255,255,0.3)' : theme.colors.divider,
                    justifyContent: online ? 'flex-end' : 'flex-start',
                  },
                ]}
              >
                <View style={[styles.switchKnob, { backgroundColor: online ? '#FFFFFF' : theme.colors.textMuted }]} />
              </View>
            )}
          </PressableScale>
        </EntranceTop>

        {offer ? (
          <Entrance delay={80} style={{ marginTop: theme.spacing.lg }}>
            <Card variant="gradient" gradientPreset="hero" style={{ marginTop: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <OnlineDot color="#34D399" />
                  <AppText variant="eyebrow" color={theme.colors.textOnGradient} style={{ opacity: 0.9 }}>
                    New delivery nearby
                  </AppText>
                </View>
                <AppText variant="price" color={theme.colors.textOnGradient}>
                  {formatMoney(offer.earnings_minor, offer.currency)}
                </AppText>
              </View>

              <View style={{ marginTop: theme.spacing.lg }}>
                <RouteRow icon="location" label="Pickup" value={offer.pickup_addr} color="#34D399" connector />
                <RouteRow icon="flag" label="Drop-off" value={offer.dropoff_addr} color="#F87171" />
              </View>

              <PressableScale
                onPress={() => navigation.navigate('DeliveryRequest', { offerId: offer.id })}
                accessibilityRole="button"
                accessibilityLabel="View offer"
                scaleTo={0.97}
                pressedOpacity={0.9}
                style={styles.glassButton}
              >
                <AppText variant="button" color={theme.colors.textOnGradient}>
                  View offer
                </AppText>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textOnGradient} />
              </PressableScale>
            </Card>
          </Entrance>
        ) : null}

        {active ? (
          <Entrance delay={offer ? 120 : 80} style={{ marginTop: theme.spacing.lg }}>
            <Card style={{ marginTop: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText variant="label" tone="primary">
                  Active delivery
                </AppText>
                <StatusBadge status={active.status} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.md }}>
                <Ionicons name="navigate" size={16} color={theme.colors.primary} style={{ marginRight: theme.spacing.sm }} />
                <AppText variant="bodySmall" tone="secondary" numberOfLines={1} style={{ flex: 1 }}>
                  {active.pickup.addr ?? 'Pickup'} → {active.dropoff.addr ?? 'Destination'}
                </AppText>
              </View>
              <PressableScale
                onPress={() => navigation.navigate('ActiveDelivery', { deliveryId: active.id })}
                accessibilityRole="button"
                accessibilityLabel="Open active delivery"
                scaleTo={0.97}
                pressedOpacity={0.92}
                style={[styles.inlineButton, { backgroundColor: theme.colors.primary }]}
              >
                <Ionicons name="arrow-forward" size={18} color={theme.colors.onPrimary} />
                <AppText variant="button" color={theme.colors.onPrimary} style={{ marginLeft: theme.spacing.sm }}>
                  Open active delivery
                </AppText>
              </PressableScale>
            </Card>
          </Entrance>
        ) : null}

        {online && !offer && !active ? (
          <Entrance delay={120} style={{ marginTop: theme.spacing.lg }}>
            <Card style={{ marginTop: 0, alignItems: 'center', paddingVertical: theme.spacing.xxl }}>
              <Pulse size={92} rings={3}>
                <Ionicons name="radio" size={26} color={theme.colors.onPrimary} />
              </Pulse>
              <AppText variant="heading3" style={{ marginTop: theme.spacing.lg }}>
                Waiting for deliveries…
              </AppText>
              <AppText variant="bodySmall" tone="secondary" center style={{ marginTop: theme.spacing.xs }}>
                New requests will pop up here as soon as a customer books a pickup nearby.
              </AppText>
            </Card>
          </Entrance>
        ) : null}

        {!online && !active ? (
          <Entrance delay={120} style={{ marginTop: theme.spacing.lg }}>
            <Card style={{ marginTop: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.smallMedallion}>
                  <Ionicons name="rocket" size={16} color={theme.colors.primary} />
                </View>
                <AppText variant="label" style={{ marginLeft: theme.spacing.md }}>
                  Ready to earn?
                </AppText>
              </View>
              <AppText variant="bodySmall" tone="secondary" style={{ marginTop: theme.spacing.sm }}>
                Flip the switch above when you are ready to pick up deliveries around you.
              </AppText>
            </Card>
          </Entrance>
        ) : null}

        <Entrance delay={180} style={{ marginTop: theme.spacing.lg }}>
          <Card variant="gradient" gradientPreset="success" style={{ marginTop: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <AppText variant="eyebrow" color={theme.colors.textOnGradient} style={{ opacity: 0.9 }}>
                  Today's earnings
                </AppText>
                <AppText variant="displayXl" color={theme.colors.textOnGradient} style={{ marginTop: theme.spacing.xs }}>
                  {formatMoney(Math.round(animatedToday), earnings?.currency)}
                </AppText>
              </View>
              <View style={styles.earnMedallion}>
                <Ionicons name="wallet" size={22} color={theme.colors.textOnGradient} />
              </View>
            </View>

            <View style={styles.earnDivider} />

            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1 }}>
                <AppText variant="heading3" color={theme.colors.textOnGradient}>
                  {earnings?.deliveries_today ?? 0}
                </AppText>
                <AppText variant="caption" color={theme.colors.textOnGradient} style={{ opacity: 0.85 }}>
                  Deliveries today
                </AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="heading3" color={theme.colors.textOnGradient}>
                  {formatMoney(earnings?.week_minor ?? 0, earnings?.currency)}
                </AppText>
                <AppText variant="caption" color={theme.colors.textOnGradient} style={{ opacity: 0.85 }}>
                  This week
                </AppText>
              </View>
            </View>
          </Card>
        </Entrance>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    padding: 10,
    paddingRight: 14,
    overflow: 'hidden',
  },
  toggleIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  switchTrack: { width: 52, height: 30, borderRadius: 15, padding: 3 },
  switchKnob: { width: 24, height: 24, borderRadius: 12 },
  glassButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    height: 48,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
  },
  inlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    height: 48,
    borderRadius: 999,
  },
  smallMedallion: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(99,102,241,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  earnMedallion: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  earnDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.24)', marginVertical: 16 },
});