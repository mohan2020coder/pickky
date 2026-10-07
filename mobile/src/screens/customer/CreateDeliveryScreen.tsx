import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerHomeStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Screen, ScreenHeader, LocationInput, Button } from '../../components';
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
        <LocationInput
          title="Pickup"
          value={toLocationValue(pickup)}
          placeholder="Where should we pick up from?"
          dotColor={theme.colors.success}
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
        <AppText variant="bodySmall" tone="muted" style={{ marginTop: theme.spacing.xl }}>
          We cover anything you can carry: documents, parcels, groceries, keys, gifts, returns and more.
        </AppText>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Continue to package details" disabled={!ready} onPress={() => navigation.navigate('PackageDetails')} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
});