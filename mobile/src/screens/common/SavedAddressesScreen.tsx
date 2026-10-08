import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { AppText, Button, Card, ConfirmDialog, EmptyView, Entrance, IconButton, Screen, ScreenFooter, ScreenHeader } from '../../components';
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
      <ScreenHeader title="Saved addresses" subtitle="Quick pickup points" onBack={() => navigation.goBack()} />
      <FlatList
        data={addresses}
        contentContainerStyle={[styles.list, addresses.length === 0 ? styles.listEmpty : null]}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyView
            icon="location-outline"
            title="No saved addresses"
            message="Save the places you pick up from most, then reuse them with one tap."
            actionLabel="Add current location"
            onAction={() => handleUseMyCurrentLocation()}
          />
        }
        renderItem={({ item, index }) => (
          <Entrance delay={Math.min(index, 8) * 60}>
            <Card style={{ marginBottom: theme.spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 13,
                    backgroundColor: theme.colors.primarySoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: theme.spacing.md,
                  }}
                >
                  <Ionicons name="location" size={18} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="label" weight="800">
                    {item.label}
                  </AppText>
                  <AppText variant="bodySmall" tone="secondary" style={{ marginTop: 2 }}>
                    {item.address}
                  </AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: theme.spacing.md }}>
                    <Button label="Use as pickup" variant="secondary" size="sm" icon="navigate-outline" onPress={() => useForPickup(item)} />
                    <IconButton
                      icon="trash-outline"
                      color={theme.colors.error}
                      background={theme.colors.errorSoft}
                      size={38}
                      accessibilityLabel={`Delete ${item.label}`}
                      onPress={() => setPendingDelete(item.id)}
                    />
                  </View>
                </View>
              </View>
            </Card>
          </Entrance>
        )}
      />
      <ScreenFooter>
        <Button
          label="Add current location"
          icon="add"
          loading={create.isPending}
          onPress={() => handleUseMyCurrentLocation()}
          accessibilityLabel="Add current location to saved addresses"
        />
      </ScreenFooter>
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
  list: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
});
