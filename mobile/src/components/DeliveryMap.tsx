import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { AnimatedRegion, Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme } from '../theme';
import { config } from '../config';
import { AppText } from './AppText';
import { GeoPoint, RiderLocation } from '../types';
import { LatLng, regionForPoints, straightRoute } from '../utils/geo';

type DeliveryMapProps = {
  pickup?: GeoPoint | null;
  dropoff?: GeoPoint | null;
  riderLocation?: RiderLocation | null;
  route?: LatLng[] | null;
  following?: boolean;
  showRoute?: boolean;
  style?: StyleProp<ViewStyle>;
  onMapReady?: () => void;
  children?: React.ReactNode;
  accessibilityLabel?: string;
};

const MARKER_ANIMATION_MS = 900;

export const DeliveryMap = ({
  pickup,
  dropoff,
  riderLocation,
  route,
  following = false,
  showRoute = true,
  style,
  onMapReady,
  children,
  accessibilityLabel = 'Delivery map',
}: DeliveryMapProps) => {
  const theme = useTheme();
  const mapRef = useRef<MapView>(null);
  const [ready, setReady] = useState(false);

  const initialRegion = useMemo(() => {
    const points: LatLng[] = [];
    if (pickup) points.push(pickup);
    if (dropoff) points.push(dropoff);
    if (riderLocation) points.push(riderLocation);
    if (points.length === 0) points.push({ lat: 12.9716, lng: 77.5946 });
    return regionForPoints(points) ?? { latitude: 12.9716, longitude: 77.5946, latitudeDelta: 0.05, longitudeDelta: 0.05 };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng]);

  const riderCoordinate = useRef(
    new AnimatedRegion(
      riderLocation
        ? { latitude: riderLocation.lat, longitude: riderLocation.lng }
        : { latitude: initialRegion.latitude, longitude: initialRegion.longitude },
    ),
  ).current;

  useEffect(() => {
    if (!riderLocation) return;
    const region = riderCoordinate as unknown as {
      timing: (config: Record<string, unknown>) => { start: () => void };
    };
    region.timing({
      latitude: riderLocation.lat,
      longitude: riderLocation.lng,
      duration: MARKER_ANIMATION_MS,
      useNativeDriver: false,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riderLocation?.lat, riderLocation?.lng, riderCoordinate]);

  useEffect(() => {
    if (!following || !riderLocation || !ready) return;
    mapRef.current?.animateToRegion(
      {
        latitude: riderLocation.lat,
        longitude: riderLocation.lng,
        latitudeDelta: Math.max(initialRegion.latitudeDelta, 0.012),
        longitudeDelta: Math.max(initialRegion.longitudeDelta, 0.012),
      },
      MARKER_ANIMATION_MS,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [following, riderLocation?.lat, riderLocation?.lng, ready, initialRegion.latitudeDelta, initialRegion.longitudeDelta]);

  const polylineCoords = useMemo(() => {
    if (route && route.length > 1) return route.map((p) => ({ latitude: p.lat, longitude: p.lng }));
    const legs: LatLng[] = [];
    if (riderLocation && pickup) legs.push(riderLocation, pickup);
    else if (pickup) legs.push(pickup);
    if (dropoff) legs.push(dropoff);
    if (legs.length < 2) return [];
    const points: LatLng[] = [];
    for (let i = 0; i < legs.length - 1; i += 1) {
      const segment = straightRoute(legs[i], legs[i + 1], 12);
      points.push(...(i > 0 ? segment.slice(1) : segment));
    }
    return points.map((p) => ({ latitude: p.lat, longitude: p.lng }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, pickup, dropoff, riderLocation?.lat, riderLocation?.lng]);

  // Android's only map provider is Google's native SDK, which kills the whole
  // process ("API key not found") when no Maps API key is configured. Render a
  // static route placeholder instead so the tracking screen still works.
  const hasGoogleMapsKey = Boolean(config.googleMapsKey);
  const nativeMapAvailable = Platform.OS !== 'android' || hasGoogleMapsKey;

  if (!nativeMapAvailable) {
    return (
      <View style={[styles.container, style]} accessibilityLabel={accessibilityLabel}>
        <View style={[styles.placeholder, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Ionicons name="map-outline" size={28} color={theme.colors.textMuted} />
          <AppText variant="label" tone="secondary" style={{ marginTop: theme.spacing.sm }}>
            Live map unavailable
          </AppText>
          <AppText variant="caption" tone="muted" center style={{ marginTop: 4 }}>
            {pickup?.addr ?? 'Pickup'}
            {'  →  '}
            {dropoff?.addr ?? 'Destination'}
          </AppText>
        </View>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]} accessibilityLabel={accessibilityLabel}>
      <MapView
        ref={mapRef}
        provider={hasGoogleMapsKey ? PROVIDER_GOOGLE : undefined}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsCompass={false}
        showsScale={false}
        loadingEnabled={!ready}
        loadingIndicatorColor={theme.colors.primary}
        loadingBackgroundColor={theme.colors.background}
        onMapReady={() => {
          setReady(true);
          onMapReady?.();
        }}
        accessibilityLabel={accessibilityLabel}
      >
        {pickup ? (
          <Marker
            coordinate={{ latitude: pickup.lat, longitude: pickup.lng }}
            title="Pickup"
            description={pickup.addr}
            anchor={{ x: 0.5, y: 0.5 }}
            accessibilityLabel={`Pickup: ${pickup.addr ?? 'location'}`}
          >
            <View style={[styles.dot, { backgroundColor: theme.colors.primary, borderColor: theme.colors.surface }]} />
          </Marker>
        ) : null}

        {dropoff ? (
          <Marker
            coordinate={{ latitude: dropoff.lat, longitude: dropoff.lng }}
            title="Destination"
            description={dropoff.addr}
            anchor={{ x: 0.5, y: 1 }}
            accessibilityLabel={`Destination: ${dropoff.addr ?? 'location'}`}
          >
            <View style={[styles.pin, { backgroundColor: theme.colors.error, borderColor: theme.colors.surface }]}>
              <View style={styles.pinInner} />
            </View>
          </Marker>
        ) : null}

        {riderLocation ? (
          <Marker.Animated
            coordinate={riderCoordinate as unknown as { latitude: number; longitude: number }}
            anchor={{ x: 0.5, y: 0.5 }}
            accessibilityLabel="Rider location"
            flat
          >
            <View style={[styles.rider, { backgroundColor: theme.colors.primary, borderColor: '#FFFFFF' }]}>
              <AppText style={{ fontSize: 12 }}>🛵</AppText>
            </View>
          </Marker.Animated>
        ) : null}

        {showRoute && polylineCoords.length > 1 ? (
          <Polyline
            coordinates={polylineCoords}
            strokeColor={theme.colors.mapRoute}
            strokeWidth={4}
            lineDashPattern={[1, 0]}
          />
        ) : null}
      </MapView>

      {!ready ? (
        <View style={[StyleSheet.absoluteFill, styles.loading, { backgroundColor: theme.colors.background }]}>
          <AppText variant="label" tone="secondary">
            Loading map…
          </AppText>
        </View>
      ) : null}

      {children}
    </View>
  );
};

export const MapOverlay = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[styles.overlay, style]} pointerEvents="box-none">
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  placeholder: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 16, margin: 16 },
  loading: { alignItems: 'center', justifyContent: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, padding: 16, justifyContent: 'flex-end' },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
  },
  pin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  rider: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
