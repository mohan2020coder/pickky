PICKKY — USP

Core idea:
Pickky is the app that gets things for you.

Instead of positioning Pickky as just another courier/delivery service, position it as a “Do-It-For-Me” platform.

🎯 Main USP

“You need it. Pickky gets it.”

A customer doesn't need to think about which delivery service to use. They simply tell Pickky what they need picked up, where it is, and where it needs to go.

What makes Pickky different

1. Anything pickup
Not limited to restaurants or e-commerce.

Documents
Keys
Forgotten items
Parcels
Groceries
Clothes
Medicines from a store
Gifts
Office items
Local purchases
Returns

2. “Get this for me” model

The user can create a request like:

"Pick up my documents from this office and bring them home."

or

"Go to this shop, collect my order and bring it to me."

This makes Pickky more of an on-demand personal errand platform than a traditional delivery app.

3. Real-time pickup experience

The customer sees:

Request Created → Rider Assigned → Going to Pickup → Arrived → Picked Up → On the Way → Delivered

with live location and in-app notifications.

4. One app, many use cases

Instead of:

Food → food delivery app
Package → courier app
Store pickup → another app
Forgotten item → ask a friend

Pickky becomes:

“Whatever you need picked up, Pickky it.”


# Build a Production-Ready On-Demand Pickup & Delivery Mobile Application

Build a complete mobile-only on-demand pickup and delivery marketplace.

The application allows users to request pickup and delivery of items from one location to another.

Example:

> "Pick up my laptop charger from my friend's house and deliver it to my office."

The system must support:

* Customers
* Delivery Partners / Riders
* Admins
* Support Staff

All roles use the SAME React Native application.

There must be:

* NO separate web admin panel
* NO separate rider application
* NO Firebase Cloud Messaging
* NO FCM

Admin and support functionality must be available inside the same mobile application through role-based access.

---

# 1. TECHNOLOGY STACK

## Mobile

Use:

* React Native
* TypeScript
* React Navigation
* TanStack Query
* Zustand or equivalent lightweight state management
* Zod
* Secure platform storage
* WebSocket client
* Native location APIs
* Camera/image picker

---

# 2. BACKEND

Use:

* Go
* PostgreSQL (gorm)
* Redis
* WebSockets
* REST APIs

Architecture:

```text
React Native
     |
     | HTTPS / REST
     |
     v
Go Backend
     |
     +-------------------+
     |                   |
     v                   v
PostgreSQL             Redis
                         |
                         |
                    Redis Pub/Sub
                         |
                         v
                    WebSocket Hub
                         |
                         v
                    Mobile Clients
```

Use a modular monolith.

DO NOT build microservices initially.

---

# 3. REDIS IS A CORE SYSTEM COMPONENT

Redis must NOT be treated as an optional cache.

Use Redis as a core real-time infrastructure component.

Redis responsibilities:

1. WebSocket event distribution
2. Redis Pub/Sub
3. Rider online/offline presence
4. Active rider state
5. Delivery live tracking state
6. Temporary location storage
7. Distributed locks
8. Rate limiting
9. Short-lived cache
10. Assignment coordination
11. Real-time notification fan-out
12. WebSocket connection coordination
13. Temporary TTL-based data

PostgreSQL remains the permanent source of truth.

---

# 4. REDIS DATA MODEL

Use clear Redis key conventions.

Examples:

```text
presence:user:{user_id}

presence:rider:{rider_id}

delivery:{delivery_id}:location

delivery:{delivery_id}:active

delivery:{delivery_id}:rider

delivery:{delivery_id}:status

delivery:{delivery_id}:viewers

ws:user:{user_id}

ws:delivery:{delivery_id}

rate_limit:{identifier}

lock:delivery:{delivery_id}

lock:rider:{rider_id}
```

Use TTL where appropriate.

Do not allow temporary Redis data to become the only copy of critical business data.

---

# 5. REDIS RIDER PRESENCE

When rider goes online:

```text
Rider App
   |
   | WebSocket
   v
Go WebSocket Server
   |
   v
Redis
```

Store rider presence with TTL.

Example concept:

```text
presence:rider:{rider_id}
```

with:

```text
status = ONLINE
last_seen = timestamp
```

Use a heartbeat to refresh TTL.

Example:

```text
Rider heartbeat
      |
      v
Redis TTL refreshed
```

If heartbeat expires:

```text
ONLINE
  ↓
STALE
  ↓
OFFLINE
```

Do not rely exclusively on the mobile application telling the server that it went offline.

The server must detect disconnected/stale riders.

---

# 6. REDIS RIDER LOCATION

During an active delivery, rider location should be stored temporarily in Redis.

Example:

```text
delivery:{delivery_id}:location
```

Store:

```text
latitude
longitude
accuracy
heading
speed
timestamp
```

Use TTL.

Do NOT write every GPS update directly to PostgreSQL.

This would create unnecessary database load.

Instead:

```text
Rider
  |
  | location update
  v
Go
  |
  +--> Redis
  |
  +--> WebSocket broadcast
```

Persist only appropriate location history to PostgreSQL if required for operational/audit purposes.

---

# 7. REAL-TIME LOCATION FLOW

Example:

```text
Rider Mobile
     |
     | GPS
     v
Go WebSocket/API
     |
     +-----------> Redis
     |
     +-----------> WebSocket Hub
                          |
             +------------+------------+
             |                         |
             v                         v
       Customer App              Admin App
```

Customer should see the rider moving without refreshing the screen.

---

# 8. REDIS PUB/SUB

Use Redis Pub/Sub to distribute real-time events between backend instances.

Example:

```text
Go Server A
     |
     | publish
     v
Redis Pub/Sub
     |
     +----------+
     |          |
     v          v
Go Server B  Go Server C
```

Channels:

```text
events:delivery
events:rider
events:notification
events:chat
events:support
events:system
```

Example event:

```json
{
  "event": "delivery.status_changed",
  "event_id": "uuid",
  "delivery_id": "uuid",
  "timestamp": "2026-10-03T10:30:00Z",
  "data": {
    "status": "PICKED_UP"
  }
}
```

---

# 9. IMPORTANT REDIS RULE

Redis Pub/Sub is NOT the permanent event store.

If a WebSocket server is disconnected when a Pub/Sub event is published, that event can be missed.

Therefore:

```text
Business operation
      |
      v
PostgreSQL transaction
      |
      v
Persist important event/notification
      |
      v
Redis Pub/Sub
      |
      v
WebSocket
```

For important events, the database remains the recovery source.

When the client reconnects:

```text
WebSocket reconnect
        |
        v
GET /api/v1/sync
        |
        v
PostgreSQL
        |
        v
Recover missed state/events
```

---

# 10. REAL-TIME EVENT ARCHITECTURE

Create an internal Go event system.

Example:

```text
DeliveryService
      |
      v
Event Publisher
      |
      +--------------------+
      |                    |
      v                    v
PostgreSQL             Redis Pub/Sub
                           |
                           v
                     WebSocket Hub
                           |
                           v
                     Mobile Clients
```

Business services must NOT directly manipulate WebSocket connections.

They should publish domain events.

---

# 11. WEBSOCKET SERVER

Implement a dedicated WebSocket package/module:

```text
internal/websocket/
```

Responsibilities:

* connection management
* authentication
* heartbeat
* reconnect support
* subscription management
* delivery rooms
* user rooms
* event delivery
* connection cleanup
* authorization

Example endpoint:

```text
wss://api.example.com/ws
```

Every connection must be authenticated.

Never trust:

```text
user_id
role
delivery_id
```

from the client without server-side authorization.

---

# 12. WEBSOCKET ROOMS

Support:

```text
user:{user_id}

delivery:{delivery_id}

conversation:{conversation_id}

admin

support
```

Example:

```text
delivery:DLV-123
```

Only authorized users may subscribe.

Customer:

```text
Customer
   ↓
delivery:DLV-123
```

Rider:

```text
Rider
   ↓
delivery:DLV-123
```

Admin/support access must be permission-controlled.

---

# 13. WEBSOCKET HEARTBEAT

Implement ping/pong.

Example:

```text
Client
   |
   | ping
   v
Server
   |
   | pong
   v
Client
```

Maintain:

```text
last_seen
```

in Redis where appropriate.

If connection becomes stale:

```text
WebSocket
   ↓
disconnect
   ↓
Redis presence expires
```

---

# 14. WEBSOCKET RECONNECT

React Native must automatically reconnect.

Use:

```text
1 sec
2 sec
4 sec
8 sec
16 sec
...
```

with a maximum backoff.

After reconnect:

```text
WebSocket connected
       |
       v
Authenticate
       |
       v
Restore subscriptions
       |
       v
GET /sync
       |
       v
Recover current state
```

Do not simply reload the entire application.

---

# 15. REAL-TIME DELIVERY STATE

Delivery state is controlled by the backend.

States:

```text
DRAFT
CREATED
SEARCHING_RIDER
RIDER_ASSIGNED
RIDER_ARRIVING_PICKUP
RIDER_ARRIVED_PICKUP
PICKUP_VERIFICATION
PICKED_UP
IN_TRANSIT
NEAR_DESTINATION
DELIVERY_VERIFICATION
DELIVERED
CANCELLED
FAILED
```

Every state transition must be validated server-side.

Example:

```text
SEARCHING_RIDER
       ↓
RIDER_ASSIGNED
       ↓
RIDER_ARRIVING_PICKUP
       ↓
RIDER_ARRIVED_PICKUP
       ↓
PICKUP_VERIFICATION
       ↓
PICKED_UP
       ↓
IN_TRANSIT
       ↓
NEAR_DESTINATION
       ↓
DELIVERY_VERIFICATION
       ↓
DELIVERED
```

---

# 16. DELIVERY STATE + REDIS

For fast real-time access:

```text
delivery:{delivery_id}:status
```

may be maintained in Redis.

However, PostgreSQL remains the authoritative persistent state.

When a status changes:

```text
Go Service
   |
   +--> PostgreSQL transaction
   |
   +--> Redis update
   |
   +--> Redis Pub/Sub event
   |
   +--> WebSocket broadcast
   |
   +--> Persist notification
```

Ensure operations are idempotent.

---

# 17. CUSTOMER REAL-TIME EXPERIENCE

Customer should see:

```text
Searching for delivery partner...
```

Then automatically:

```text
Raj accepted your delivery
```

Then:

```text
Raj is arriving
```

Then:

```text
Raj has arrived at pickup
```

Then:

```text
Item picked up
```

Then:

```text
Delivery in progress
```

Then:

```text
Raj is near your destination
```

Then:

```text
Delivery completed
```

No manual refresh.

---

# 18. IN-APP NOTIFICATIONS

Do NOT use FCM.

Do NOT use Firebase Cloud Messaging.

Notifications are persisted in PostgreSQL.

Redis is used for real-time notification fan-out.

Architecture:

```text
Business Event
      |
      v
PostgreSQL
      |
      v
Redis Pub/Sub
      |
      v
WebSocket
      |
      v
React Native
      |
      +--> Notification Center
      |
      +--> Unread Badge
      |
      +--> In-App Banner
```

Table:

```text
notifications
```

Fields:

```text
id
user_id
type
title
message
data
read_at
created_at
```

---

# 19. NOTIFICATION CENTER

Create:

```text
Notifications
```

Screen.

Features:

* unread count
* mark read
* mark all read
* notification history
* notification filtering
* deep linking
* real-time insertion

Example:

```text
Notifications

● Rider Assigned
  Raj accepted your delivery
  2 min ago

● Item Picked Up
  Your item has been picked up
  15 min ago

○ Delivery Completed
  Delivery #DLV-123 completed
  Yesterday
```

---

# 20. BACKGROUND / TERMINATED APP LIMITATION

Do NOT pretend WebSockets can wake a completely terminated mobile application.

The architecture must distinguish:

### App active

```text
WebSocket
```

### App temporarily disconnected

```text
Reconnect
+
Sync API
```

### App terminated

OS-level notification delivery requires a platform notification mechanism.

For this project:

DO NOT implement FCM.

Do not add Firebase.

Design the notification service behind an interface so another provider can be introduced later if required.

---

# 21. REDIS DISTRIBUTED LOCKS

Use Redis locks where concurrent operations could cause duplicate assignments.

Example:

```text
lock:delivery:{delivery_id}
```

When assigning a rider:

```text
Acquire lock
      |
      v
Check delivery state
      |
      v
Assign rider
      |
      v
Update PostgreSQL
      |
      v
Publish event
      |
      v
Release lock
```

This prevents two backend instances from assigning the same delivery simultaneously.

Do not hold locks longer than necessary.

Use TTL on locks.

---

# 22. RIDER ASSIGNMENT

Initial matching:

```text
Find online riders
       ↓
Filter by service area
       ↓
Filter by vehicle
       ↓
Calculate distance
       ↓
Rank riders
       ↓
Offer delivery
       ↓
Wait for response
       ↓
Accept
       OR
       ↓
Try next rider
```

Use Redis presence to quickly find online riders.

Do not query PostgreSQL for every rider location update.

---

# 23. RIDER OFFER

When a delivery is offered:

```text
Go Backend
    |
    v
Redis
    |
    v
WebSocket
    |
    v
Rider App
```

Rider sees:

```text
New Delivery

Pickup:
Koramangala

Drop:
HSR Layout

Distance:
8.2 km

Estimated earning:
₹95

[ ACCEPT ] [ REJECT ]
```

Acceptance must be confirmed by the server.

---

# 24. CHAT

Customer and rider can communicate through in-app chat.

Architecture:

```text
Sender
  |
  v
Go API
  |
  +--> PostgreSQL
  |
  +--> Redis Pub/Sub
           |
           v
       WebSocket
           |
           v
       Receiver
```

Persist every message in PostgreSQL.

Redis is only the real-time transport.

Features:

* text messages
* timestamps
* read status
* delivery-linked conversations
* reconnect recovery
* report conversation

---

# 25. ADMIN INSIDE MOBILE APP

Admin uses the same application.

Admin home:

```text
Today's Deliveries
Active Deliveries
Available Riders
Online Riders
Pending Issues
Support Tickets
Revenue
```

Admin capabilities:

* view deliveries
* assign rider
* reassign rider
* cancel delivery
* view customer
* view rider
* approve rider
* suspend rider
* view live rider location
* view support issues
* manage pricing
* manage service zones
* view audit logs

All permissions must be enforced by the Go backend.

---

# 26. SUPPORT INSIDE MOBILE APP

Support users also use the same app.

Support can:

* view tickets
* view deliveries
* view customer
* view rider
* communicate with customer
* add internal notes
* escalate
* resolve tickets

Support does NOT automatically receive admin permissions.

---

# 27. AUTHENTICATION

Use one authentication system for all roles.

Roles:

```text
CUSTOMER
RIDER
ADMIN
SUPPORT
```

A user can have multiple roles.

Use:

* access tokens
* refresh tokens
* secure token storage
* token rotation
* logout/revocation
* session management

Never store authentication tokens in AsyncStorage.

---

# 28. DATABASE

PostgreSQL 15+.

Use UUID primary keys.

Important tables:

```text
users
roles
permissions
user_roles
role_permissions

sessions

riders
rider_documents
rider_vehicles

deliveries
delivery_items
delivery_assignments
delivery_status_history

delivery_locations

notifications
notification_preferences

conversations
conversation_participants
messages
message_reads

payments
payment_attempts
refunds

ratings

support_tickets
support_messages
support_notes

pricing_rules
service_zones

audit_logs
```

---

# 29. LOCATION HISTORY

Do NOT store every GPS point in PostgreSQL blindly.

Use:

```text
Redis
```

for short-lived high-frequency location updates.

Optionally persist sampled/important locations to PostgreSQL.

Example:

```text
Rider GPS
   |
   v
Redis
   |
   +--> WebSocket
   |
   +--> periodic persistence
```

This keeps PostgreSQL load manageable.

---

# 30. REDIS TTL POLICY

Use TTL for temporary data.

Examples:

```text
rider presence
5 minutes

live delivery location
several minutes after last update

assignment offer
30-60 seconds

OTP attempt state
short TTL

rate limit counters
configured per endpoint

distributed locks
short TTL
```

Choose exact values in configuration rather than hard-coding them.

---

# 31. REDIS FAILURE HANDLING

The application must gracefully handle Redis failure.

Do not silently corrupt delivery state.

PostgreSQL remains the persistent source of truth.

If Redis becomes unavailable:

* normal REST operations should continue where safe
* critical state transitions must still be protected
* WebSocket real-time functionality should report degraded state
* Redis-dependent temporary functionality should fail safely
* reconnect Redis automatically
* expose health/readiness status

Do not pretend real-time functionality is working if Redis/WebSocket infrastructure is unavailable.

---

# 32. REDIS CONNECTION MANAGEMENT

Use a proper Redis connection pool/client in Go.

Configure:

```text
REDIS_HOST
REDIS_PORT
REDIS_PASSWORD
REDIS_DB
REDIS_POOL_SIZE
REDIS_MIN_IDLE
REDIS_CONNECT_TIMEOUT
REDIS_READ_TIMEOUT
REDIS_WRITE_TIMEOUT
```

All values must come from environment/configuration.

Never hard-code credentials.

---

# 33. DOCKER COMPOSE

Provide development Docker Compose:

```text
services:

  postgres:
    image: postgres:15

  redis:
    image: redis:7

  backend:
    build: ./backend
```

Configure health checks.

Backend should wait for dependencies to become available.

---

# 34. API

REST:

```text
/api/v1/auth
/api/v1/users
/api/v1/deliveries
/api/v1/riders
/api/v1/locations
/api/v1/notifications
/api/v1/conversations
/api/v1/messages
/api/v1/payments
/api/v1/ratings
/api/v1/support
/api/v1/admin
```

WebSocket:

```text
wss://api.example.com/ws
```

Synchronization:

```text
GET /api/v1/sync
```

or an equivalent event-recovery endpoint.

---

# 35. REAL-TIME EVENT TYPES

Implement:

```text
delivery.created
delivery.price_updated
delivery.rider_searching
delivery.rider_assigned
delivery.rider_arriving
delivery.rider_arrived
delivery.pickup_verification_required
delivery.picked_up
delivery.in_transit
delivery.near_destination
delivery.delivery_verification_required
delivery.delivered
delivery.cancelled
delivery.failed

rider.online
rider.offline
rider.location_updated
rider.delivery_offer

notification.created
notification.read

chat.message_created
chat.message_read

payment.created
payment.success
payment.failed

support.ticket_created
support.ticket_updated
support.ticket_resolved
```

---

# 36. EVENT ENVELOPE

Use a standard structure:

```json
{
  "event": "delivery.status_changed",
  "event_id": "uuid",
  "sequence": 42,
  "timestamp": "2026-10-03T10:30:00Z",
  "entity_type": "delivery",
  "entity_id": "uuid",
  "data": {}
}
```

Clients should process events idempotently.

---

# 37. MONEY

Never use floating point.

Use:

```text
BIGINT amount_minor
```

Example:

```text
₹149.50 = 14950
```

Pricing is calculated on the backend.

The client cannot modify the final price.

---

# 38. SECURITY

Implement:

* authentication
* authorization
* RBAC
* permission checks
* input validation
* rate limiting
* secure headers
* SQL injection prevention
* audit logging
* idempotency
* OTP hashing
* token protection
* session revocation
* request IDs

Never trust the client for:

```text
user_id
role
price
delivery_status
payment_status
rider_id
```

---

# 39. OBSERVABILITY

Implement:

```text
GET /health
GET /ready
```

Log:

* request ID
* user ID where appropriate
* delivery ID
* event ID
* WebSocket connection lifecycle
* Redis errors
* database errors
* state transitions

Never log:

* passwords
* access tokens
* refresh tokens
* OTP values
* payment secrets

---

# 40. TESTING

Test:

### Backend

* authentication
* RBAC
* delivery state machine
* pricing
* rider assignment
* Redis presence
* Redis locks
* Redis Pub/Sub
* WebSocket authentication
* WebSocket reconnect
* notification creation
* event recovery
* OTP
* payments
* idempotency

### Mobile

* login
* role navigation
* create delivery
* live delivery
* WebSocket reconnect
* notification center
* live rider tracking
* chat
* admin screens
* support screens

---

# 41. PROJECT STRUCTURE

```text
project/
│
├── mobile/
│   └── src/
│       ├── api/
│       ├── auth/
│       ├── navigation/
│       ├── screens/
│       ├── components/
│       ├── features/
│       │   ├── customer/
│       │   ├── rider/
│       │   ├── admin/
│       │   └── support/
│       ├── websocket/
│       ├── notifications/
│       ├── location/
│       ├── storage/
│       ├── hooks/
│       ├── types/
│       └── utils/
│
├── backend/
│   ├── cmd/
│   ├── internal/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── deliveries/
│   │   ├── riders/
│   │   ├── pricing/
│   │   ├── location/
│   │   ├── notifications/
│   │   ├── websocket/
│   │   ├── redis/
│   │   ├── events/
│   │   ├── payments/
│   │   ├── support/
│   │   └── admin/
│   ├── migrations/
│   ├── tests/
│   ├── Dockerfile
│   └── go.mod
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

# 42. DEVELOPMENT PHASES

Build incrementally.

## Phase 1

Infrastructure:

```text
Go
PostgreSQL
Redis
Docker Compose
configuration
logging
health checks
```

## Phase 2

Authentication:

```text
users
roles
permissions
sessions
login
logout
```

## Phase 3

Customer:

```text
create delivery
pricing
booking
history
```

## Phase 4

Rider:

```text
online/offline
presence
assignment
accept/reject
pickup
delivery
```

## Phase 5

Redis + WebSocket:

```text
WebSocket authentication
Redis Pub/Sub
presence
live status
live location
reconnect
sync
```

## Phase 6

Notifications:

```text
notification persistence
real-time notification
notification center
unread count
deep links
```

## Phase 7

Chat:

```text
messages
real-time chat
read status
reconnect recovery
```

## Phase 8

Admin:

```text
dashboard
rider management
delivery management
pricing
service zones
audit
```

## Phase 9

Support:

```text
tickets
messages
escalation
resolution
```

## Phase 10

Payments:

```text
payment
verification
refund
```

## Phase 11

Testing/security/performance.

---

# 43. COMPLETE REAL-TIME ACCEPTANCE TEST

This scenario MUST work without manually refreshing any screen.

```text
Customer Login
      |
      v
Create Delivery
      |
      v
Server Calculates Price
      |
      v
Customer Confirms
      |
      v
Delivery Created
      |
      +----> PostgreSQL
      |
      +----> Redis
      |
      +----> WebSocket
                |
                v
          Rider receives job
                |
                v
          Rider accepts
                |
                +----> Redis
                |
                +----> PostgreSQL
                |
                +----> WebSocket
                           |
                           v
                    Customer sees:
                    "Rider Assigned"
                           |
                           v
                    Rider sends GPS
                           |
                           v
                         Redis
                           |
                           v
                       WebSocket
                           |
                           v
                    Customer map moves
                           |
                           v
                    Rider arrives
                           |
                           v
                    Pickup OTP
                           |
                           v
                    PICKED_UP
                           |
                           v
                    IN_TRANSIT
                           |
                           v
                    Live location
                           |
                           v
                    Near destination
                           |
                           v
                    Delivery OTP
                           |
                           v
                    DELIVERED
                           |
                           v
                    Notification
                           |
                           v
                    Rating
```

At no point should the customer need to manually refresh the active delivery screen.

---

# 44. FINAL ARCHITECTURAL RULES

The following rules are mandatory:

1. One React Native application.
2. Customer, Rider, Admin and Support use the same application.
3. No separate web admin panel.
4. Go backend.
5. PostgreSQL as persistent source of truth.
6. Redis as core real-time infrastructure.
7. Redis Pub/Sub for event distribution.
8. WebSockets for real-time application updates.
9. Redis presence for riders.
10. Redis for high-frequency temporary location state.
11. Redis locks for concurrency-sensitive operations.
12. PostgreSQL for permanent notifications.
13. WebSocket reconnect + synchronization.
14. Server-side authorization.
15. Server-side delivery state machine.
16. Server-side pricing.
17. Server-side OTP verification.
18. No FCM.
19. No Firebase Cloud Messaging.
20. Do not use polling for active delivery updates when WebSocket is available.
21. Do not store every GPS update in PostgreSQL.
22. Do not use Redis as the permanent database.
23. Do not trust Redis Pub/Sub as guaranteed event persistence.
24. Important events must be recoverable from persistent storage.
25. Do not claim WebSocket can wake a terminated mobile application.
26. Keep notification delivery provider abstract so another OS-level notification mechanism can be added later without rewriting the application.
27. Build as a modular monolith first.
28. Keep the system production-oriented and horizontally scalable.
29. All critical operations must be idempotent.
30. All important state transitions must be auditable.

