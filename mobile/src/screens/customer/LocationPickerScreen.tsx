import React, { useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { CustomerHomeStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, AppInput, Card, Chip, ProgressIndicator, Screen, ScreenHeader, InlineLoader, EmptyView } from '../../components';
import { useBookingStore } from '../../stores/bookingStore';
import { useSavedAddresses } from '../../hooks/queries';
import { searchLocations } from '../../api/deliveries';
import { toast } from '../../stores/uiStore';
import { GeoPoint, SearchResult } from '../../types';

type Props = NativeStackScreenProps<CustomerHomeStackParamList, 'LocationPicker'>;

const useMyLocation = () => {
  const [picking, setPicking] = useState(false);
  const pick = async (): Promise<GeoPoint | null> => {
    setPicking(true);
    try {
      const Location = await import('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast('We need location access to find you.', { tone: 'error' });
        return null;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      const label = place
        ? [place.name, place.street, place.city].filter(Boolean).join(', ')
        : 'Current location';
      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        addr: label || 'Current location',
      };
    } catch {
      toast('We could not get your location.', { tone: 'error' });
      return null;
    } finally {
      setPicking(false);
    }
  };
  return { picking, pick };
};

export const LocationPickerScreen = ({ navigation, route }: Props) => {
  const theme = useTheme();
  const field = route.params?.field ?? 'pickup';
  const setPickup = useBookingStore((s) => s.setPickup);
  const setDropoff = useBookingStore((s) => s.setDropoff);
  const { data: saved } = useSavedAddresses();
  const { picking, pick } = useMyLocation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    let active = true;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const items = await searchLocations(query.trim());
        if (active) setResults(items);
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const commit = (point: GeoPoint) => {
    if (field === 'pickup') setPickup(point);
    else setDropoff(point);
    navigation.goBack();
  };

  return (
    <Screen>
      <ScreenHeader
        title={field === 'pickup' ? 'Choose pickup' : 'Choose destination'}
        subtitle={field === 'pickup' ? 'Where should we pick it up?' : 'Where should we take it?'}
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ marginBottom: theme.spacing.lg }}>
            <ProgressIndicator progress={1 / 3} label="Step 1 of 3 — Choose a location" />
          </View>
          <AppInput
            placeholder="Search for an address or area"
            leftIcon="search-outline"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="search"
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md, gap: 8 }}>
            <Chip small icon="locate-outline" label={picking ? 'Finding you…' : 'Use my current location'} onPress={async () => {
              const point = await pick();
              if (point) commit(point);
            }} />
          </View>
        </View>

        {searching ? (
          <InlineLoader label="Searching…" />
        ) : results.length > 0 ? (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Card
                onPress={() => commit({ lat: item.lat, lng: item.lng, addr: item.title })}
                style={{ marginBottom: theme.spacing.sm }}
                elevated={false}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="location-outline" size={18} color={theme.colors.primary} />
                  <View style={{ flex: 1, marginLeft: theme.spacing.sm }}>
                    <AppText variant="body">{item.title}</AppText>
                    {item.subtitle ? (
                      <AppText variant="caption" tone="muted" numberOfLines={1}>
                        {item.subtitle}
                      </AppText>
                    ) : null}
                  </View>
                </View>
              </Card>
            )}
          />
        ) : (
          <FlatList
            data={saved}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            ListHeaderComponent={
              query.trim().length >= 3 ? (
                <EmptyView icon="search-outline" title="No results" message="Try a different address, area or landmark." />
              ) : (
                <AppText variant="eyebrow" tone="muted" style={{ marginBottom: theme.spacing.sm }}>
                  Saved addresses
                </AppText>
              )
            }
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Card
                onPress={() => commit({ lat: item.lat, lng: item.lng, addr: item.address })}
                style={{ marginBottom: theme.spacing.sm }}
                elevated={false}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="home-outline" size={18} color={theme.colors.primary} />
                  <View style={{ flex: 1, marginLeft: theme.spacing.sm }}>
                    <AppText variant="body">{item.label}</AppText>
                    <AppText variant="caption" tone="muted" numberOfLines={2}>
                      {item.address}
                    </AppText>
                  </View>
                </View>
              </Card>
            )}
            ListEmptyComponent={
              <EmptyView
                icon="location-outline"
                title="No saved addresses"
                message="Search above to find a place, or use your current location."
              />
            }
          />
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
};