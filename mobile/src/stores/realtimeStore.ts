import { create } from 'zustand';
import { ConnectionState, DeliveryStatus, RiderLocation } from '../types';

type RealtimeState = {
  connection: ConnectionState;
  reconnectAttempt: number;
  activeDeliveries: Record<string, DeliveryStatus>;
  riderLocations: Record<string, RiderLocation>;
  conversationTyping: Record<string, boolean>;
  lastSyncAt: string | null;
  setConnection: (connection: ConnectionState, attempt?: number) => void;
  setDeliveryStatus: (deliveryId: string, status: DeliveryStatus) => void;
  setRiderLocation: (deliveryId: string, location: RiderLocation) => void;
  setActiveDeliveries: (entries: [string, DeliveryStatus][]) => void;
  setTyping: (conversationId: string, typing: boolean) => void;
  setLastSyncAt: (iso: string | null) => void;
  reset: () => void;
};

const initial = {
  connection: 'idle' as ConnectionState,
  reconnectAttempt: 0,
  activeDeliveries: {} as Record<string, DeliveryStatus>,
  riderLocations: {} as Record<string, RiderLocation>,
  conversationTyping: {} as Record<string, boolean>,
  lastSyncAt: null as string | null,
};

export const useRealtimeStore = create<RealtimeState>((set) => ({
  ...initial,
  setConnection: (connection, attempt = 0) => set({ connection, reconnectAttempt: attempt }),
  setDeliveryStatus: (deliveryId, status) =>
    set((state) => ({ activeDeliveries: { ...state.activeDeliveries, [deliveryId]: status } })),
  setRiderLocation: (deliveryId, location) =>
    set((state) => {
      const previous = state.riderLocations[deliveryId];
      if (previous && location.ts - previous.ts < 450 && previous.lat === location.lat && previous.lng === location.lng) {
        return state;
      }
      return { riderLocations: { ...state.riderLocations, [deliveryId]: location } };
    }),
  setActiveDeliveries: (entries) =>
    set((state) => ({ activeDeliveries: { ...state.activeDeliveries, ...Object.fromEntries(entries) } })),
  setTyping: (conversationId, typing) =>
    set((state) => ({ conversationTyping: { ...state.conversationTyping, [conversationId]: typing } })),
  setLastSyncAt: (iso) => set({ lastSyncAt: iso }),
  reset: () => set({ ...initial }),
}));
