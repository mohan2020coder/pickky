import { clearTokens, getAccessToken, saveTokens } from './tokenStorage';
import { fetchMe } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import { useBookingStore } from '../stores/bookingStore';
import { useRealtimeStore } from '../stores/realtimeStore';
import { queryClient } from '../queryClient';
import { TokenPair, User } from '../types';

/**
 * Drop everything cached for the previous session. Without this, signing in
 * as a different user on the same device keeps serving the old profile,
 * deliveries and realtime state from the React Query cache / zustand stores.
 */
const resetSessionState = () => {
  queryClient.clear();
  useRealtimeStore.getState().reset();
  useBookingStore.getState().reset();
};

export const startSession = async (user: User, tokens: TokenPair): Promise<void> => {
  await saveTokens(tokens);
  resetSessionState();
  useAuthStore.getState().setSession(user);
};

export const restoreSession = async (): Promise<boolean> => {
  const token = await getAccessToken();
  if (!token) {
    useAuthStore.getState().setStatus('unauthenticated');
    return false;
  }
  try {
    const user = await fetchMe();
    useAuthStore.getState().setSession(user);
    return true;
  } catch {
    await clearTokens();
    resetSessionState();
    useAuthStore.getState().clear();
    return false;
  }
};

export const endSession = async (): Promise<void> => {
  await clearTokens();
  resetSessionState();
  useAuthStore.getState().clear();
};
