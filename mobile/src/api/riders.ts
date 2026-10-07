import { apiGet, apiPost, apiPut } from './client';
import { Delivery, EarningsSummary, Paginated, RiderProfile, RiderStatus } from '../types';

export type DeliveryOffer = {
  id: string;
  delivery_id: string;
  pickup_addr: string;
  dropoff_addr: string;
  distance_km: number;
  earnings_minor: number;
  currency: string;
  package_type?: string | null;
  customer_rating?: number | null;
  expires_at?: string | null;
};

export const getRiderProfile = () => apiGet<RiderProfile>('/riders/me');

export const updateRiderProfile = (payload: Partial<Pick<RiderProfile, 'vehicle_type' | 'license_plate'>>) =>
  apiPut<RiderProfile>('/riders/me', payload);

export const setRiderPresence = (status: RiderStatus) => apiPost<RiderProfile>('/riders/presence', { status });

export const listOffers = () => apiGet<DeliveryOffer[]>('/riders/offers');

export const acceptOffer = (offerId: string) => apiPost<Delivery>(`/riders/offers/${offerId}/accept`, {});

export const rejectOffer = (offerId: string) => apiPost<{ ok: boolean }>(`/riders/offers/${offerId}/reject`, {});

export const updateDeliveryStatus = (deliveryId: string, status: string, note?: string) =>
  apiPost<Delivery>(`/deliveries/${deliveryId}/status`, { status, note });

export const getEarnings = (period: 'today' | 'week' | 'month' = 'today') =>
  apiGet<EarningsSummary>('/riders/earnings', { params: { period } });

export const listRiderDeliveries = (params: { page?: number; status?: string } = {}) =>
  apiGet<Paginated<Delivery>>('/riders/deliveries', { params });
