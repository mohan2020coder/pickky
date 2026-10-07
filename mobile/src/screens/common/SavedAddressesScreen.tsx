import React, { useState } from 'react';
import { FlatList, View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { AppText, Button, Card, ConfirmDialog, Screen, ScreenHeader } from '../../components';
import { useSavedAddresses, useCreateSavedAddress, useDeleteSavedAddress } from '../../hooks/queries';
import { useBookingStore } from '../../stores/bookingStore';
import { toast } from '../../stores/uiStore';
import type { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'SavedAddresses'>;

export const SavedAddressesScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { data: addresses = [] } = useSavedAddresses();
  const create = useCreateSavedAddress();
  const remove = useDeleteSavedAddress();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const setPickup = useBookingStore((s) => s.setPickup);

  const handleUseMyCurrentLocation = () => {
    void (async () => {
      try {
        const Location = await import('expo-location');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          toast('Location permission required to add current location.', { tone: 'error' });
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        const results = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        const place = results[0];
        const label = place?.name ? String(place.name) : 'Home';
        create.mutate({
          label,
          address: place ? `${place.street ?? ''}, ${place.city ?? place.region ?? ''}`.trim().replace(/^,\s*/, '') || 'Current location' : 'Current location',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        toast('Saved to your addresses.', { tone: 'success' });
      } catch {
        toast('Could not fetch your location.', { tone: 'error' });
      }
    })();
  };

  const useForPickup = (address: (typeof addresses)[number]) => {
    setPickup({ lat: address.lat, lng: address.lng, addr: address.address });
    toast(`Pickup set to ${address.label}.`, { tone: 'success' });
    navigation.goBack();
  };

  const confirmedDelete = () => {
    if (!pendingDelete) return;
    remove.mutate(pendingDelete, {
      onSuccess: () => toast('Address removed.', { tone: 'info' }),
      onError: () => toast('Could not remove that address.', { tone: 'error' }),
    });
    setPendingDelete(null);
  };

  return (
    <Screen>
      <ScreenHeader
        title="Saved addresses"
        subtitle="Quick pickup points"
        onBack={() => navigation.goBack()}
        right={<Button label="Add current" variant="ghost" size="sm" icon="add" onPress={() => handleUseMyCurrentLocation()} loading={create.isPending} />}
      />
      <FlatList
        data={addresses}
        contentContainerStyle={styles.list}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: theme.spacing.xl * 2 }}>
            <Ionicons name="location-outline" size={40} color={theme.colors.textMuted} />
            <AppText variant="heading3" center style={{ marginTop: theme.spacing.md }}>No saved addresses</AppText>
            <AppText variant="body" tone="secondary" center style={{ marginTop: theme.spacing.sm }}>
              Save the places you pick up from most, then reuse them with one tap.
            </AppText>
          </View>
        }
        renderItem={({ item }) => (
          <Card key={item.id} style={{ marginBottom: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="location" size={18} color={theme.colors.primary} style={{ marginRight: theme.spacing.sm }} />
              <View style={{ flex: 1 }}>
                <AppText variant="body" weight="700">{item.label}</AppText>
                <AppText variant="caption" tone="secondary">{item.address}</AppText>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: theme.spacing.sm }}>
                  <Button label="Use as pickup" variant="secondary" size="sm" onPress={() => useForPickup(item)} />
                </View>
              </View>
              <Pressable
                onPress={() => setPendingDelete(item.id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${item.label}`}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 6 })}
              >
                <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
              </Pressable>
            </View>
          </Card>
        )}
      />
      <ConfirmDialog
        visible={!!pendingDelete}
        title="Delete address?"
        message="This removes the address from your saved list."
        confirmLabel="Delete"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => confirmedDelete()}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 24 },
});