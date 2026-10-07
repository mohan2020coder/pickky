import * as SecureStore from 'expo-secure-store';
import { TokenPair } from '../types';

const ACCESS_KEY = 'pickky.access_token';
const REFRESH_KEY = 'pickky.refresh_token';

const safe = async <T>(fn: () => Promise<T>): Promise<T | null> => {
  try {
    return await fn();
  } catch {
    return null;
  }
};

export const saveTokens = async (tokens: TokenPair): Promise<void> => {
  await safe(() => SecureStore.setItemAsync(ACCESS_KEY, tokens.access_token));
  await safe(() => SecureStore.setItemAsync(REFRESH_KEY, tokens.refresh_token));
};

export const getAccessToken = (): Promise<string | null> => safe(() => SecureStore.getItemAsync(ACCESS_KEY));

export const getRefreshToken = (): Promise<string | null> => safe(() => SecureStore.getItemAsync(REFRESH_KEY));

export const clearTokens = async (): Promise<void> => {
  await safe(() => SecureStore.deleteItemAsync(ACCESS_KEY));
  await safe(() => SecureStore.deleteItemAsync(REFRESH_KEY));
};
