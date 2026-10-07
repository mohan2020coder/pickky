export type ApiMode = 'live' | 'mock';

const readEnv = (key: string, fallback: string): string => {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
};

const rawMode = readEnv('EXPO_PUBLIC_API_MODE', 'mock');

export const config = {
  apiBaseUrl: readEnv('EXPO_PUBLIC_API_BASE_URL', 'http://localhost:8080').replace(/\/+$/, ''),
  wsUrl: readEnv('EXPO_PUBLIC_WS_URL', 'ws://localhost:8080/ws'),
  apiMode: (rawMode === 'live' ? 'live' : 'mock') as ApiMode,
  isMock: rawMode !== 'live',
  appName: 'Pickky',
  // Google Maps key for native map tiles (also set android.config.googleMaps.apiKey
  // in app.json and re-run prebuild). Without it the Android Google Maps SDK throws
  // "API key not found" and kills the process, so DeliveryMap skips the native map.
  googleMapsKey: readEnv('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY', ''),
  requestTimeoutMs: 15000,
  wsHeartbeatMs: 25000,
  wsMaxBackoffMs: 30000,
};

export const API_PREFIX = '/api/v1';
