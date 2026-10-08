import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerHomeStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Button, Card, PriceCard, LocationInput, ProgressIndicator, Screen, ScreenFooter, ScreenHeader } from '../../components';
import { useBookingStore } from '../../stores/bookingStore';
import { getQuote } from '../../api/deliveries';
import { useCreateDelivery } from '../../hooks/queries';
import { toast } from '../../stores/uiStore';
import { GeoPoint, Quote } from '../../types';

type Props = NativeStackScreenProps<CustomerHomeStackParamList, 'PriceConfirm'>;

// The live API rejects quotes without a non-empty address (422), so never let a
// point reach the backend without one.
const withAddr = (p: GeoPoint, fallback: string): GeoPoint => ({ ...p, addr: p.addr?.trim() || fallback });

export const PriceConfirmScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const pickup = useBookingStore((s) => s.pickup);
  const dropoff = useBookingStore((s) => s.dropoff);
  const pkg = useBookingStore((s) => s.pkg);
  const reset = useBookingStore((s) => s.reset);
  const create = useCreateDelivery();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quoteFailed, setQuoteFailed] = useState(false);

  const loadQuote = useCallback(() => {
    if (!pickup || !dropoff) {
      setQuote(null);
      setLoadingQuote(false);
      return;
    }
    setLoadingQuote(true);
    setQuoteFailed(false);
    getQuote({
      pickup: withAddr(pickup, 'Pickup location'),
      dropoff: withAddr(dropoff, 'Destination'),
      items: [{ description: pkg.description, quantity: pkg.quantity, weight_kg: pkg.weight_kg }],
      package_type: pkg.package_type,
    })
      .then((q) => setQuote(q))
      .catch(() => {
        setQuote(null);
        setQuoteFailed(true);
        toast('We could not estimate the price right now.', { tone: 'error' });
      })
      .finally(() => setLoadingQuote(false));
  }, [pickup, dropoff, pkg]);

  useEffect(() => {
    loadQuote();
  }, [loadQuote]);

  const confirm = () => {
    if (!pickup || !dropoff || !quote) return;
    create.mutate(
      {
        pickup: withAddr(pickup, 'Pickup location'),
        dropoff: withAddr(dropoff, 'Destination'),
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
        <ProgressIndicator progress={1} label="Step 3 of 3 — Confirm price" />

        <Card style={{ marginTop: theme.spacing.lg }}>
          <AppText variant="eyebrow" tone="primary">
            Your route
          </AppText>
          <LocationInput
            title="Pickup"
            value={pickup ? { address: pickup.addr ?? '', lat: pickup.lat, lng: pickup.lng } : null}
            placeholder="Not selected"
            dotColor={theme.colors.success}
            style={{ marginTop: theme.spacing.md }}
            onPress={() => navigation.navigate('LocationPicker', { field: 'pickup' })}
          />
          <LocationInput
            title="Destination"
            value={dropoff ? { address: dropoff.addr ?? '', lat: dropoff.lat, lng: dropoff.lng } : null}
            placeholder="Not selected"
            dotColor={theme.colors.error}
            style={{ marginTop: theme.spacing.md }}
            onPress={() => navigation.navigate('LocationPicker', { field: 'dropoff' })}
          />
        </Card>

        <Card variant="outline" style={{ marginTop: theme.spacing.md }}>
          <AppText variant="eyebrow" tone="muted">
            Package
          </AppText>
          <AppText variant="body" weight="600" style={{ marginTop: theme.spacing.xs }}>
            {pkg.description || 'Item'}
          </AppText>
          <View style={{ flexDirection: 'row', marginTop: theme.spacing.xs, gap: 12 }}>
            <AppText variant="caption" tone="muted">Qty {pkg.quantity}</AppText>
            {pkg.weight_kg ? <AppText variant="caption" tone="muted">{pkg.weight_kg} kg</AppText> : null}
            {pkg.fragile ? <AppText variant="caption" tone="muted">Fragile</AppText> : null}
          </View>
        </Card>

        {loadingQuote && !quote ? (
          <Card variant="soft" style={{ marginTop: theme.spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
            <ActivityIndicator color={theme.colors.primary} />
            <AppText variant="bodySmall" tone="secondary" style={{ marginLeft: theme.spacing.sm, flex: 1 }}>
              Estimating price…
            </AppText>
          </Card>
        ) : quote ? (
          <View
            style={{
              marginTop: theme.spacing.lg,
              backgroundColor: theme.colors.surfaceSunken,
              borderRadius: theme.radius.large,
              borderWidth: 1,
              borderColor: theme.colors.divider,
              padding: theme.spacing.md,
            }}
          >
            <PriceCard
              totalMinor={quote.price_minor}
              currency={quote.currency}
              distanceKm={quote.distance_km}
              etaMinutes={quote.eta_minutes}
              rows={quote.breakdown?.map((line) => ({ label: line.label, amountMinor: line.amount_minor }))}
              emphasis="estimate"
            />
          </View>
        ) : quoteFailed ? (
          <Card variant="soft" style={{ marginTop: theme.spacing.lg }}>
            <AppText variant="bodySmall" tone="secondary" center>
              We could not estimate the price right now.
            </AppText>
            <Button
              label="Try again"
              variant="secondary"
              size="sm"
              style={{ marginTop: theme.spacing.md, alignSelf: 'center' }}
              onPress={loadQuote}
            />
          </Card>
        ) : null}
      </ScrollView>

      <ScreenFooter>
        <Button label={`Confirm ${quote ? `· ₹${(quote.price_minor / 100).toFixed(0)}` : ''}`} loading={create.isPending || loadingQuote} disabled={!quote} onPress={confirm} />
        <AppText variant="caption" tone="muted" center style={{ marginTop: theme.spacing.sm }}>
          You only pay when it&apos;s picked up. Cashless, card or UPI.
        </AppText>
      </ScreenFooter>
    </Screen>
  );
};
