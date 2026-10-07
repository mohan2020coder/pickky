import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { config } from '../config';
import { getAccessToken } from '../auth/tokenStorage';
import { useAuthStore } from '../stores/authStore';
import { useRealtimeStore } from '../stores/realtimeStore';
import { useToastStore } from '../stores/uiStore';
import { publishEnvelope, subscribeEnvelopes } from './eventBus';
import { syncState } from '../api/deliveries';
import { queryKeys } from '../constants/queryKeys';
import { ClientMessage, ConnectionState, DeliveryStatus, Message, ServerEnvelope } from '../types';

type RealtimeContextValue = {
  connection: ConnectionState;
  online: boolean;
};

const RealtimeContext = createContext<RealtimeContextValue>({ connection: 'idle', online: true });

export const useRealtime = () => useContext(RealtimeContext);
export const useConnectionState = () => useContext(RealtimeContext).connection;

const DELIVERY_EVENTS = new Set([
  'delivery.created',
  'delivery.rider_searching',
  'delivery.rider_assigned',
  'delivery.rider_arriving',
  'delivery.rider_arrived',
  'delivery.pickup_verification_required',
  'delivery.picked_up',
  'delivery.in_transit',
  'delivery.near_destination',
  'delivery.delivery_verification_required',
  'delivery.delivered',
  'delivery.cancelled',
  'delivery.failed',
  'delivery.price_updated',
]);

const backoffMs = (attempt: number): number => Math.min(config.wsMaxBackoffMs, 1000 * 2 ** Math.min(attempt, 5));

export const RealtimeProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const status = useAuthStore((s) => s.status);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const setConnection = useRealtimeStore((s) => s.setConnection);
  const setDeliveryStatus = useRealtimeStore((s) => s.setDeliveryStatus);
  const setRiderLocation = useRealtimeStore((s) => s.setRiderLocation);
  const setTyping = useRealtimeStore((s) => s.setTyping);
  const setLastSyncAt = useRealtimeStore((s) => s.setLastSyncAt);
  const connection = useRealtimeStore((s) => s.connection);
  const showToast = useToastStore((s) => s.show);

  const [online, setOnline] = useState(true);
  const socketRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedRef = useRef(false);
  const invalidationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingInvalidations = useRef<Set<string>>(new Set());

  const invalidateSoon = useCallback(
    (prefix: string) => {
      pendingInvalidations.current.add(prefix);
      if (invalidationRef.current) return;
      invalidationRef.current = setTimeout(() => {
        pendingInvalidations.current.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
        pendingInvalidations.current.clear();
        invalidationRef.current = null;
      }, 400);
    },
    [queryClient],
  );

  const sync = useCallback(async () => {
    try {
      await syncState(useRealtimeStore.getState().lastSyncAt ?? undefined);
      invalidateSoon('deliveries');
      invalidateSoon('notifications');
      invalidateSoon('rider');
      invalidateSoon('support');
      setLastSyncAt(new Date().toISOString());
    } catch {
      // Sync is best-effort; queries will refetch on focus.
    }
  }, [invalidateSoon, setLastSyncAt]);

  // Envelope pipeline — fed by WebSocket (live) or the local mock backend.
  useEffect(() => {
    const unsubscribe = subscribeEnvelopes((envelope: ServerEnvelope) => {
      const data = envelope.data as Record<string, unknown> & { delivery_id?: string };

      if (DELIVERY_EVENTS.has(envelope.event)) {
        const deliveryId = (data.delivery_id as string) ?? envelope.entity_id;
        const nextStatus = data.status as DeliveryStatus | undefined;
        if (deliveryId && nextStatus) {
          setDeliveryStatus(deliveryId, nextStatus);
          queryClient.setQueryData(queryKeys.delivery(deliveryId), (prev: unknown) =>
            prev && typeof prev === 'object'
              ? { ...(prev as Record<string, unknown>), status: nextStatus, status_changed_at: envelope.timestamp }
              : prev,
          );
        }
        invalidateSoon('deliveries');
        invalidateSoon('rider');
        return;
      }

      if (envelope.event === 'rider.location_updated') {
        const deliveryId = data.delivery_id as string | undefined;
        if (deliveryId) {
          setRiderLocation(deliveryId, {
            lat: data.lat as number,
            lng: data.lng as number,
            heading: data.heading as number | undefined,
            speed: data.speed as number | undefined,
            accuracy: data.accuracy as number | undefined,
            ts: (data.ts as number | undefined) ?? Date.now(),
          });
        }
        return;
      }

      if (envelope.event === 'notification.created') {
        invalidateSoon('notifications');
        queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
        return;
      }

      if (envelope.event === 'chat.message_created') {
        const message = envelope.data as unknown as Message;
        if (message?.conversation_id) {
          queryClient.setQueryData<Message[]>(queryKeys.messages(message.conversation_id), (prev: Message[] | undefined) => {
            if (prev?.some((existing: Message) => existing.id === message.id)) return prev;
            return [...(prev ?? []), message];
          });
          invalidateSoon('conversations');
        }
        return;
      }

      if (envelope.event === 'chat.typing') {
        const payload = envelope.data as { conversation_id?: string; typing?: boolean };
        if (payload.conversation_id) setTyping(payload.conversation_id, !!payload.typing);
        return;
      }

      if (envelope.event === 'rider.delivery_offer') {
        invalidateSoon('rider');
        showToast('New delivery request nearby', { tone: 'info', actionLabel: 'View', onAction: undefined });
        return;
      }

      if (envelope.event.startsWith('support.')) {
        invalidateSoon('support');
      }
    });
    return unsubscribe;
  }, [queryClient, invalidateSoon, setDeliveryStatus, setRiderLocation, setTyping, showToast]);

  // Network availability
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const wasOffline = !online;
      const isOnline = !!(state.isConnected && state.isInternetReachable !== false);
      setOnline(isOnline);
      if (isOnline && wasOffline) {
        showToast('Back online', { tone: 'success' });
        void sync();
      } else if (!isOnline) {
        showToast("You're offline — some information may be outdated.", { tone: 'error' });
      }
    });
    return unsubscribe;
  }, [online, showToast, sync]);

  // WebSocket lifecycle (live mode only; mock mode streams through the in-process bus)
  const teardown = useCallback(() => {
    closedRef.current = true;
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (reconnectRef.current) clearTimeout(reconnectRef.current);
    heartbeatRef.current = null;
    reconnectRef.current = null;
    try {
      socketRef.current?.close();
    } catch {
      // ignore
    }
    socketRef.current = null;
  }, []);

  const connect = useCallback(async () => {
    if (config.isMock) {
      setConnection('connected');
      void sync();
      return;
    }
    const token = await getAccessToken();
    if (!token) {
      setConnection('idle');
      return;
    }
    closedRef.current = false;
    setConnection(attemptRef.current > 0 ? 'reconnecting' : 'connecting', attemptRef.current);

    try {
      const separator = config.wsUrl.includes('?') ? '&' : '?';
      const socket = new WebSocket(`${config.wsUrl}${separator}token=${encodeURIComponent(token)}`);
      socketRef.current = socket;

      socket.onopen = () => {
        attemptRef.current = 0;
        setConnection('connected');
        const userRoom = userId ? `user:${userId}` : null;
        if (userRoom) socket.send(JSON.stringify({ action: 'subscribe', room: userRoom } satisfies ClientMessage));
        socket.send(JSON.stringify({ action: 'subscribe', room: 'admin' } satisfies ClientMessage));
        heartbeatRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ action: 'ping' } satisfies ClientMessage));
          }
        }, config.wsHeartbeatMs);
        void sync();
      };

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(String(event.data));
          if (parsed && typeof parsed === 'object' && 'event' in parsed) {
            publishEnvelope(parsed as ServerEnvelope);
          }
        } catch {
          // Ignore non-JSON frames (pong frames etc.)
        }
      };

      socket.onerror = () => {
        // onclose handles reconnection
      };

      socket.onclose = () => {
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
        if (closedRef.current) return;
        attemptRef.current += 1;
        setConnection('reconnecting', attemptRef.current);
        reconnectRef.current = setTimeout(() => {
          void connect();
        }, backoffMs(attemptRef.current));
      };
    } catch {
      attemptRef.current += 1;
      setConnection('reconnecting', attemptRef.current);
      reconnectRef.current = setTimeout(() => {
        void connect();
      }, backoffMs(attemptRef.current));
    }
  }, [setConnection, sync, userId]);

  useEffect(() => {
    if (status !== 'authenticated') {
      teardown();
      setConnection('idle');
      return;
    }
    closedRef.current = false;
    void connect();
    return () => {
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, userId]);

  // Sync whenever connectivity is restored while authenticated
  useEffect(() => {
    if (online && status === 'authenticated') void sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, status]);

  const value = useMemo(() => ({ connection, online }), [connection, online]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
};
