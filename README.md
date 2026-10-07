# Pickky

Production-ready on-demand pickup & delivery marketplace (mobile-only). All roles — Customer, Rider, Admin, Support — share the same React Native application. No FCM, no separate web admin/rider apps.

"You need it. Pickky gets it." `mobile/` is the React Native app; `backend/` is the Go + PostgreSQL + Redis modular monolith.

---

## Architecture

```text
React Native
     |
     | HTTPS / REST
     v
Go Backend (modular monolith)
     |
     +-------------------+
     |                   |
     v                   v
PostgreSQL             Redis (core real-time infra)
                         |
                    Redis Pub/Sub
                         |
                         v
                    WebSocket Hub
                         |
                         v
                    Mobile Clients
```

- PostgreSQL is the permanent source of truth.
- Redis handles presence, live location, distributed locks, rate limiting, Pub/Sub fan-out and short-lived TTL state.
- WebSockets deliver real-time events (delivery status, live rider location, chat, notifications). Clients reconnect with exponential backoff and recover missed state via `GET /api/v1/sync`.
- Notifications are persisted in PostgreSQL, fan out over Redis Pub/Sub, and land in an in-app Notification Center. No FCM. The notification provider is abstracted behind an interface so an OS-level provider can be added later.

---

## Repository layout

```text
mobile/                  React Native (Expo) + TypeScript app
backend/                 Go backend (REST + WebSockets + Redis)
docker-compose.yml       postgres:15 + redis:7 + backend
README.md
```

### Mobile app structure

```text
mobile/src/
  api/        REST client + endpoint modules + mock backend (dev mode)
  auth/       auth store & session management (secure storage)
  navigation/ role-based navigators + shared stacks
  screens/    customer/ rider/ admin/ support/ common/
  components/ design system (Screen, Card, Button, AppText, ...)
  hooks/      TanStack Query hooks (queries.ts + mutations.ts)
  websocket/  RealtimeProvider + event handling
  constants/  delivery state machine metadata, theming tokens
  stores/     Zustand stores (ui, booking, realtime)
  utils/      formatting helpers
```

---

## Demo / dev mode (no backend required)

The app runs fully offline against a built-in **mock backend** that simulates the Go API, Redis, and WebSockets. Real-time behavior (rider presence, offers, live tracking, chat, notifications) is simulated with timers inside the app, so the complete end-to-end flow works without starting any server.

Set the API mode in `mobile/.env`:

```bash
# mock   = in-app simulated backend (default; no server needed)
# live   = talk to the real Go backend over HTTPS
EXPO_PUBLIC_API_MODE=mock
```

Demo accounts (OTP is always `1234`):

| Phone       | Password | Roles    | Persona            |
| ----------- | -------- | -------- | ------------------ |
| 9000000001  | pass1234 | Customer | Aarav Mehta        |
| 9000000002  | pass1234 | Rider    | Rajesh Kumar       |
| 9000000003  | pass1234 | Admin    | Admin workspace    |
| 9000000004  | pass1234 | Support  | Support workspace  |

Demo lifecycle (customer flow, in-app timings):

```text
Created → Searching rider → Rider assigned → Rider arriving
→ Rider arrived → Pickup code → Picked up → In transit
→ near destination → Delivery code → Delivered → Rating
```

- Rider Demo tip: sign in as the rider, toggle **Online**, and a delivery offer arrives automatically (every ~18s).
- Every status change, live rider location, chat message and notification is delivered over the simulated realtime channel — no manual refresh anywhere.

---

## Run it

### Mobile (demo mode)

```bash
cd mobile
npm install --legacy-peer-deps
npx expo start
```

Quality gates:

```bash
npx tsc --noEmit
npx eslint src --ext .ts,.tsx
npx expo export     # full Metro bundle sanity check
```

### Backend + infrastructure

```bash
docker compose up --build
```

Config lives in environment variables (see `.env.example`). The backend exposes `GET /health` and `GET /ready`, and waits for PostgreSQL/Redis before serving.

---

## Roles and screens

All roles live in one app; navigation is gated by the authenticated user's roles.

- **Customer** — create delivery (quote → pickup/drop-off map → package details → price confirm), live tracking with map + status timeline, pickup/delivery OTP verification, rating, delivery history, notification center, chat, saved addresses, support tickets.
- **Rider** — presence (online/offline), incoming offer accept/reject, active delivery with step-by-step state machine and OTP codes, live navigation, chat, earnings.
- **Admin** — dashboard (active/today deliveries, online riders, revenue), delivery management, users, rider verification & suspension, failed/cancelled deliveries.
- **Support** — ticket list, create ticket, threaded replies, FAQ.

---

## Delivery state machine (server-validated)

```text
DRAFT → CREATED → SEARCHING_RIDER → RIDER_ASSIGNED → RIDER_ARRIVING_PICKUP
→ RIDER_ARRIVED_PICKUP → PICKUP_VERIFICATION → PICKED_UP → IN_TRANSIT
→ NEAR_DESTINATION → DELIVERY_VERIFICATION → DELIVERED
(→ CANCELLED / FAILED)
```

Every transition is validated server-side; rider-driven updates are restricted (mock enforces a whitelist of rider statuses).