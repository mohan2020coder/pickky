import { ApiError, apiGet, apiPost, apiPut } from './client';
import { AuthSession, Role, User } from '../types';

export type LoginPayload = { identifier: string; password: string };
export type RegisterPayload = { name: string; phone: string; email?: string; password: string; role?: Role };

export const login = (payload: LoginPayload) =>
  apiPost<AuthSession>('/auth/login', payload, { auth: false });

export const register = (payload: RegisterPayload) =>
  apiPost<AuthSession>('/auth/register', payload, { auth: false });

export const requestOtp = (phone: string) => apiPost<{ sent: boolean }>('/auth/otp/request', { phone }, { auth: false });

export const verifyOtp = (phone: string, code: string) =>
  apiPost<AuthSession | { verified: boolean }>('/auth/otp/verify', { phone, code }, { auth: false });

export const forgotPassword = (phone: string) => apiPost<{ sent: boolean }>('/auth/password/forgot', { phone }, { auth: false });

export const resetPassword = (phone: string, code: string, password: string) =>
  apiPost<{ ok: boolean }>('/auth/password/reset', { phone, code, password }, { auth: false });

export const fetchMe = () => apiGet<User>('/auth/me');

export const logout = () => apiPost<{ ok: boolean }>('/auth/logout', {});

export const changePassword = (current_password: string, new_password: string) =>
  apiPut<{ ok: boolean }>('/auth/password', { current_password, new_password });

export const isInvalidCredentials = (e: unknown) => e instanceof ApiError && (e.status === 401 || e.status === 422);
