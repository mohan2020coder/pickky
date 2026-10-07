import { clearTokens, getAccessToken, saveTokens } from './tokenStorage';
import { fetchMe } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import { TokenPair, User } from '../types';

export const startSession = async (user: User, tokens: TokenPair): Promise<void> => {
  await saveTokens(tokens);
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
    useAuthStore.getState().clear();
    return false;
  }
};

export const endSession = async (): Promise<void> => {
  await clearTokens();
  useAuthStore.getState().clear();
};
