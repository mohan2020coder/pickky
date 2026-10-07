import { ApiError, MockHandler, MockRouteContext, registerMockHandler } from '../client';
import {
  applyStatus,
  clearDeliveryTimers,
  conversationForDelivery,
  continueAfterPickup,
  createOfferForRider,
  db,
  emit,
  hydrateDelivery,
  makeSession,
  MockUser,
  notify,
  simulateCustomerLifecycle,
  userFromMock,
} from './db';
import { Events, Role } from '../../types';
import {
  Delivery,
  DeliveryStatus,
  Message,
  SavedAddress,
  SearchResult,
} from '../../types';
import { approxEtaMinutes, haversineKm } from '../../utils/geo';
import { makeId, nowIso } from '../../utils/ids';
import { recentEnvelopes } from '../../websocket/eventBus';

const BASE_MINOR = 4000;
const PER_KM_MINOR = 1500;

const ratings: { delivery_id: string; customer_id: string; stars: number; comment?: string; tags?: string[]; created_at: string }[] = [];

const simulatedDeliveries = new Set<string>();

const param = (ctx: MockRouteContext, key: string): string | undefined => {
  const fromParams = ctx.params[key];
  if (fromParams !== undefined) return String(fromParams);
  const fromQuery = ctx.query.get(key);
  return fromQuery === null ? undefined : fromQuery;
};

const body = <T>(ctx: MockRouteContext): T => (ctx.body ?? {}) as T;

const requireUser = (ctx: MockRouteContext): MockUser => {
  const header = ctx.headers.Authorization ?? ctx.headers.authorization;
  const token = header?.replace(/^Bearer\s+/i, '');
  if (!token) throw new ApiError('Please sign in to continue.', 401);
  const session = db.sessions.find((s) => s.access_token === token && !s.revoked);
  if (!session) throw new ApiError('Your session has expired. Please sign in again.', 401);
  const user = db.users.find((u) => u.id === session.user_id);
  if (!user) throw new ApiError('Your session has expired. Please sign in again.', 401);
  if (!user.is_active) throw new ApiError('This account has been deactivated.', 403);
  return user;
};

const requireRole = (ctx: MockRouteContext, ...roles: Role[]): MockUser => {
  const user = requireUser(ctx);
  if (!roles.some((role) => user.roles.includes(role))) {
    throw new ApiError("You don't have permission to do that.", 403);
  }
  return user;
};

const myRiderId = (user: MockUser): string | null => db.riders.find((r) => r.user_id === user.id)?.id ?? null;

const myDeliveries = (user: MockUser): Delivery[] => {
  const riderId = myRiderId(user);
  return db.deliveries.filter((d) => d.customer_id === user.id || (riderId && d.rider_id === riderId));
};

const paginate = <T>(items: T[], ctx: MockRouteContext) => {
  const page = Math.max(1, Number(param(ctx, 'page') ?? 1));
  const limit = Math.max(1, Math.min(50, Number(param(ctx, 'limit') ?? 20)));
  const start = (page - 1) * limit;
  return { data: items.slice(start, start + limit), meta: { page, limit, total: items.length } };
};

const match = (pattern: string, path: string): Record<string, string> | null => {
  const p = pattern.split('/').filter(Boolean);
  const s = path.split('/').filter(Boolean);
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i += 1) {
    const seg = p[i];
    const val = s[i];
    if (seg.startsWith(':')) params[seg.slice(1)] = decodeURIComponent(val);
    else if (seg !== val) return null;
  }
  return params;
};

const findDelivery = (id: string): Delivery => {
  const delivery = db.deliveries.find((d) => d.id === id || d.reference === id);
  if (!delivery) throw new ApiError("We couldn't find that delivery.", 404);
  return delivery;
};

const searchPlaces: SearchResult[] = [
  { id: 'p1', title: 'Koramangala, Bengaluru', subtitle: '4th Block, 5th Cross', lat: 12.9352, lng: 77.6245 },
  { id: 'p2', title: 'Indiranagar, Bengaluru', subtitle: '100 Feet Road', lat: 12.9719, lng: 77.6412 },
  { id: 'p3', title: 'HSR Layout, Bengaluru', subtitle: 'Sector 2, 27th Main', lat: 12.9081, lng: 77.6476 },
  { id: 'p4', title: 'MG Road, Bengaluru', subtitle: 'Metro Station', lat: 12.9756, lng: 77.6063 },
  { id: 'p5', title: 'Whitefield, Bengaluru', subtitle: 'ITPL Main Road', lat: 12.9698, lng: 77.75 },
  { id: 'p6', title: 'Jayanagar, Bengaluru', subtitle: '4th Block', lat: 12.925, lng: 77.5938 },
  { id: 'p7', title: 'Bellandur, Bengaluru', subtitle: 'Outer Ring Road', lat: 12.9305, lng: 77.6784 },
  { id: 'p8', title: 'Yelahanka, Bengaluru', subtitle: 'New Town', lat: 13.1005, lng: 77.5963 },
];

const computeQuote = (pickup: { lat: number; lng: number }, dropoff: { lat: number; lng: number }) => {
  const distanceKm = Math.max(0.5, haversineKm(pickup, dropoff) * 1.3);
  const distanceMinor = Math.floor(distanceKm * PER_KM_MINOR);
  const priceMinor = BASE_MINOR + distanceMinor;
  return {
    distance_km: Math.round(distanceKm * 10) / 10,
    eta_minutes: approxEtaMinutes(distanceKm),
    price_minor: priceMinor,
    currency: 'INR',
    breakdown: [
      { label: 'Base fare', amount_minor: BASE_MINOR },
      { label: `Distance (${Math.round(distanceKm * 10) / 10} km)`, amount_minor: distanceMinor },
    ],
  };
};

const unreadCount = (userId: string): number =>
  db.notifications.filter((n) => n.user_id === userId && !n.read_at).length;

const mock: MockHandler = async (ctx) => {
  const { method, path } = ctx;
  const key = `${method} ${path}`;
  const r = (pattern: string) => match(pattern, path);

  // ---------- auth ----------
  if (key === 'POST /auth/register') {
    const payload = body<{ name: string; phone: string; email?: string; password: string; role?: Role }>(ctx);
    if (!payload.name || !payload.phone || !payload.password) throw new ApiError('Please fill in all required fields.', 422);
    if (payload.password.length < 8) throw new ApiError('Password must be at least 8 characters.', 422);
    if (findUserByPhoneLoose(payload.phone)) throw new ApiError('An account with this phone number already exists.', 409);
    const user: MockUser = {
      id: makeId('u'),
      name: payload.name,
      phone: payload.phone,
      email: payload.email ?? null,
      roles: [payload.role && payload.role !== 'CUSTOMER' ? payload.role : 'CUSTOMER'],
      created_at: nowIso(),
      password: payload.password,
      is_active: true,
    };
    db.users.push(user);
    if (user.roles.includes('RIDER')) {
      db.riders.push({
        id: makeId('r'),
        user_id: user.id,
        status: 'OFFLINE',
        vehicle_type: 'Bike',
        license_plate: '',
        is_verified: false,
        is_suspended: false,
        rating: 0,
        earnings_minor: 0,
        completed_deliveries: 0,
        name: user.name,
      });
    }
    return { user: userFromMock(user), tokens: makeSession(user.id) };
  }

  if (key === 'POST /auth/login') {
    const payload = body<{ identifier: string; password: string }>(ctx);
    const id = (payload.identifier ?? '').trim();
    const user = db.users.find(
      (u) => (u.phone === id || u.email === id || u.name.toLowerCase() === id.toLowerCase()) && u.password === payload.password,
    );
    if (!user) throw new ApiError("We couldn't find an account with those details.", 401);
    if (!user.is_active) throw new ApiError('This account has been deactivated.', 403);
    return { user: userFromMock(user), tokens: makeSession(user.id) };
  }

  if (key === 'POST /auth/refresh') {
    const payload = body<{ refresh_token: string }>(ctx);
    const session = db.sessions.find((s) => s.refresh_token === payload.refresh_token && !s.revoked);
    if (!session) throw new ApiError('Your session has expired. Please sign in again.', 401);
    const tokens = makeSession(session.user_id);
    session.revoked = true;
    return tokens;
  }

  if (key === 'POST /auth/logout') {
    const header = ctx.headers.Authorization ?? '';
    const token = header.replace(/^Bearer\s+/i, '');
    db.sessions.forEach((s) => {
      if (s.access_token === token) s.revoked = true;
    });
    return { ok: true };
  }

  if (key === 'GET /auth/me') return userFromMock(requireUser(ctx));

  if (key === 'POST /auth/otp/request') return { sent: true };

  if (key === 'POST /auth/otp/verify') {
    const payload = body<{ phone: string; code: string }>(ctx);
    if (payload.code !== '1234') throw new ApiError('That code is not valid.', 422);
    const user = findUserByPhoneLoose(payload.phone);
    if (!user) throw new ApiError("We couldn't find an account with that phone number.", 404);
    return { user: userFromMock(user), tokens: makeSession(user.id) };
  }

  if (key === 'POST /auth/password/forgot') return { sent: true };

  if (key === 'POST /auth/password/reset') {
    const payload = body<{ phone: string; code: string; password: string }>(ctx);
    if (payload.code !== '1234') throw new ApiError('That code is not valid.', 422);
    const user = findUserByPhoneLoose(payload.phone);
    if (!user) throw new ApiError("We couldn't find an account with that phone number.", 404);
    user.password = payload.password;
    return { ok: true };
  }

  if (key === 'PUT /auth/password') {
    requireUser(ctx);
    return { ok: true };
  }

  // ---------- deliveries ----------
  if (key === 'POST /deliveries/quote') {
    const payload = body<{ pickup: { lat: number; lng: number }; dropoff: { lat: number; lng: number } }>(ctx);
    if (!payload.pickup || !payload.dropoff) throw new ApiError('Pickup and destination are required.', 422);
    return computeQuote(payload.pickup, payload.dropoff);
  }

  if (key === 'POST /deliveries') {
    const user = requireUser(ctx);
    const payload = body<{
      pickup: { lat: number; lng: number; addr: string };
      dropoff: { lat: number; lng: number; addr: string };
      items: { description: string; quantity: number; weight_kg?: number }[];
      instructions?: string;
      package_type?: string;
      package_size?: string;
    }>(ctx);
    if (!payload.pickup?.addr || !payload.dropoff?.addr) throw new ApiError('Pickup and destination are required.', 422);
    const quote = computeQuote(payload.pickup, payload.dropoff);
    const delivery: Delivery = {
      id: makeId('dlv'),
      reference: `DLV-${1000 + db.deliveries.length}`,
      customer_id: user.id,
      rider_id: null,
      status: 'CREATED',
      pickup: { lat: payload.pickup.lat, lng: payload.pickup.lng, addr: payload.pickup.addr },
      dropoff: { lat: payload.dropoff.lat, lng: payload.dropoff.lng, addr: payload.dropoff.addr },
      instructions: payload.instructions ?? null,
      price_minor: quote.price_minor,
      currency: quote.currency,
      distance_km: quote.distance_km,
      eta_minutes: quote.eta_minutes,
      pickup_otp: String(Math.floor(1000 + Math.random() * 9000)),
      delivery_otp: String(Math.floor(1000 + Math.random() * 9000)),
      created_at: nowIso(),
      status_changed_at: nowIso(),
      items: (payload.items ?? []).map((item) => ({ ...item, fragile: false })),
      status_history: [{ status: 'CREATED', note: 'Delivery created', created_at: nowIso() }],
      package_type: payload.package_type ?? 'parcel',
    };
    db.deliveries.unshift(delivery);
    simulatedDeliveries.add(delivery.id);
    notify(db, user.id, 'delivery.created', 'Delivery created', `We're finding a rider for ${delivery.reference}.`, {
      delivery_id: delivery.id,
    });
    simulateCustomerLifecycle(db, delivery.id);
    return hydrateDelivery(db, delivery);
  }

  if (key === 'GET /deliveries') {
    const user = requireUser(ctx);
    const scope = param(ctx, 'scope');
    const status = param(ctx, 'status');
    let items = myDeliveries(user);
    if (scope === 'active') items = items.filter((d) => !['DELIVERED', 'CANCELLED', 'FAILED'].includes(d.status));
    if (scope === 'history') items = items.filter((d) => ['DELIVERED', 'CANCELLED', 'FAILED'].includes(d.status));
    if (status) items = items.filter((d) => d.status === status);
    items = [...items].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return paginate(items.map((d) => hydrateDelivery(db, d)), ctx);
  }

  if (r('GET /deliveries/:id')) {
    const user = requireUser(ctx);
    const { id } = r('GET /deliveries/:id')!;
    const delivery = findDelivery(id);
    const riderId = myRiderId(user);
    if (delivery.customer_id !== user.id && delivery.rider_id !== riderId && !user.roles.some((role) => role === 'ADMIN' || role === 'SUPPORT')) {
      throw new ApiError("You don't have permission to view this delivery.", 403);
    }
    return hydrateDelivery(db, delivery);
  }

  if (r('POST /deliveries/:id/cancel')) {
    const user = requireUser(ctx);
    const { id } = r('POST /deliveries/:id/cancel')!;
    const delivery = findDelivery(id);
    if (delivery.customer_id !== user.id && !user.roles.includes('ADMIN')) {
      throw new ApiError("You don't have permission to cancel this delivery.", 403);
    }
    const payload = body<{ reason?: string }>(ctx);
    const result = applyStatus(db, delivery.id, 'CANCELLED', payload.reason ?? 'Cancelled by customer');
    if (!result) throw new ApiError('This delivery can no longer be cancelled.', 409);
    clearDeliveryTimers(delivery.id);
    return hydrateDelivery(db, delivery);
  }

  if (r('POST /deliveries/:id/verify')) {
    requireUser(ctx);
    const { id } = r('POST /deliveries/:id/verify')!;
    const delivery = findDelivery(id);
    const payload = body<{ otp: string; stage: 'pickup' | 'delivery' }>(ctx);
    if (payload.stage === 'pickup') {
      if (delivery.status === 'PICKED_UP' || delivery.status === 'IN_TRANSIT') return hydrateDelivery(db, delivery);
      if (delivery.status !== 'PICKUP_VERIFICATION' && delivery.status !== 'RIDER_ARRIVED_PICKUP') {
        throw new ApiError('This delivery is not waiting for pickup verification.', 409);
      }
      if (payload.otp !== delivery.pickup_otp) throw new ApiError('That code is not correct. Please try again.', 422);
      applyStatus(db, delivery.id, 'PICKED_UP', 'Pickup verified');
      if (simulatedDeliveries.has(delivery.id)) continueAfterPickup(db, delivery.id);
      return hydrateDelivery(db, delivery);
    }
    if (delivery.status === 'DELIVERED') return hydrateDelivery(db, delivery);
    if (
      delivery.status !== 'DELIVERY_VERIFICATION' &&
      delivery.status !== 'NEAR_DESTINATION' &&
      delivery.status !== 'IN_TRANSIT'
    ) {
      throw new ApiError('This delivery is not waiting for delivery verification.', 409);
    }
    if (payload.otp !== delivery.delivery_otp) throw new ApiError('That code is not correct. Please try again.', 422);
    applyStatus(db, delivery.id, 'DELIVERED', 'Delivered');
    clearDeliveryTimers(delivery.id);
    return hydrateDelivery(db, delivery);
  }

  if (r('POST /deliveries/:id/rating')) {
    const user = requireUser(ctx);
    const { id } = r('POST /deliveries/:id/rating')!;
    const delivery = findDelivery(id);
    const payload = body<{ stars: number; comment?: string; tags?: string[] }>(ctx);
    if (!payload.stars || payload.stars < 1 || payload.stars > 5) throw new ApiError('Please choose a rating from 1 to 5.', 422);
    ratings.push({
      delivery_id: delivery.id,
      customer_id: user.id,
      stars: payload.stars,
      comment: payload.comment,
      tags: payload.tags,
      created_at: nowIso(),
    });
    return { ok: true };
  }

  if (r('POST /deliveries/:id/status')) {
    requireRole(ctx, 'RIDER', 'ADMIN');
    const { id } = r('POST /deliveries/:id/status')!;
    const delivery = findDelivery(id);
    const payload = body<{ status: DeliveryStatus; note?: string }>(ctx);
    const allowedRiderStatuses: DeliveryStatus[] = ['RIDER_ARRIVING_PICKUP', 'RIDER_ARRIVED_PICKUP', 'IN_TRANSIT', 'NEAR_DESTINATION', 'FAILED'];
    if (!allowedRiderStatuses.includes(payload.status)) {
      throw new ApiError('That status update is not allowed here.', 422);
    }
    const result = applyStatus(db, delivery.id, payload.status, payload.note);
    if (!result) throw new ApiError('That update is not valid for the current delivery state.', 409);
    return hydrateDelivery(db, delivery);
  }

  // ---------- riders ----------
  if (key === 'GET /riders/me') {
    const user = requireRole(ctx, 'RIDER');
    const rider = db.riders.find((rdr) => rdr.user_id === user.id);
    if (!rider) throw new ApiError("We couldn't find your rider profile.", 404);
    return rider;
  }

  if (key === 'PUT /riders/me') {
    const user = requireRole(ctx, 'RIDER');
    const rider = db.riders.find((rdr) => rdr.user_id === user.id);
    if (!rider) throw new ApiError("We couldn't find your rider profile.", 404);
    const payload = body<{ vehicle_type?: string; license_plate?: string }>(ctx);
    if (payload.vehicle_type !== undefined) rider.vehicle_type = payload.vehicle_type;
    if (payload.license_plate !== undefined) rider.license_plate = payload.license_plate;
    return rider;
  }

  if (key === 'POST /riders/presence') {
    const user = requireRole(ctx, 'RIDER');
    const rider = db.riders.find((rdr) => rdr.user_id === user.id);
    if (!rider) throw new ApiError("We couldn't find your rider profile.", 404);
    const payload = body<{ status: 'ONLINE' | 'OFFLINE' | 'BUSY' }>(ctx);
    rider.status = payload.status;
    emit(payload.status === 'ONLINE' ? Events.riderOnline : Events.riderOffline, 'rider', rider.id, {
      rider_id: rider.id,
      status: payload.status,
    });
    if (payload.status === 'ONLINE') {
      createOfferForRider(db, rider.id);
      setTimeout(() => {
        if (rider.status === 'ONLINE') createOfferForRider(db, rider.id);
      }, 18000);
    }
    return rider;
  }

  if (key === 'GET /riders/offers') {
    const user = requireRole(ctx, 'RIDER');
    const rider = db.riders.find((rdr) => rdr.user_id === user.id);
    if (!rider) return [];
    return db.offers
      .filter((o) => o.status === 'PENDING' && Date.parse(o.expires_at) > Date.now())
      .map((o) => {
        const d = db.deliveries.find((x) => x.id === o.delivery_id);
        if (!d) return null;
        return {
          id: o.id,
          delivery_id: d.id,
          pickup_addr: d.pickup.addr ?? '',
          dropoff_addr: d.dropoff.addr ?? '',
          distance_km: d.distance_km,
          earnings_minor: Math.round(d.price_minor * 0.8),
          currency: d.currency,
          package_type: d.package_type,
          customer_rating: 4.7,
          expires_at: o.expires_at,
        };
      })
      .filter(Boolean);
  }

  if (r('POST /riders/offers/:id/accept')) {
    const user = requireRole(ctx, 'RIDER');
    const { id } = r('POST /riders/offers/:id/accept')!;
    const rider = db.riders.find((rdr) => rdr.user_id === user.id);
    const offer = db.offers.find((o) => o.id === id);
    if (!offer || offer.status !== 'PENDING') throw new ApiError('This request is no longer available.', 409);
    if (Date.parse(offer.expires_at) < Date.now()) {
      offer.status = 'EXPIRED';
      throw new ApiError('This request expired before you accepted it.', 409);
    }
    const delivery = findDelivery(offer.delivery_id);
    if (delivery.rider_id) throw new ApiError('Another rider already accepted this delivery.', 409);
    offer.status = 'ACCEPTED';
    delivery.rider_id = rider?.id ?? null;
    clearDeliveryTimers(delivery.id);
    applyStatus(db, delivery.id, 'RIDER_ASSIGNED', 'Rider accepted');
    let conversation = conversationForDelivery(delivery.id);
    if (!conversation) {
      conversation = {
        id: makeId('conv'),
        delivery_id: delivery.id,
        title: db.users.find((u) => u.id === delivery.customer_id)?.name ?? 'Customer',
        participant: null,
        last_message: null,
        unread_count: 0,
        updated_at: nowIso(),
      };
      db.conversations.unshift(conversation);
    }
    if (rider) notify(db, rider.id, 'rider.assigned', 'Delivery accepted', `Head to ${delivery.pickup.addr} for pickup.`, { delivery_id: delivery.id });
    return hydrateDelivery(db, delivery);
  }

  if (r('POST /riders/offers/:id/reject')) {
    requireRole(ctx, 'RIDER');
    const { id } = r('POST /riders/offers/:id/reject')!;
    const offer = db.offers.find((o) => o.id === id);
    if (offer) offer.status = 'REJECTED';
    return { ok: true };
  }

  if (key === 'GET /riders/earnings') {
    const user = requireRole(ctx, 'RIDER');
    const rider = db.riders.find((rdr) => rdr.user_id === user.id);
    const riderId = rider?.id;
    const mine = db.deliveries.filter((d) => d.rider_id === riderId && d.status === 'DELIVERED');
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = Date.now() - 7 * 86400_000;
    const monthStart = Date.now() - 30 * 86400_000;
    const earned = (d: Delivery) => Math.round(d.price_minor * 0.8);
    const isToday = (d: Delivery) => !!d.delivered_at && Date.parse(d.delivered_at) >= todayStart.getTime();
    const seedBonus = riderId === 'r_rider_1' ? 8 : 0;
    return {
      today_minor: mine.filter(isToday).reduce((sum, d) => sum + earned(d), 0) + 124000 * seedBonus,
      week_minor: mine.filter((d) => d.delivered_at && Date.parse(d.delivered_at) >= weekStart).reduce((sum, d) => sum + earned(d), 0) + 842000 * seedBonus,
      month_minor: mine.filter((d) => d.delivered_at && Date.parse(d.delivered_at) >= monthStart).reduce((sum, d) => sum + earned(d), 0) + 3150000 * seedBonus,
      deliveries_today: mine.filter(isToday).length + seedBonus,
      deliveries_week: mine.filter((d) => d.delivered_at && Date.parse(d.delivered_at) >= weekStart).length + seedBonus,
      currency: 'INR',
    };
  }

  if (key === 'GET /riders/deliveries') {
    const user = requireRole(ctx, 'RIDER');
    const riderId = myRiderId(user);
    const items = db.deliveries
      .filter((d) => d.rider_id === riderId)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((d) => hydrateDelivery(db, d));
    return paginate(items, ctx);
  }

  // ---------- conversations & messages ----------
  if (key === 'GET /conversations') {
    const user = requireUser(ctx);
    const deliveryId = param(ctx, 'delivery_id');
    const riderId = myRiderId(user);
    let items = db.conversations.filter((c) => {
      const delivery = c.delivery_id ? db.deliveries.find((d) => d.id === c.delivery_id) : undefined;
      if (!delivery) return false;
      return delivery.customer_id === user.id || delivery.rider_id === riderId;
    });
    if (deliveryId) items = items.filter((c) => c.delivery_id === deliveryId);
    return items.map((c) => ({ ...c, unread_count: (db.messages[c.id] ?? []).filter((m) => !m.read_at && m.sender_id !== user.id).length }));
  }

  if (r('GET /conversations/:id/messages')) {
    const { id } = r('GET /conversations/:id/messages')!;
    const messages = db.messages[id] ?? [];
    return messages;
  }

  if (r('POST /conversations/:id/messages')) {
    const user = requireUser(ctx);
    const { id } = r('POST /conversations/:id/messages')!;
    const payload = body<{ body: string }>(ctx);
    if (!payload.body?.trim()) throw new ApiError('Message cannot be empty.', 422);
    const conversation = db.conversations.find((c) => c.id === id);
    if (!conversation) throw new ApiError("We couldn't find that conversation.", 404);
    const message: Message = {
      id: makeId('msg'),
      conversation_id: id,
      sender_id: user.id,
      body: payload.body.trim(),
      created_at: nowIso(),
      delivery_status: 'sent',
    };
    db.messages[id] = [...(db.messages[id] ?? []), message];
    conversation.last_message = message;
    conversation.updated_at = message.created_at;
    emit(Events.chatMessageCreated, 'conversation', id, message);
    return message;
  }

  if (r('POST /conversations/:id/read')) {
    const user = requireUser(ctx);
    const { id } = r('POST /conversations/:id/read')!;
    (db.messages[id] ?? []).forEach((m) => {
      if (m.sender_id !== user.id) m.read_at = nowIso();
    });
    return { ok: true };
  }

  // ---------- notifications ----------
  if (key === 'GET /notifications') {
    const user = requireUser(ctx);
    const items = db.notifications.filter((n) => n.user_id === user.id);
    return paginate(items, ctx);
  }

  if (key === 'GET /notifications/unread-count') {
    const user = requireUser(ctx);
    return { count: unreadCount(user.id) };
  }

  if (r('POST /notifications/:id/read')) {
    const user = requireUser(ctx);
    const { id } = r('POST /notifications/:id/read')!;
    const notification = db.notifications.find((n) => n.id === id);
    if (notification && notification.user_id === user.id) {
      notification.read_at = nowIso();
      emit(Events.notificationRead, 'notification', id, { id, user_id: user.id });
    }
    return { ok: true };
  }

  if (key === 'POST /notifications/read-all') {
    const user = requireUser(ctx);
    db.notifications.forEach((n) => {
      if (n.user_id === user.id && !n.read_at) n.read_at = nowIso();
    });
    return { ok: true };
  }

  // ---------- locations ----------
  if (key === 'GET /locations/search') {
    const q = (param(ctx, 'q') ?? '').toLowerCase().trim();
    if (!q) return searchPlaces;
    return searchPlaces.filter((p) => p.title.toLowerCase().includes(q) || (p.subtitle ?? '').toLowerCase().includes(q));
  }

  if (key === 'GET /locations/saved') {
    const user = requireUser(ctx);
    return (db.savedAddresses[user.id] ?? []) as SavedAddress[];
  }

  if (key === 'POST /locations/saved') {
    const user = requireUser(ctx);
    const payload = body<SavedAddress>(ctx);
    const address: SavedAddress = { id: makeId('addr'), label: payload.label, address: payload.address, lat: payload.lat, lng: payload.lng };
    db.savedAddresses[user.id] = [...(db.savedAddresses[user.id] ?? []), address];
    return address;
  }

  if (r('POST /locations/saved/:id/delete')) {
    const user = requireUser(ctx);
    const { id } = r('POST /locations/saved/:id/delete')!;
    db.savedAddresses[user.id] = (db.savedAddresses[user.id] ?? []).filter((a) => a.id !== id);
    return { ok: true };
  }

  // ---------- support ----------
  if (key === 'GET /support/tickets') {
    const user = requireUser(ctx);
    const items = (user.roles.includes('SUPPORT') || user.roles.includes('ADMIN')
      ? db.tickets
      : db.tickets.filter((t) => t.customer_id === user.id)
    ).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return paginate(items, ctx);
  }

  if (key === 'POST /support/tickets') {
    const user = requireUser(ctx);
    const payload = body<{ subject: string; category?: string; body: string; delivery_id?: string }>(ctx);
    if (!payload.subject?.trim() || !payload.body?.trim()) throw new ApiError('Please add a subject and description.', 422);
    const ticket = {
      id: makeId('tkt'),
      reference: `SUP-${100 + db.tickets.length}`,
      subject: payload.subject.trim(),
      status: 'OPEN' as const,
      priority: 'MEDIUM' as const,
      category: payload.category ?? 'general',
      delivery_id: payload.delivery_id ?? null,
      customer_id: user.id,
      created_at: nowIso(),
      updated_at: nowIso(),
      last_message: payload.body.trim(),
      unread_count: 0,
    };
    db.tickets.unshift(ticket);
    db.ticketMessages[ticket.id] = [
      { id: makeId('tm'), ticket_id: ticket.id, sender_id: user.id, sender_name: user.name, body: payload.body.trim(), created_at: nowIso() },
    ];
    emit(Events.supportTicketCreated, 'ticket', ticket.id, { ticket_id: ticket.id });
    return ticket;
  }

  if (r('GET /support/tickets/:id')) {
    const user = requireUser(ctx);
    const { id } = r('GET /support/tickets/:id')!;
    const ticket = db.tickets.find((t) => t.id === id);
    if (!ticket) throw new ApiError("We couldn't find that ticket.", 404);
    if (ticket.customer_id !== user.id && !user.roles.some((role) => role === 'SUPPORT' || role === 'ADMIN')) {
      throw new ApiError("You don't have permission to view this ticket.", 403);
    }
    return ticket;
  }

  if (r('GET /support/tickets/:id/messages')) {
    requireUser(ctx);
    const { id } = r('GET /support/tickets/:id/messages')!;
    return db.ticketMessages[id] ?? [];
  }

  if (r('POST /support/tickets/:id/messages')) {
    const user = requireUser(ctx);
    const { id } = r('POST /support/tickets/:id/messages')!;
    const payload = body<{ body: string }>(ctx);
    if (!payload.body?.trim()) throw new ApiError('Message cannot be empty.', 422);
    const ticket = db.tickets.find((t) => t.id === id);
    if (!ticket) throw new ApiError("We couldn't find that ticket.", 404);
    const message = {
      id: makeId('tm'),
      ticket_id: id,
      sender_id: user.id,
      sender_name: user.name,
      body: payload.body.trim(),
      is_internal: false,
      created_at: nowIso(),
    };
    db.ticketMessages[id] = [...(db.ticketMessages[id] ?? []), message];
    ticket.last_message = message.body;
    ticket.updated_at = message.created_at;
    emit(Events.supportTicketUpdated, 'ticket', id, { ticket_id: id });
    return message;
  }

  // ---------- admin ----------
  if (key === 'GET /admin/overview') {
    requireRole(ctx, 'ADMIN');
    const active = db.deliveries.filter((d) => !['DELIVERED', 'CANCELLED', 'FAILED'].includes(d.status));
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const today = db.deliveries.filter((d) => Date.parse(d.created_at) >= todayStart.getTime());
    return {
      active_deliveries: active.length,
      today_deliveries: today.length + 24,
      online_riders: db.riders.filter((rdr) => rdr.status === 'ONLINE').length,
      pending_issues: db.tickets.filter((t) => t.status === 'OPEN').length,
      revenue_minor: db.deliveries.filter((d) => d.status === 'DELIVERED').reduce((sum, d) => sum + d.price_minor, 0) + 1845000,
      currency: 'INR',
    };
  }

  if (key === 'GET /admin/users') {
    requireRole(ctx, 'ADMIN');
    const q = (param(ctx, 'q') ?? '').toLowerCase();
    const items = db.users
      .filter((u) => !q || u.name.toLowerCase().includes(q) || u.phone.includes(q))
      .map((u) => ({ ...userFromMock(u), is_active: u.is_active }));
    return paginate(items, ctx);
  }

  if (key === 'GET /admin/riders') {
    requireRole(ctx, 'ADMIN');
    const q = (param(ctx, 'q') ?? '').toLowerCase();
    const items = db.riders
      .filter((rdr) => !q || rdr.name.toLowerCase().includes(q))
      .map((rdr) => ({
        id: rdr.id,
        name: rdr.name,
        rating: rdr.rating ?? 0,
        vehicle_type: rdr.vehicle_type,
        license_plate: rdr.license_plate,
        status: rdr.status,
        is_verified: rdr.is_verified,
        is_suspended: rdr.is_suspended,
      }));
    return paginate(items, ctx);
  }

  if (r('PATCH /admin/riders/:id')) {
    requireRole(ctx, 'ADMIN');
    const { id } = r('PATCH /admin/riders/:id')!;
    const rider = db.riders.find((rdr) => rdr.id === id);
    if (!rider) throw new ApiError("We couldn't find that rider.", 404);
    const payload = body<{ is_verified?: boolean; is_suspended?: boolean }>(ctx);
    if (payload.is_verified !== undefined) rider.is_verified = payload.is_verified;
    if (payload.is_suspended !== undefined) rider.is_suspended = payload.is_suspended;
    return { ok: true };
  }

  if (key === 'GET /admin/deliveries' || key === 'GET /admin/issues') {
    requireRole(ctx, 'ADMIN');
    const q = (param(ctx, 'q') ?? '').toLowerCase();
    const status = param(ctx, 'status');
    let items = [...db.deliveries];
    if (key === 'GET /admin/issues') items = items.filter((d) => ['CANCELLED', 'FAILED'].includes(d.status));
    if (status) items = items.filter((d) => d.status === status);
    if (q) items = items.filter((d) => (d.reference ?? '').toLowerCase().includes(q) || (d.pickup.addr ?? '').toLowerCase().includes(q));
    items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return paginate(items.map((d) => hydrateDelivery(db, d)), ctx);
  }

  if (r('POST /admin/deliveries/:id/assign')) {
    requireRole(ctx, 'ADMIN');
    const { id } = r('POST /admin/deliveries/:id/assign')!;
    const delivery = findDelivery(id);
    const payload = body<{ rider_id: string }>(ctx);
    const rider = db.riders.find((rdr) => rdr.id === payload.rider_id);
    if (!rider) throw new ApiError("We couldn't find that rider.", 404);
    delivery.rider_id = rider.id;
    clearDeliveryTimers(delivery.id);
    if (delivery.status === 'SEARCHING_RIDER' || delivery.status === 'CREATED') {
      if (delivery.status === 'CREATED') applyStatus(db, delivery.id, 'SEARCHING_RIDER');
      applyStatus(db, delivery.id, 'RIDER_ASSIGNED', `${rider.name} assigned by admin`);
    }
    notify(db, rider.id, 'admin.assigned', 'Delivery assigned', `You've been assigned ${delivery.reference}.`, { delivery_id: delivery.id });
    return hydrateDelivery(db, delivery);
  }

  if (r('POST /admin/deliveries/:id/cancel')) {
    requireRole(ctx, 'ADMIN');
    const { id } = r('POST /admin/deliveries/:id/cancel')!;
    const delivery = findDelivery(id);
    const payload = body<{ reason?: string }>(ctx);
    const result = applyStatus(db, delivery.id, 'CANCELLED', payload.reason ?? 'Cancelled by admin');
    if (!result) throw new ApiError('This delivery can no longer be cancelled.', 409);
    clearDeliveryTimers(delivery.id);
    return hydrateDelivery(db, delivery);
  }

  // ---------- sync ----------
  if (key === 'GET /sync') {
    const user = requireUser(ctx);
    const riderId = myRiderId(user);
    return {
      notifications: db.notifications.filter((n) => n.user_id === user.id).slice(0, 50),
      deliveries: myDeliveries(user)
        .filter((d) => !['DELIVERED', 'CANCELLED', 'FAILED'].includes(d.status))
        .map((d) => hydrateDelivery(db, d)),
      events: recentEnvelopes().slice(-40),
      unread_count: unreadCount(user.id),
      rider_status: riderId ? db.riders.find((rdr) => rdr.id === riderId)?.status ?? 'OFFLINE' : undefined,
    };
  }

  throw new ApiError(`No mock implementation for ${method} ${path}.`, 404);
};

function findUserByPhoneLoose(phone: string): MockUser | undefined {
  const normalized = phone.replace(/\D/g, '');
  return db.users.find((u) => u.phone.replace(/\D/g, '') === normalized);
}

let installed = false;

export const installMockBackend = (): void => {
  if (installed) return;
  installed = true;
  registerMockHandler(mock);
};

export const uninstallMockBackend = (): void => {
  installed = false;
  registerMockHandler(null);
};
