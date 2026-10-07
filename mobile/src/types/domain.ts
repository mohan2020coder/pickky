export type Role = 'CUSTOMER' | 'RIDER' | 'ADMIN' | 'SUPPORT';

export type DeliveryStatus =
  | 'DRAFT'
  | 'CREATED'
  | 'SEARCHING_RIDER'
  | 'RIDER_ASSIGNED'
  | 'RIDER_ARRIVING_PICKUP'
  | 'RIDER_ARRIVED_PICKUP'
  | 'PICKUP_VERIFICATION'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'NEAR_DESTINATION'
  | 'DELIVERY_VERIFICATION'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED';

export type RiderStatus = 'OFFLINE' | 'ONLINE' | 'BUSY';

export type GeoPoint = {
  lat: number;
  lng: number;
  addr?: string;
  postcode?: string;
};

export type User = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  roles: Role[];
  created_at?: string;
};

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export type AuthSession = {
  user: User;
  tokens: TokenPair;
};

export type DeliveryItem = {
  id?: string;
  description: string;
  quantity: number;
  weight_kg?: number | null;
  fragile?: boolean;
};

export type StatusHistoryEntry = {
  id?: string;
  status: DeliveryStatus;
  note?: string | null;
  created_at: string;
};

export type RiderSummary = {
  id: string;
  name: string;
  rating?: number | null;
  vehicle_type?: string | null;
  license_plate?: string | null;
  photo_url?: string | null;
};

export type Delivery = {
  id: string;
  reference?: string;
  customer_id: string;
  rider_id?: string | null;
  status: DeliveryStatus;
  pickup: GeoPoint;
  dropoff: GeoPoint;
  instructions?: string | null;
  price_minor: number;
  currency: string;
  distance_km: number;
  eta_minutes?: number | null;
  pickup_otp?: string | null;
  delivery_otp?: string | null;
  pickup_verified_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  status_changed_at?: string;
  created_at: string;
  updated_at?: string;
  items: DeliveryItem[];
  status_history: StatusHistoryEntry[];
  rider?: RiderSummary | null;
  package_type?: string | null;
};

export type QuoteBreakdownLine = {
  label: string;
  amount_minor: number;
};

export type Quote = {
  distance_km: number;
  eta_minutes: number;
  price_minor: number;
  currency: string;
  breakdown: QuoteBreakdownLine[];
};

export type NotificationRecord = {
  id: string;
  user_id?: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  read_at?: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at?: string | null;
  created_at: string;
  delivery_status?: 'sending' | 'sent' | 'failed';
};

export type Conversation = {
  id: string;
  delivery_id?: string | null;
  title?: string | null;
  participant?: RiderSummary | User | null;
  last_message?: Message | null;
  unread_count?: number;
  updated_at?: string;
};

export type RiderProfile = {
  id: string;
  user_id: string;
  status: RiderStatus;
  vehicle_type?: string | null;
  license_plate?: string | null;
  is_verified?: boolean;
  is_suspended?: boolean;
  rating?: number;
  earnings_minor?: number;
  completed_deliveries?: number;
};

export type EarningsSummary = {
  today_minor: number;
  week_minor: number;
  month_minor: number;
  deliveries_today: number;
  deliveries_week: number;
  currency: string;
};

export type SupportTicket = {
  id: string;
  customer_id?: string;
  reference?: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  category?: string | null;
  delivery_id?: string | null;
  created_at: string;
  updated_at?: string;
  last_message?: string | null;
  unread_count?: number;
};

export type TicketMessage = {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_name?: string | null;
  body: string;
  is_internal?: boolean;
  created_at: string;
};

export type SavedAddress = {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
};

export type SearchResult = {
  id: string;
  title: string;
  subtitle?: string | null;
  lat: number;
  lng: number;
};

export type Paginated<T> = {
  data: T[];
  meta: { page: number; limit: number; total: number };
};

export type AdminOverview = {
  active_deliveries: number;
  today_deliveries: number;
  online_riders: number;
  pending_issues: number;
  revenue_minor: number;
  currency: string;
};

export type AdminUserRow = User & { is_active?: boolean; status?: string };
