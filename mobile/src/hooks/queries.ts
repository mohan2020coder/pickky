import { useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import * as api from '../api/deliveries';
import * as riderApi from '../api/riders';
import * as adminApi from '../api/admin';
import { fetchMe } from '../api/auth';
import { queryKeys } from '../constants/queryKeys';
import {
  AdminUserRow,
  Conversation,
  Delivery,
  Message,
  NotificationRecord,
  Paginated,
  RiderProfile,
  RiderSummary,
  SavedAddress,
  SupportTicket,
  TicketMessage,
  User,
} from '../types';

export const useCurrentUser = (options?: UseQueryOptions<User, Error>) =>
  useQuery<User, Error>({ queryKey: queryKeys.me, queryFn: fetchMe, staleTime: 5 * 60_000, ...options });

export const useDeliveries = (filters: { scope?: 'active' | 'history'; status?: string } = {}) =>
  useQuery({
    queryKey: queryKeys.deliveries(filters),
    queryFn: () => api.listDeliveries({ scope: filters.scope, status: filters.status }),
    select: (res: Paginated<Delivery>) => res.data,
  });

export const useDelivery = (id?: string) =>
  useQuery({
    queryKey: queryKeys.delivery(id ?? ''),
    queryFn: () => api.getDelivery(id as string),
    enabled: !!id,
  });

export const useNotifications = (page = 1) =>
  useQuery({
    queryKey: queryKeys.notifications(page),
    queryFn: () => api.listNotifications({ page }),
  });

export const useUnreadCount = () =>
  useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: api.unreadNotificationCount,
    select: (res: { count: number }) => res.count,
    refetchInterval: 60_000,
  });

export const useConversations = (deliveryId?: string) =>
  useQuery({
    queryKey: queryKeys.conversations(deliveryId),
    queryFn: () => api.listConversations(deliveryId),
  });

export const useMessages = (conversationId?: string) =>
  useQuery({
    queryKey: queryKeys.messages(conversationId ?? ''),
    queryFn: () => api.listMessages(conversationId as string),
    enabled: !!conversationId,
  });

export const useSavedAddresses = () =>
  useQuery({
    queryKey: queryKeys.savedAddresses,
    queryFn: api.listSavedAddresses,
  });

export const useRiderProfile = () =>
  useQuery({
    queryKey: queryKeys.riderProfile,
    queryFn: riderApi.getRiderProfile,
  });

export const useEarnings = () =>
  useQuery({
    queryKey: queryKeys.riderEarnings,
    queryFn: () => riderApi.getEarnings('today'),
  });

export const useRiderDeliveries = () =>
  useQuery({
    queryKey: queryKeys.riderDeliveries,
    queryFn: () => riderApi.listRiderDeliveries(),
    select: (res: Paginated<Delivery>) => res.data,
  });

export const useRiderOffers = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.riderOffers,
    queryFn: riderApi.listOffers,
    enabled,
    refetchInterval: 15_000,
  });

export const useTickets = () =>
  useQuery({
    queryKey: queryKeys.tickets,
    queryFn: api.listTickets,
    select: (res: Paginated<SupportTicket>) => res.data,
  });

export const useTicket = (id?: string) =>
  useQuery({ queryKey: queryKeys.ticket(id ?? ''), queryFn: () => api.getTicket(id as string), enabled: !!id });

export const useTicketMessages = (id?: string) =>
  useQuery({ queryKey: queryKeys.ticketMessages(id ?? ''), queryFn: () => api.listTicketMessages(id as string), enabled: !!id });

export const useAdminOverview = () =>
  useQuery({ queryKey: queryKeys.adminOverview, queryFn: adminApi.getAdminOverview });

export const useAdminUsers = (q = '') =>
  useQuery({
    queryKey: queryKeys.adminUsers(q),
    queryFn: () => adminApi.listAdminUsers({ q }),
    select: (res: Paginated<AdminUserRow>) => res.data,
  });

export const useAdminRiders = (q = '') =>
  useQuery({
    queryKey: queryKeys.adminRiders(q),
    queryFn: () => adminApi.listAdminRiders({ q }),
    select: (res: Paginated<RiderSummary & { status: string; is_verified: boolean; is_suspended: boolean }>) => res.data,
  });

export const useAdminDeliveries = (filters: { status?: string; q?: string; issues?: boolean } = {}) =>
  useQuery({
    queryKey: queryKeys.adminDeliveries(filters),
    queryFn: () => (filters.issues ? adminApi.listIssues() : adminApi.listAdminDeliveries({ status: filters.status, q: filters.q })),
    select: (res: Paginated<Delivery>) => res.data,
  });

// ---------- mutations ----------

export const useCreateDelivery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createDelivery,
    onSuccess: (delivery) => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.setQueryData(queryKeys.delivery(delivery.id), delivery);
    },
  });
};

export const useCancelDelivery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.cancelDelivery(id, reason),
    onSuccess: (delivery) => {
      queryClient.setQueryData(queryKeys.delivery(delivery.id), delivery);
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    },
  });
};

export const useVerifyDeliveryOtp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, otp, stage }: { id: string; otp: string; stage: 'pickup' | 'delivery' }) =>
      api.verifyDeliveryOtp(id, otp, stage),
    onSuccess: (delivery) => {
      queryClient.setQueryData(queryKeys.delivery(delivery.id), delivery);
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    },
  });
};

export const useRateDelivery = () =>
  useMutation({
    mutationFn: ({ id, stars, comment, tags }: { id: string; stars: number; comment?: string; tags?: string[] }) =>
      api.rateDelivery(id, stars, comment, tags),
  });

export const useSendMessage = (conversationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.sendMessage(conversationId, body),
    onSuccess: (message: Message) => {
      queryClient.setQueryData<Message[]>(queryKeys.messages(conversationId), (prev: Message[] | undefined) => {
        if (prev?.some((existing) => existing.id === message.id)) return prev;
        return [...(prev ?? []), message];
      });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

export const useMarkConversationRead = (conversationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.markMessagesRead(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
    },
  });
};

export const useSetRiderPresence = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: riderApi.setRiderPresence,
    onSuccess: (rider: RiderProfile) => {
      queryClient.setQueryData(queryKeys.riderProfile, rider);
    },
  });
};

export const useAcceptOffer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (offerId: string) => riderApi.acceptOffer(offerId),
    onSuccess: (delivery: Delivery) => {
      queryClient.setQueryData(queryKeys.delivery(delivery.id), delivery);
      queryClient.invalidateQueries({ queryKey: queryKeys.riderOffers });
      queryClient.invalidateQueries({ queryKey: queryKeys.riderDeliveries });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    },
  });
};

export const useRejectOffer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (offerId: string) => riderApi.rejectOffer(offerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.riderOffers }),
  });
};

export const useUpdateDeliveryStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) =>
      riderApi.updateDeliveryStatus(id, status, note),
    onSuccess: (delivery: Delivery) => {
      queryClient.setQueryData(queryKeys.delivery(delivery.id), delivery);
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.riderDeliveries });
    },
  });
};

export const useCreateTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createTicket,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tickets }),
  });
};

export const useSendTicketMessage = (ticketId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.sendTicketMessage(ticketId, body),
    onSuccess: (message: TicketMessage) => {
      queryClient.setQueryData<TicketMessage[]>(queryKeys.ticketMessages(ticketId), (prev: TicketMessage[] | undefined) => [...(prev ?? []), message]);
    },
  });
};

export const useAssignRider = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ deliveryId, riderId }: { deliveryId: string; riderId: string }) => adminApi.assignRider(deliveryId, riderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });
};

export const useCreateSavedAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createSavedAddress,
    onSuccess: (address: SavedAddress) => {
      queryClient.setQueryData<SavedAddress[]>(queryKeys.savedAddresses, (prev: SavedAddress[] | undefined) => [...(prev ?? []), address]);
    },
  });
};

export const useDeleteSavedAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteSavedAddress(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.savedAddresses }),
  });
};

export type { Conversation, NotificationRecord };
