import React, { useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerHomeStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Button, Card, Screen, ScreenHeader, PriceCard, LocationInput } from '../../components';
import { useBookingStore } from '../../stores/bookingStore';
import { getQuote } from '../../api/deliveries';
import { useCreateDelivery } from '../../hooks/queries';
import { toast } from '../../stores/uiStore';
import { Quote } from '../../types';

type Props = NativeStackScreenProps<CustomerHomeStackParamList, 'PriceConfirm'>;

export const PriceConfirmScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const pickup = useBookingStore((s) => s.pickup);
  const dropoff = useBookingStore((s) => s.dropoff);
  const pkg = useBookingStore((s) => s.pkg);
  const reset = useBookingStore((s) => s.reset);
  const create = useCreateDelivery();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(true);

  useMemo(() => {
    let active = true;
    if (pickup && dropoff) {
      setLoadingQuote(true);
      getQuote({
        pickup: { lat: pickup.lat, lng: pickup.lng },
        dropoff: { lat: dropoff.lat, lng: dropoff.lng },
        items: [{ description: pkg.description, quantity: pkg.quantity, weight_kg: pkg.weight_kg }],
        package_type: pkg.package_type,
      })
        .then((q) => {
          if (active) setQuote(q);
        })
        .catch(() => {
          if (active) toast('We could not estimate the price right now.', { tone: 'error' });
        })
        .finally(() => {
          if (active) setLoadingQuote(false);
        });
    }
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirm = () => {
    if (!pickup || !dropoff || !quote) return;
    create.mutate(
      {
        pickup,
        dropoff,
        items: [{ description: pkg.description, quantity: pkg.quantity, weight_kg: pkg.weight_kg }],
        instructions: pkg.instructions,
        package_type: pkg.package_type,
        package_size: pkg.package_size,
      },
      {
        onSuccess: (delivery) => {
          reset();
          navigation.replace('SearchingRider', { deliveryId: delivery.id });
        },
        onError: () => {
          toast('We could not create the delivery. Please try again.', { tone: 'error' });
        },
      },
    );
  };

  return (
    <Screen>
      <ScreenHeader title="Confirm pickup" subtitle="Check the details and price" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
        <LocationInput title="Pickup" value={pickup ? { address: pickup.addr ?? '', lat: pickup.lat, lng: pickup.lng } : null} placeholder="Not selected" dotColor={theme.colors.success} onPress={() => navigation.navigate('LocationPicker', { field: 'pickup' })} />
        <LocationInput title="Destination" value={dropoff ? { address: dropoff.addr ?? '', lat: dropoff.lat, lng: dropoff.lng } : null} placeholder="Not selected" dotColor={theme.colors.error} style={{ marginTop: theme.spacing.md }} onPress={() => navigation.navigate('LocationPicker', { field: 'dropoff' })} />
        <Card elevated={false} style={{ marginTop: theme.spacing.lg }}>
          <AppText variant="label" tone="secondary">
            {pkg.description || 'Item'}
          </AppText>
          <View style={{ flexDirection: 'row', marginTop: theme.spacing.xs, gap: 12 }}>
            <AppText variant="caption" tone="muted">Qty {pkg.quantity}</AppText>
            {pkg.weight_kg ? <AppText variant="caption" tone="muted">{pkg.weight_kg} kg</AppText> : null}
            {pkg.fragile ? <AppText variant="caption" tone="muted">Fragile</AppText> : null}
          </View>
        </Card>

        {loadingQuote && !quote ? (
          <View style={{ alignItems: 'center', marginTop: theme.spacing.xl }}>
            <ActivityIndicator color={theme.colors.primary} />
            <AppText variant="bodySmall" tone="secondary" style={{ marginTop: theme.spacing.sm }}>
              Estimating price…
            </AppText>
          </View>
        ) : quote ? (
          <PriceCard
            style={{ marginTop: theme.spacing.lg }}
            totalMinor={quote.price_minor}
            currency={quote.currency}
            distanceKm={quote.distance_km}
            etaMinutes={quote.eta_minutes}
            rows={quote.breakdown?.map((line) => ({ label: line.label, amountMinor: line.amount_minor }))}
            emphasis="estimate"
          />
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button label={`Confirm ${quote ? `· ₹${(quote.price_minor / 100).toFixed(0)}` : ''}`} loading={create.isPending || loadingQuote} disabled={!quote} onPress={confirm} />
        <AppText variant="caption" tone="muted" center style={{ marginTop: theme.spacing.sm }}>
          You only pay when it&apos;s picked up. Cashless, card or UPI.
        </AppText>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
});