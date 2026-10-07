import { apiGet, apiPatch, apiPost } from './client';
import { AdminOverview, AdminUserRow, Delivery, Paginated, RiderSummary } from '../types';

export const getAdminOverview = () => apiGet<AdminOverview>('/admin/overview');

export const listAdminUsers = (params: { q?: string; page?: number } = {}) =>
  apiGet<Paginated<AdminUserRow>>('/admin/users', { params });

export const listAdminRiders = (params: { q?: string; status?: string; page?: number } = {}) =>
  apiGet<Paginated<RiderSummary & { status: string; is_verified: boolean; is_suspended: boolean }>>('/admin/riders', {
    params,
  });

export const setRiderVerification = (riderId: string, is_verified: boolean) =>
  apiPatch<{ ok: boolean }>(`/admin/riders/${riderId}`, { is_verified });

export const setRiderSuspension = (riderId: string, is_suspended: boolean) =>
  apiPatch<{ ok: boolean }>(`/admin/riders/${riderId}`, { is_suspended });

export const listAdminDeliveries = (params: { status?: string; q?: string; page?: number } = {}) =>
  apiGet<Paginated<Delivery>>('/admin/deliveries', { params });

export const assignRider = (deliveryId: string, riderId: string) =>
  apiPost<Delivery>(`/admin/deliveries/${deliveryId}/assign`, { rider_id: riderId });

export const forceCancelDelivery = (deliveryId: string, reason: string) =>
  apiPost<Delivery>(`/admin/deliveries/${deliveryId}/cancel`, { reason });

export const listIssues = () => apiGet<Paginated<Delivery>>('/admin/issues');
