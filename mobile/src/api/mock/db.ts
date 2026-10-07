import { publishEnvelope } from '../../websocket/eventBus';
import { Events, ServerEnvelope } from '../../types';
import {
  Conversation,
  Delivery,
  DeliveryStatus,
  Message,
  NotificationRecord,
  Role,
  RiderProfile,
  RiderSummary,
  SupportTicket,
  TicketMessage,
  User,
} from '../../types';
import { makeId, makeToken, nowIso } from '../../utils/ids';
import { straightRoute } from '../../utils/geo';
import { STATUS_META } from '../../constants/delivery';

export type MockUser = User & { password: string; is_active: boolean };

export type MockOffer = {
  id: string;
  delivery_id: string;
  expires_at: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
};

export type MockDb = {
  users: MockUser[];
  sessions: { access_token: string; refresh_token: string; user_id: string; revoked?: boolean }[];
  riders: (RiderProfile & { name: string })[];
  deliveries: Delivery[];
  offers: MockOffer[];
  notifications: NotificationRecord[];
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  tickets: SupportTicket[];
  ticketMessages: Record<string, TicketMessage[]>;
  savedAddresses: Record<string, { id: string; label: string; address: string; lat: number; lng: number }[]>;
};

const seedUser = (id: string, name: string, phone: string, password: string, roles: Role[], email?: string): MockUser => ({
  id,
  name,
  phone,
  email: email ?? null,
  roles,
  created_at: nowIso(),
  password,
  is_active: true,
});

const riderSummary = (db: MockDb, riderId?: string | null): RiderSummary | null => {
  if (!riderId) return null;
  const rider = db.riders.find((r) => r.id === riderId);
  if (!rider) return null;
  return {
    id: rider.id,
    name: rider.name,
    rating: rider.rating ?? 4.8,
    vehicle_type: rider.vehicle_type ?? 'Bike',
    license_plate: rider.license_plate ?? 'KA-01-HJ-2456',
    photo_url: null,
  };
};

export const hydrateDelivery = (db: MockDb, delivery: Delivery): Delivery => ({
  ...delivery,
  rider: riderSummary(db, delivery.rider_id),
});

const STATUS_EVENT: Record<string, string> = {
  CREATED: Events.deliveryCreated,
  SEARCHING_RIDER: Events.deliveryRiderSearching,
  RIDER_ASSIGNED: Events.deliveryRiderAssigned,
  RIDER_ARRIVING_PICKUP: Events.deliveryRiderArriving,
  RIDER_ARRIVED_PICKUP: Events.deliveryRiderArrived,
  PICKUP_VERIFICATION: Events.deliveryPickupVerificationRequired,
  PICKED_UP: Events.deliveryPickedUp,
  IN_TRANSIT: Events.deliveryInTransit,
  NEAR_DESTINATION: Events.deliveryNearDestination,
  DELIVERY_VERIFICATION: Events.deliveryDeliveryVerificationRequired,
  DELIVERED: Events.deliveryDelivered,
  CANCELLED: Events.deliveryCancelled,
  FAILED: Events.deliveryFailed,
};

const ALLOWED: Record<DeliveryStatus, DeliveryStatus[]> = {
  DRAFT: ['CREATED', 'CANCELLED'],
  CREATED: ['SEARCHING_RIDER', 'CANCELLED'],
  SEARCHING_RIDER: ['RIDER_ASSIGNED', 'CANCELLED', 'FAILED'],
  RIDER_ASSIGNED: ['RIDER_ARRIVING_PICKUP', 'RIDER_ARRIVED_PICKUP', 'CANCELLED'],
  RIDER_ARRIVING_PICKUP: ['RIDER_ARRIVED_PICKUP', 'CANCELLED'],
  RIDER_ARRIVED_PICKUP: ['PICKUP_VERIFICATION', 'CANCELLED'],
  PICKUP_VERIFICATION: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT'],
  IN_TRANSIT: ['NEAR_DESTINATION', 'DELIVERY_VERIFICATION'],
  NEAR_DESTINATION: ['DELIVERY_VERIFICATION', 'IN_TRANSIT'],
  DELIVERY_VERIFICATION: ['DELIVERED', 'FAILED'],
  DELIVERED: [],
  CANCELLED: [],
  FAILED: [],
};

export const createEnvelope = <T>(event: string, entityType: string, entityId: string, data: T): ServerEnvelope<T> => ({
  event,
  event_id: makeId('evt'),
  sequence: Date.now(),
  timestamp: nowIso(),
  entity_type: entityType,
  entity_id: entityId,
  data,
});

export const emit = (event: string, entityType: string, entityId: string, data: unknown): void => {
  publishEnvelope(createEnvelope(event, entityType, entityId, data));
};

export const notify = (
  db: MockDb,
  userId: string,
  type: string,
  title: string,
  message: string,
  data?: Record<string, unknown>,
): NotificationRecord => {
  const notification: NotificationRecord = {
    id: makeId('ntf'),
    user_id: userId,
    type,
    title,
    message,
    data: data ?? null,
    read_at: null,
    created_at: nowIso(),
  };
  db.notifications.unshift(notification);
  emit(Events.notificationCreated, 'notification', notification.id, notification);
  return notification;
};

type TransitionResult = { delivery: Delivery; changed: boolean };

export const applyStatus = (
  db: MockDb,
  deliveryId: string,
  next: DeliveryStatus,
  note?: string,
): TransitionResult | null => {
  const delivery = db.deliveries.find((d) => d.id === deliveryId);
  if (!delivery) return null;
  if (delivery.status === next) return { delivery, changed: false };
  const allowed = ALLOWED[delivery.status] ?? [];
  if (!allowed.includes(next)) return null;

  delivery.status = next;
  delivery.status_changed_at = nowIso();
  delivery.updated_at = nowIso();
  delivery.status_history = [
    ...(delivery.status_history ?? []),
    { id: makeId('h'), status: next, note: note ?? STATUS_META[next]?.label ?? null, created_at: nowIso() },
  ];

  if (next === 'DELIVERED') delivery.delivered_at = nowIso();
  if (next === 'CANCELLED') delivery.cancelled_at = nowIso();

  const meta = STATUS_META[next];
  notify(db, delivery.customer_id, `delivery.${next.toLowerCase()}`, meta.label, meta.description, {
    delivery_id: delivery.id,
  });
  emit(STATUS_EVENT[next] ?? 'delivery.status_changed', 'delivery', delivery.id, {
    delivery_id: delivery.id,
    status: next,
    status_changed_at: delivery.status_changed_at,
  });
  return { delivery, changed: true };
};

type TimerHandle = ReturnType<typeof setTimeout>;

const timers = new Map<string, Set<TimerHandle>>();

const track = (deliveryId: string, timer: TimerHandle): void => {
  let set = timers.get(deliveryId);
  if (!set) {
    set = new Set();
    timers.set(deliveryId, set);
  }
  set.add(timer);
};

const later = (deliveryId: string, ms: number, fn: () => void): void => {
  const t = setTimeout(() => {
    timers.get(deliveryId)?.delete(t);
    fn();
  }, ms);
  track(deliveryId, t);
};

export const clearDeliveryTimers = (deliveryId: string): void => {
  const set = timers.get(deliveryId);
  if (!set) return;
  set.forEach((t) => clearTimeout(t));
  set.clear();
  timers.delete(deliveryId);
};

const riderStartNear = (point: { lat: number; lng: number }) => ({ lat: point.lat + 0.014, lng: point.lng - 0.016 });

const streamRider = (
  db: MockDb,
  delivery: Delivery,
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  steps: number,
  intervalMs: number,
  onDone?: () => void,
): void => {
  const path = straightRoute(from, to, steps);
  path.forEach((point, index) => {
    later(
      delivery.id,
      intervalMs * (index + 1),
      () => {
        const current = db.deliveries.find((d) => d.id === delivery.id);
        if (!current || current.rider_id !== delivery.rider_id) return;
        emit(Events.riderLocationUpdated, 'delivery', delivery.id, {
          delivery_id: delivery.id,
          lat: point.lat,
          lng: point.lng,
          heading: index * (360 / path.length),
          speed: 8,
          accuracy: 6,
          ts: Date.now(),
        });
        if (index === path.length - 1) onDone?.();
      },
    );
  });
};

export const simulateCustomerLifecycle = (db: MockDb, deliveryId: string): void => {
  const start = () => {
    const delivery = db.deliveries.find((d) => d.id === deliveryId);
    if (!delivery) return;
    applyStatus(db, deliveryId, 'SEARCHING_RIDER');

    later(deliveryId, 3800, () => {
      const current = db.deliveries.find((d) => d.id === deliveryId);
      if (!current || current.status !== 'SEARCHING_RIDER') return;
      const rider = db.riders[0];
      current.rider_id = rider.id;
      applyStatus(db, deliveryId, 'RIDER_ASSIGNED', `${rider.name} accepted your delivery`);
      const conversation: Conversation = {
        id: makeId('conv'),
        delivery_id: deliveryId,
        title: rider.name,
        participant: riderSummary(db, rider.id),
        last_message: null,
        unread_count: 0,
        updated_at: nowIso(),
      };
      db.conversations.unshift(conversation);
      later(deliveryId, 700, () => {
        const c = db.deliveries.find((d) => d.id === deliveryId);
        if (!c || !c.rider_id) return;
        applyStatus(db, deliveryId, 'RIDER_ARRIVING_PICKUP');
        const from = riderStartNear(current.pickup);
        streamRider(db, current, from, current.pickup, 12, 750, () => {
          const d2 = db.deliveries.find((x) => x.id === deliveryId);
          if (!d2) return;
          applyStatus(db, deliveryId, 'RIDER_ARRIVED_PICKUP');
          later(deliveryId, 900, () => applyStatus(db, deliveryId, 'PICKUP_VERIFICATION'));
        });
      });
    });
  };

  applyStatus(db, deliveryId, 'CREATED');
  later(deliveryId, 900, start);
};

export const continueAfterPickup = (db: MockDb, deliveryId: string): void => {
  later(deliveryId, 1100, () => {
    const delivery = db.deliveries.find((d) => d.id === deliveryId);
    if (!delivery || delivery.status !== 'PICKED_UP') return;
    applyStatus(db, deliveryId, 'IN_TRANSIT');
    streamRider(db, delivery, delivery.pickup, delivery.dropoff, 14, 820, () => {
      const d2 = db.deliveries.find((x) => x.id === deliveryId);
      if (!d2) return;
      applyStatus(db, deliveryId, 'NEAR_DESTINATION');
      later(deliveryId, 1400, () => applyStatus(db, deliveryId, 'DELIVERY_VERIFICATION'));
    });
    later(deliveryId, 820 * 10, () => {
      const d2 = db.deliveries.find((x) => x.id === deliveryId);
      if (!d2 || (d2.status !== 'IN_TRANSIT' && d2.status !== 'NEAR_DESTINATION')) return;
      applyStatus(db, deliveryId, 'NEAR_DESTINATION');
    });
  });
};

export const createOfferForRider = (db: MockDb, riderId: string): void => {
  const pending = db.offers.filter((o) => o.status === 'PENDING' && Date.parse(o.expires_at) > Date.now());
  if (pending.length >= 3) return;
  const rider = db.riders.find((r) => r.id === riderId);
  if (!rider) return;
  const customerId = db.users.find((u) => u.roles.includes('CUSTOMER'))?.id ?? 'u_customer';
  const points = [
    { pickup: { lat: 12.9352, lng: 77.6245, addr: '4th Block, Koramangala' }, dropoff: { lat: 12.9116, lng: 77.6389, addr: 'Indiranagar, 100ft Road' } },
    { pickup: { lat: 12.9716, lng: 77.5946, addr: 'MG Road Metro' }, dropoff: { lat: 12.925, lng: 77.5938, addr: 'Jayanagar 4th Block' } },
    { pickup: { lat: 12.9081, lng: 77.6476, addr: 'HSR Layout Sector 2' }, dropoff: { lat: 12.9784, lng: 77.6408, addr: 'Domlur' } },
  ];
  const choice = points[db.offers.length % points.length];
  const distanceKm = Math.round((2 + Math.random() * 6) * 10) / 10;
  const priceMinor = 4000 + Math.round(distanceKm) * 1500;
  const delivery: Delivery = {
    id: makeId('dlv'),
    reference: `DLV-${String(1000 + db.deliveries.length)}`,
    customer_id: customerId,
    rider_id: null,
    status: 'SEARCHING_RIDER',
    pickup: choice.pickup,
    dropoff: choice.dropoff,
    instructions: 'Handle with care.',
    price_minor: priceMinor,
    currency: 'INR',
    distance_km: distanceKm,
    eta_minutes: Math.max(5, Math.round(distanceKm * 3.5)),
    pickup_otp: String(Math.floor(1000 + Math.random() * 9000)),
    delivery_otp: String(Math.floor(1000 + Math.random() * 9000)),
    created_at: nowIso(),
    status_changed_at: nowIso(),
    items: [{ description: 'Package', quantity: 1 }],
    status_history: [{ status: 'SEARCHING_RIDER', note: 'Waiting for a rider', created_at: nowIso() }],
    package_type: 'parcel',
  };
  db.deliveries.unshift(delivery);
  const offer: MockOffer = {
    id: makeId('off'),
    delivery_id: delivery.id,
    expires_at: new Date(Date.now() + 30000).toISOString(),
    status: 'PENDING',
  };
  db.offers.unshift(offer);
  emit(Events.riderDeliveryOffer, 'delivery', delivery.id, {
    offer_id: offer.id,
    delivery_id: delivery.id,
    pickup_addr: delivery.pickup.addr,
    dropoff_addr: delivery.dropoff.addr,
    distance_km: delivery.distance_km,
    earnings_minor: Math.round(priceMinor * 0.8),
    currency: delivery.currency,
    expires_at: offer.expires_at,
  });
  notify(db, riderId, 'rider.delivery_offer', 'New delivery nearby', `${delivery.pickup.addr} → ${delivery.dropoff.addr}`, {
    delivery_id: delivery.id,
    offer_id: offer.id,
  });
};

const seedDeliveries = (): Delivery[] => {
  const base = (i: number, overrides: Partial<Delivery>): Delivery => ({
    id: `dlv_seed_${i}`,
    reference: `DLV-${1000 + i}`,
    customer_id: 'u_customer',
    rider_id: i % 2 === 0 ? 'r_rider_1' : 'r_rider_2',
    status: 'DELIVERED',
    pickup: { lat: 12.9352 + i * 0.004, lng: 77.6245, addr: 'Koramangala, Bengaluru' },
    dropoff: { lat: 12.9116, lng: 77.6389 + i * 0.003, addr: 'Indiranagar, Bengaluru' },
    price_minor: 12000 + i * 1500,
    currency: 'INR',
    distance_km: 4 + i,
    eta_minutes: 15 + i,
    pickup_otp: '1234',
    delivery_otp: '5678',
    created_at: new Date(Date.now() - i * 3600_000).toISOString(),
    delivered_at: new Date(Date.now() - i * 3600_000 + 1800_000).toISOString(),
    status_changed_at: nowIso(),
    items: [{ description: 'Parcel', quantity: 1 }],
    status_history: [{ status: 'DELIVERED', note: 'Delivered', created_at: nowIso() }],
    package_type: 'parcel',
    ...overrides,
  });
  return [
    base(1, {}),
    base(2, {}),
    base(3, { status: 'IN_TRANSIT', delivered_at: null, rider_id: 'r_rider_1', reference: 'DLV-1004' }),
    base(4, { status: 'SEARCHING_RIDER', delivered_at: null, rider_id: null, reference: 'DLV-1005' }),
    base(5, { status: 'RIDER_ASSIGNED', delivered_at: null, rider_id: 'r_rider_2', reference: 'DLV-1006' }),
    base(6, { status: 'CANCELLED', delivered_at: null, cancelled_at: nowIso(), reference: 'DLV-1007' }),
  ];
};

const seedDb = (): MockDb => {
  const users: MockUser[] = [
    seedUser('u_customer', 'Aarav Mehta', '9000000001', 'pass1234', ['CUSTOMER'], 'aarav@example.com'),
    seedUser('u_rider', 'Rajesh Kumar', '9000000002', 'pass1234', ['RIDER'], 'rajesh@example.com'),
    seedUser('u_admin', 'Priya Nair', '9000000003', 'pass1234', ['ADMIN'], 'priya@example.com'),
    seedUser('u_support', 'Support Sam', '9000000004', 'pass1234', ['SUPPORT'], 'sam@example.com'),
    seedUser('u_5', 'Anita Sharma', '9000000005', 'pass1234', ['CUSTOMER']),
    seedUser('u_6', 'Vikram Singh', '9000000006', 'pass1234', ['CUSTOMER']),
    seedUser('u_7', 'Meera Iyer', '9000000007', 'pass1234', ['CUSTOMER']),
    seedUser('u_8', 'Rider Ravi', '9000000008', 'pass1234', ['RIDER']),
  ];

  const riders: (RiderProfile & { name: string })[] = [
    {
      id: 'r_rider_1',
      user_id: 'u_rider',
      status: 'ONLINE',
      vehicle_type: 'Bike',
      license_plate: 'KA-01-HJ-2456',
      is_verified: true,
      is_suspended: false,
      rating: 4.8,
      earnings_minor: 124000,
      completed_deliveries: 148,
      name: 'Rajesh Kumar',
    },
    {
      id: 'r_rider_2',
      user_id: 'u_8',
      status: 'OFFLINE',
      vehicle_type: 'Scooter',
      license_plate: 'KA-05-MN-9911',
      is_verified: true,
      is_suspended: false,
      rating: 4.6,
      earnings_minor: 86500,
      completed_deliveries: 92,
      name: 'Ravi Gowda',
    },
    {
      id: 'r_rider_3',
      user_id: 'u_8',
      status: 'OFFLINE',
      vehicle_type: 'Bike',
      license_plate: 'KA-03-RR-1122',
      is_verified: false,
      is_suspended: false,
      rating: 0,
      earnings_minor: 0,
      completed_deliveries: 0,
      name: 'New Rider',
    },
  ];

  const tickets: SupportTicket[] = [
    {
      id: 'tkt_1',
      reference: 'SUP-101',
      subject: 'Rider has not arrived',
      status: 'OPEN',
      priority: 'HIGH',
      category: 'delivery',
      delivery_id: 'dlv_seed_3',
      created_at: new Date(Date.now() - 7200_000).toISOString(),
      updated_at: nowIso(),
      last_message: 'The rider has not reached the pickup point yet.',
      unread_count: 2,
    },
    {
      id: 'tkt_2',
      reference: 'SUP-102',
      subject: 'Wrong charged amount',
      status: 'RESOLVED',
      priority: 'MEDIUM',
      category: 'payment',
      delivery_id: null,
      created_at: new Date(Date.now() - 90000_000).toISOString(),
      updated_at: new Date(Date.now() - 80000_000).toISOString(),
      last_message: 'Thanks for the quick fix!',
      unread_count: 0,
    },
  ];

  return {
    users,
    sessions: [],
    riders,
    deliveries: seedDeliveries(),
    offers: [],
    notifications: [
      {
        id: 'ntf_seed_1',
        type: 'delivery.delivered',
        title: 'Delivery completed',
        message: 'Delivery DLV-1001 was delivered successfully.',
        data: { delivery_id: 'dlv_seed_1' },
        read_at: null,
        created_at: new Date(Date.now() - 5400_000).toISOString(),
      },
      {
        id: 'ntf_seed_2',
        type: 'delivery.rider_assigned',
        title: 'Rider assigned',
        message: 'Rajesh accepted delivery DLV-1004.',
        data: { delivery_id: 'dlv_seed_3' },
        read_at: null,
        created_at: new Date(Date.now() - 3600_000).toISOString(),
      },
    ],
    conversations: [],
    messages: {},
    tickets,
    ticketMessages: {
      tkt_1: [
        { id: 'tm_1', ticket_id: 'tkt_1', sender_id: 'u_customer', sender_name: 'Aarav Mehta', body: 'Rider has not arrived at pickup for DLV-1004.', created_at: new Date(Date.now() - 7200_000).toISOString() },
        { id: 'tm_2', ticket_id: 'tkt_1', sender_id: 'u_support', sender_name: 'Support Sam', body: 'I am checking with the rider now.', created_at: new Date(Date.now() - 7000_000).toISOString() },
      ],
      tkt_2: [
        { id: 'tm_3', ticket_id: 'tkt_2', sender_id: 'u_customer', sender_name: 'Aarav Mehta', body: 'I was charged twice.', created_at: new Date(Date.now() - 90000_000).toISOString() },
      ],
    },
    savedAddresses: {
      u_customer: [
        { id: 'addr_home', label: 'Home', address: '12, 5th Cross, Koramangala, Bengaluru', lat: 12.9352, lng: 77.6245 },
        { id: 'addr_work', label: 'Work', address: 'Embassy Tech Village, Outer Ring Rd', lat: 12.9855, lng: 77.6682 },
      ],
    },
  };
};

export const db: MockDb = seedDb();

export const findUserByPhone = (phone: string): MockUser | undefined =>
  db.users.find((u) => u.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''));

export const userFromMock = (u: MockUser): User => ({
  id: u.id,
  name: u.name,
  phone: u.phone,
  email: u.email ?? null,
  roles: u.roles,
  created_at: u.created_at,
});

export const makeSession = (userId: string): { access_token: string; refresh_token: string; expires_in: number } => {
  const refresh = makeToken('refresh');
  const access = makeToken('access');
  db.sessions.push({ access_token: access, refresh_token: refresh, user_id: userId });
  return { access_token: access, refresh_token: refresh, expires_in: 900 };
};

export const conversationForDelivery = (deliveryId: string): Conversation | undefined =>
  db.conversations.find((c) => c.delivery_id === deliveryId);
