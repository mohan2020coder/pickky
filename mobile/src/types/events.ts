export type ServerEnvelope<T = unknown> = {
  event: string;
  event_id: string;
  sequence: number;
  timestamp: string;
  entity_type: string;
  entity_id: string;
  data: T;
};

export type ClientMessage =
  | { action: 'ping' }
  | { action: 'pong' }
  | { action: 'subscribe'; room: string }
  | { action: 'unsubscribe'; room: string }
  | { action: 'location'; data: { delivery_id: string; lat: number; lng: number; heading?: number; speed?: number; accuracy?: number } }
  | { action: 'message'; data: { conversation_id: string; body: string; client_id?: string } }
  | { action: 'typing'; data: { conversation_id: string; typing: boolean } };

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export type RiderLocation = {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  ts: number;
};

export const Events = {
  deliveryCreated: 'delivery.created',
  deliveryPriceUpdated: 'delivery.price_updated',
  deliveryRiderSearching: 'delivery.rider_searching',
  deliveryRiderAssigned: 'delivery.rider_assigned',
  deliveryRiderArriving: 'delivery.rider_arriving',
  deliveryRiderArrived: 'delivery.rider_arrived',
  deliveryPickupVerificationRequired: 'delivery.pickup_verification_required',
  deliveryPickedUp: 'delivery.picked_up',
  deliveryInTransit: 'delivery.in_transit',
  deliveryNearDestination: 'delivery.near_destination',
  deliveryDeliveryVerificationRequired: 'delivery.delivery_verification_required',
  deliveryDelivered: 'delivery.delivered',
  deliveryCancelled: 'delivery.cancelled',
  deliveryFailed: 'delivery.failed',
  riderOnline: 'rider.online',
  riderOffline: 'rider.offline',
  riderLocationUpdated: 'rider.location_updated',
  riderDeliveryOffer: 'rider.delivery_offer',
  notificationCreated: 'notification.created',
  notificationRead: 'notification.read',
  chatMessageCreated: 'chat.message_created',
  chatMessageRead: 'chat.message_read',
  chatTyping: 'chat.typing',
  paymentCreated: 'payment.created',
  paymentSuccess: 'payment.success',
  paymentFailed: 'payment.failed',
  supportTicketCreated: 'support.ticket_created',
  supportTicketUpdated: 'support.ticket_updated',
  supportTicketResolved: 'support.ticket_resolved',
} as const;
