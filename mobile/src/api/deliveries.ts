import { apiGet, apiPost } from './client';
import { Delivery, GeoPoint, NotificationRecord, Paginated, SavedAddress, SearchResult, SupportTicket, TicketMessage, Conversation, Message, Quote } from '../types';

export type QuoteRequest = {
  pickup: GeoPoint;
  dropoff: GeoPoint;
  items: { description: string; quantity: number; weight_kg?: number }[];
  package_type?: string;
};

export type CreateDeliveryRequest = QuoteRequest & {
  instructions?: string;
  package_size?: string;
};

export const getQuote = (payload: QuoteRequest) => apiPost<Quote>('/deliveries/quote', payload);

export const createDelivery = (payload: CreateDeliveryRequest) => apiPost<Delivery>('/deliveries', payload);

export const listDeliveries = (params: { status?: string; page?: number; limit?: number; scope?: 'active' | 'history' } = {}) =>
  apiGet<Paginated<Delivery>>('/deliveries', { params: { ...params, limit: params.limit ?? 20 } });

export const getDelivery = (id: string) => apiGet<Delivery>(`/deliveries/${id}`);

export const cancelDelivery = (id: string, reason: string) => apiPost<Delivery>(`/deliveries/${id}/cancel`, { reason });

export const verifyDeliveryOtp = (id: string, otp: string, stage: 'pickup' | 'delivery') =>
  apiPost<Delivery>(`/deliveries/${id}/verify`, { otp, stage });

export const rateDelivery = (id: string, stars: number, comment?: string, tags?: string[]) =>
  apiPost<{ ok: boolean }>(`/deliveries/${id}/rating`, { stars, comment, tags });

export const listConversations = (deliveryId?: string) =>
  apiGet<Conversation[]>('/conversations', { params: deliveryId ? { delivery_id: deliveryId } : undefined });

export const listMessages = (conversationId: string, before?: string) =>
  apiGet<Message[]>(`/conversations/${conversationId}/messages`, { params: before ? { before } : undefined });

export const sendMessage = (conversationId: string, body: string) =>
  apiPost<Message>(`/conversations/${conversationId}/messages`, { body });

export const markMessagesRead = (conversationId: string) => apiPost<{ ok: boolean }>(`/conversations/${conversationId}/read`, {});

export const listNotifications = (params: { unread?: boolean; page?: number } = {}) =>
  apiGet<Paginated<NotificationRecord>>('/notifications', { params });

export const unreadNotificationCount = () => apiGet<{ count: number }>('/notifications/unread-count');

export const markNotificationRead = (id: string) => apiPost<{ ok: boolean }>(`/notifications/${id}/read`, {});

export const markAllNotificationsRead = () => apiPost<{ ok: boolean }>('/notifications/read-all', {});

export const searchLocations = (q: string) =>
  apiGet<SearchResult[]>('/locations/search', { params: { q }, auth: false });

export const listSavedAddresses = () => apiGet<SavedAddress[]>('/locations/saved');

export const createSavedAddress = (payload: { label: string; address: string; lat: number; lng: number }) =>
  apiPost<SavedAddress>('/locations/saved', payload);

export const deleteSavedAddress = (id: string) => apiPost<{ ok: boolean }>(`/locations/saved/${id}/delete`, {});

export const listTickets = () => apiGet<Paginated<SupportTicket>>('/support/tickets');

export const createTicket = (payload: { subject: string; category?: string; body: string; delivery_id?: string }) =>
  apiPost<SupportTicket>('/support/tickets', payload);

export const getTicket = (id: string) => apiGet<SupportTicket>(`/support/tickets/${id}`);

export const listTicketMessages = (id: string) => apiGet<TicketMessage[]>(`/support/tickets/${id}/messages`);

export const sendTicketMessage = (id: string, body: string) => apiPost<TicketMessage>(`/support/tickets/${id}/messages`, { body });

export const syncState = (since?: string) =>
  apiGet<{ notifications: NotificationRecord[]; deliveries: Delivery[]; events: unknown[] }>('/sync', {
    params: since ? { since } : undefined,
  });
