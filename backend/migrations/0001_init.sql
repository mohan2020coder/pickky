CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  password VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- roles
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(30) UNIQUE NOT NULL,
  description VARCHAR(255)
);

-- permissions
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,
  description VARCHAR(255)
);

-- user_roles
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token VARCHAR(500) NOT NULL,
  user_agent VARCHAR(255),
  ip VARCHAR(45),
  revoked_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- riders
CREATE TABLE IF NOT EXISTS riders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'OFFLINE',
  vehicle_type VARCHAR(30),
  license_plate VARCHAR(20),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  last_location_at TIMESTAMP,
  is_verified BOOLEAN DEFAULT FALSE,
  is_suspended BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_riders_status ON riders(status);

-- rider_documents
CREATE TABLE IF NOT EXISTS rider_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  file_url VARCHAR(255) NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- rider_vehicles
CREATE TABLE IF NOT EXISTS rider_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  license_plate VARCHAR(20) NOT NULL,
  color VARCHAR(30),
  year INT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- deliveries
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rider_id UUID REFERENCES users(id),
  status VARCHAR(40) NOT NULL,
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  pickup_addr VARCHAR(255),
  dropoff_lat DOUBLE PRECISION,
  dropoff_lng DOUBLE PRECISION,
  dropoff_addr VARCHAR(255),
  instructions VARCHAR(500),
  reference VARCHAR(20) UNIQUE,
  package_type VARCHAR(30),
  price_minor BIGINT NOT NULL,
  distance_km DOUBLE PRECISION,
  pickup_otp VARCHAR(10),
  delivery_otp VARCHAR(10),
  pickup_verified_at TIMESTAMP,
  delivered_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancel_reason VARCHAR(255),
  status_changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_customer ON deliveries(customer_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_rider ON deliveries(rider_id);

-- delivery_items
CREATE TABLE IF NOT EXISTS delivery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  quantity INT DEFAULT 1,
  weight_kg DOUBLE PRECISION,
  fragile BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- delivery_status_history
CREATE TABLE IF NOT EXISTS delivery_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  status VARCHAR(40) NOT NULL,
  note VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- delivery_assignments
CREATE TABLE IF NOT EXISTS delivery_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  rider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  offered_at TIMESTAMP,
  expires_at TIMESTAMP,
  responded_at TIMESTAMP,
  accepted BOOLEAN,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(40) NOT NULL,
  title VARCHAR(120) NOT NULL,
  message VARCHAR(500) NOT NULL,
  data JSONB,
  read_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- notification_preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- conversation_participants
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- message_reads
CREATE TABLE IF NOT EXISTS message_reads (
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

-- payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  amount_minor BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  method VARCHAR(20),
  status VARCHAR(20) NOT NULL,
  reference VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  captured_at TIMESTAMP,
  failed_at TIMESTAMP
);

-- payment_attempts
CREATE TABLE IF NOT EXISTS payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  amount_minor BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL,
  raw_response TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- refunds
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  amount_minor BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- ratings
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stars INT NOT NULL,
  comment VARCHAR(500),
  tags JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- support_tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES users(id),
  delivery_id UUID REFERENCES deliveries(id),
  subject VARCHAR(120) NOT NULL,
  reference VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  priority VARCHAR(20),
  category VARCHAR(40),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP,
  closed_at TIMESTAMP
);

-- support_messages
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- support_notes
CREATE TABLE IF NOT EXISTS support_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- saved_addresses
CREATE TABLE IF NOT EXISTS saved_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(60) NOT NULL,
  address VARCHAR(255) NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saved_addresses_user ON saved_addresses(user_id);

-- service_zones
CREATE TABLE IF NOT EXISTS service_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  polygon JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- pricing_rules
CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  base_minor BIGINT NOT NULL,
  per_km_minor BIGINT NOT NULL,
  service_zone_id UUID REFERENCES service_zones(id),
  active_from TIMESTAMP NOT NULL DEFAULT NOW(),
  active_to TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(40),
  entity_id UUID,
  ip VARCHAR(45),
  user_agent VARCHAR(255),
  details JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
