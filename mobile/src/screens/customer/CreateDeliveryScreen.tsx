import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { CustomerHomeStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Button, Card, LocationInput, ProgressIndicator, Screen, ScreenFooter, ScreenHeader } from '../../components';
import { useBookingStore } from '../../stores/bookingStore';

type Props = NativeStackScreenProps<CustomerHomeStackParamList, 'CreateDelivery'>;

const toLocationValue = (p?: { lat?: number; lng?: number; addr?: string } | null) =>
  p ? { address: p.addr ?? '', lat: p.lat, lng: p.lng } : null;

export const CreateDeliveryScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const pickup = useBookingStore((s) => s.pickup);
  const dropoff = useBookingStore((s) => s.dropoff);
  const ready = !!pickup?.addr && !!dropoff?.addr;

  return (
    <Screen>
      <ScreenHeader title="New pickup" subtitle="Tell us where and where to" onBack={() => navigation.goBack()} />
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: theme.spacing.lg }} keyboardShouldPersistTaps="handled">
        <ProgressIndicator progress={1 / 3} label="Step 1 of 3 — Pickup & drop-off" />

        <Card style={{ marginTop: theme.spacing.lg }}>
          <AppText variant="eyebrow" tone="primary">
            Your route
          </AppText>
          <LocationInput
            title="Pickup"
            value={toLocationValue(pickup)}
            placeholder="Where should we pick up from?"
            dotColor={theme.colors.success}
            style={{ marginTop: theme.spacing.md }}
            onPress={() => navigation.navigate('LocationPicker', { field: 'pickup' })}
          />
          <LocationInput
            title="Destination"
            value={toLocationValue(dropoff)}
            placeholder="Where should it go?"
            dotColor={theme.colors.error}
            style={{ marginTop: theme.spacing.md }}
            onPress={() => navigation.navigate('LocationPicker', { field: 'dropoff' })}
          />
        </Card>

        <Card variant="soft" style={{ marginTop: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Ionicons name="sparkles-outline" size={16} color={theme.colors.primary} style={{ marginTop: 2 }} />
            <AppText variant="bodySmall" tone="secondary" style={{ flex: 1, marginLeft: theme.spacing.sm }}>
              We cover anything you can carry: documents, parcels, groceries, keys, gifts, returns and more.
            </AppText>
          </View>
        </Card>
      </ScrollView>

      <ScreenFooter>
        <Button label="Continue to package details" disabled={!ready} onPress={() => navigation.navigate('PackageDetails')} />
      </ScreenFooter>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
});
