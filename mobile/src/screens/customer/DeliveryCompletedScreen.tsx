import React from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomerFlowStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Button, Card, Entrance, Gradient, Screen, useCountUp } from '../../components';
import { useDelivery } from '../../hooks/queries';
import { formatMoney } from '../../utils/format';

type Props = NativeStackScreenProps<CustomerFlowStackParamList, 'DeliveryCompleted'>;

export const DeliveryCompletedScreen = ({ navigation, route }: Props) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { deliveryId } = route.params ?? {};
  const { data: delivery } = useDelivery(deliveryId);
  const scale = React.useRef(new Animated.Value(0)).current;
  const paidMinor = Math.round(useCountUp(delivery?.price_minor ?? 0));

  React.useEffect(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 10 }).start();
  }, [scale]);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + theme.spacing.xxl }}>
        <Gradient
          preset="success"
          style={[
            styles.hero,
            { paddingTop: insets.top + theme.spacing.huge, borderBottomLeftRadius: theme.radius.xl, borderBottomRightRadius: theme.radius.xl },
          ]}
        >
          <Pressable
            onPress={() => navigation.popToTop()}
            accessibilityRole="button"
            accessibilityLabel="Back to home"
            hitSlop={10}
            style={({ pressed }) => [styles.closeBtn, { top: insets.top + 6, backgroundColor: 'rgba(255,255,255,0.18)', opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
          <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
            <View style={styles.medallion}>
              <Ionicons name="checkmark" size={44} color="#FFFFFF" />
            </View>
          </Animated.View>
          <AppText variant="heading1" weight="800" center color="#FFFFFF" style={{ marginTop: theme.spacing.xl }}>
            Delivered!
          </AppText>
          <AppText variant="body" center color="rgba(255,255,255,0.88)" style={{ marginTop: theme.spacing.sm, maxWidth: 320 }}>
            {delivery?.reference ?? 'Your delivery'} delivered safely to its destination.
          </AppText>
        </Gradient>

        <Entrance delay={160} style={{ paddingHorizontal: 20, marginTop: theme.spacing.xl }}>
          <Card>
            <AppText variant="eyebrow" tone="muted">
              Trip summary
            </AppText>

            <View style={{ flexDirection: 'row', marginTop: theme.spacing.md }}>
              <View style={{ alignItems: 'center', width: 12 }}>
                <View style={[styles.routeDot, { backgroundColor: theme.colors.success }]} />
                <View style={[styles.routeLine, { backgroundColor: theme.colors.border }]} />
                <View style={[styles.routeDot, { backgroundColor: theme.colors.error }]} />
              </View>
              <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                <AppText variant="bodySmall" weight="600" numberOfLines={1}>
                  {delivery?.pickup.addr ?? 'Pickup'}
                </AppText>
                <View style={{ height: 12 }} />
                <AppText variant="bodySmall" tone="secondary" numberOfLines={1}>
                  {delivery?.dropoff.addr ?? 'Destination'}
                </AppText>
              </View>
            </View>

            <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.sm }}>
              <SummaryRow label="Reference" value={delivery?.reference ?? '—'} />
              <SummaryRow label="Rider" value={delivery?.rider?.name ?? '—'} />
              <SummaryRow label="Delivery time" value={delivery?.eta_minutes ? `${delivery.eta_minutes} min` : '—'} />
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: theme.spacing.lg,
                paddingTop: theme.spacing.lg,
                borderTopWidth: 1,
                borderTopColor: theme.colors.divider,
              }}
            >
              <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
                <AppText variant="eyebrow" tone="muted">
                  Total paid
                </AppText>
                <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                  Cashless · card · UPI
                </AppText>
              </View>
              <Gradient preset="cta" style={[styles.pricePill, theme.shadows.medium]}>
                <AppText variant="label" weight="800" color="#FFFFFF">
                  {delivery ? formatMoney(paidMinor, delivery.currency) : '—'}
                </AppText>
              </Gradient>
            </View>
          </Card>
        </Entrance>

        <View style={{ paddingHorizontal: 20, marginTop: theme.spacing.xl }}>
          <Button
            label="Rate this pickup"
            iconRight="star"
            onPress={() => delivery && navigation.replace('Rating', { deliveryId: delivery.id })}
          />
          <Button label="Back to home" variant="secondary" onPress={() => navigation.popToTop()} style={{ marginTop: theme.spacing.md }} />
        </View>
      </ScrollView>
    </Screen>
  );
};

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
    <AppText variant="body" tone="secondary">
      {label}
    </AppText>
    <AppText variant="body" weight="600">
      {value}
    </AppText>
  </View>
);

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  closeBtn: {
    position: 'absolute',
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medallion: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  routeLine: { width: 2, flex: 1, minHeight: 20, marginVertical: 3 },
  pricePill: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
