import { create } from 'zustand';
import { Role, User } from '../types';

type AuthStatus = 'restoring' | 'unauthenticated' | 'authenticated';

type AuthState = {
  status: AuthStatus;
  user: User | null;
  primaryRole: Role | null;
  setSession: (user: User) => void;
  setUser: (user: User) => void;
  setStatus: (status: AuthStatus) => void;
  clear: () => void;
};

const resolvePrimaryRole = (user: User | null): Role | null => {
  if (!user || user.roles.length === 0) return null;
  const priority: Role[] = ['ADMIN', 'SUPPORT', 'RIDER', 'CUSTOMER'];
  return priority.find((role) => user.roles.includes(role)) ?? user.roles[0] ?? null;
};

export const useAuthStore = create<AuthState>((set) => ({
  status: 'restoring',
  user: null,
  primaryRole: null,
  setSession: (user) => set({ status: 'authenticated', user, primaryRole: resolvePrimaryRole(user) }),
  setUser: (user) => set({ user, primaryRole: resolvePrimaryRole(user) }),
  setStatus: (status) => set({ status }),
  clear: () => set({ status: 'unauthenticated', user: null, primaryRole: null }),
}));
