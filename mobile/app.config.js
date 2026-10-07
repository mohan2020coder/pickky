// Single source of truth for the Google Maps key.
// EXPO_PUBLIC_GOOGLE_MAPS_API_KEY drives both:
//   - the JS-side gate in DeliveryMap (skips the native map when unset, because
//     Android's Google Maps SDK hard-crashes without a key), and
//   - android.config.googleMaps.apiKey via Expo prebuild (npx expo prebuild -p android).
module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: { apiKey: googleMapsApiKey },
      },
    },
    ios: {
      ...config.ios,
      googleMapsApiKey,
    },
  };
};
