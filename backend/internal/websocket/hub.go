package websocket

import (
	"context"
	"encoding/json"
	"log/slog"
	"strings"
	"sync"
	"time"

	fws "github.com/fasthttp/websocket"
	"github.com/gofiber/fiber/v2"
	gws "github.com/gofiber/websocket/v2"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"pickky/backend/internal/auth"
	"pickky/backend/internal/events"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = 30 * time.Second
	maxMessageSize = 16 * 1024
	sendBuffer     = 64
)

// Hub is the in-process WebSocket fan-out: it consumes Redis Pub/Sub wires and
// delivers envelopes to local connections subscribed to the target rooms.
type Hub struct {
	mu    sync.RWMutex
	conns map[*client]struct{}
	rooms map[string]map[*client]struct{}

	rdb    *redis.Client
	db     *gorm.DB
	jwt    *auth.JWTManager
	hooks  Hooks
	log    *slog.Logger
	cancel context.CancelFunc
}

type client struct {
	conn   *gws.Conn
	userID uuid.UUID
	roles  []string
	send   chan []byte
	rooms  map[string]bool

	mu     sync.Mutex
	closed bool
}

func NewHub(rdb *redis.Client, db *gorm.DB, jwt *auth.JWTManager, hooks Hooks, log *slog.Logger) *Hub {
	if log == nil {
		log = slog.Default()
	}
	return &Hub{
		conns: make(map[*client]struct{}),
		rooms: make(map[string]map[*client]struct{}),
		rdb:   rdb,
		db:    db,
		jwt:   jwt,
		hooks: hooks,
		log:   log,
	}
}

// Run subscribes to the event channels and fans messages out until ctx ends.
func (h *Hub) Run(ctx context.Context) {
	if h.rdb == nil {
		h.log.Warn("redis unavailable: websocket fan-out disabled")
		return
	}
	ctx, h.cancel = context.WithCancel(ctx)
	ch := h.rdb.Subscribe(ctx,
		events.ChannelDelivery, events.ChannelRider, events.ChannelNotification,
		events.ChannelChat, events.ChannelSupport, events.ChannelSystem,
	).Channel()

	go func() {
		<-ctx.Done()
		h.shutdown()
	}()

	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}
			h.distribute(msg.Payload)
		}
	}
}

func (h *Hub) distribute(payload string) {
	var wire events.Wire
	if err := json.Unmarshal([]byte(payload), &wire); err != nil {
		return
	}
	// Deduplicate per connection: a client subscribed to several matching
	// rooms (e.g. user:<id> + conversation:<id>) must get the event once.
	seen := make(map[*client]struct{})
	h.mu.RLock()
	for _, room := range wire.Rooms {
		for c := range h.rooms[room] {
			seen[c] = struct{}{}
		}
	}
	h.mu.RUnlock()
	for c := range seen {
		c.enqueue(wire.Envelope)
	}
}

// Handler upgrades HTTP connections; auth happens on the query-string token.
func (h *Hub) Handler() fiber.Handler {
	return gws.New(h.serve, gws.Config{
		HandshakeTimeout: 10 * time.Second,
		Origins:          []string{"*"},
		ReadBufferSize:   4096,
		WriteBufferSize:  4096,
	})
}

func (h *Hub) loadRoles(userID uuid.UUID) ([]string, error) {
	if h.db == nil {
		return nil, nil
	}
	var csv string
	err := h.db.Raw(`SELECT COALESCE((
			SELECT string_agg(r.name, ',') FROM user_roles ur
			JOIN roles r ON r.id = ur.role_id
			WHERE ur.user_id = u.id), '') AS roles
		FROM users u WHERE u.id = ?`, userID).Row().Scan(&csv)
	if err != nil {
		return nil, err
	}
	if csv == "" {
		return nil, nil
	}
	return strings.Split(csv, ","), nil
}

func (h *Hub) serve(conn *gws.Conn) {
	token := conn.Query("token")
	if token == "" {
		_ = conn.WriteJSON(fiber.Map{"error": "unauthorized"})
		return
	}
	claims, err := h.jwt.ParseAccess(token)
	if err != nil {
		_ = conn.WriteJSON(fiber.Map{"error": "unauthorized"})
		return
	}
	roles, err := h.loadRoles(claims.UserID)
	if err != nil {
		return
	}

	c := &client{
		conn:   conn,
		userID: claims.UserID,
		roles:  roles,
		send:   make(chan []byte, sendBuffer),
		rooms:  map[string]bool{},
	}
	h.register(c)
	defer h.unregister(c)

	go h.writeLoop(c)
	h.readLoop(c)
}

func (h *Hub) readLoop(c *client) {
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetReadLimit(maxMessageSize)
	for {
		_, data, err := c.conn.ReadMessage()
		if err != nil {
			return
		}
		_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))

		var msg ClientMessage
		if err := json.Unmarshal(data, &msg); err != nil {
			continue
		}
		h.handle(c, msg)
	}
}

// authorize validates a room subscription server-side (AGENTS.md §12).
func (h *Hub) authorize(c *client, room string) bool {
	has := func(role string) bool {
		for _, r := range c.roles {
			if r == role {
				return true
			}
		}
		return false
	}
	switch {
	case strings.HasPrefix(room, "user:"):
		return strings.TrimPrefix(room, "user:") == c.userID.String()
	case room == "admin":
		return has("ADMIN")
	case room == "support":
		return has("SUPPORT")
	case strings.HasPrefix(room, "delivery:"):
		id, err := uuid.Parse(strings.TrimPrefix(room, "delivery:"))
		if err != nil || h.db == nil {
			return false
		}
		var customerID, riderID uuid.UUID
		err = h.db.Raw(`SELECT customer_id, COALESCE(rider_id, '00000000-0000-0000-0000-000000000000') FROM deliveries WHERE id = ?`, id).
			Row().Scan(&customerID, &riderID)
		if err != nil {
			return false
		}
		return customerID == c.userID || riderID == c.userID || has("ADMIN") || has("SUPPORT")
	case strings.HasPrefix(room, "conversation:"):
		id, err := uuid.Parse(strings.TrimPrefix(room, "conversation:"))
		if err != nil || h.db == nil {
			return false
		}
		var count int64
		err = h.db.Raw(`SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = ? AND user_id = ?`,
			id, c.userID).Scan(&count).Error
		if err != nil {
			return false
		}
		if count > 0 {
			return true
		}
		// Fallback: delivery-linked conversation participants.
		var n int64
		err = h.db.Raw(`SELECT COUNT(*) FROM conversations cv
			JOIN deliveries d ON d.id = cv.delivery_id
			WHERE cv.id = ? AND (d.customer_id = ? OR d.rider_id = ?)`, id, c.userID, c.userID).
			Scan(&n).Error
		return err == nil && n > 0
	default:
		return false
	}
}

func (h *Hub) handle(c *client, msg ClientMessage) {
	switch msg.Action {
	case "ping":
		if h.hooks.OnPing != nil {
			h.hooks.OnPing(c.userID.String())
		}
		c.enqueue([]byte(`{"action":"pong"}`))
	case "subscribe":
		if !h.authorize(c, msg.Room) {
			// Never trust client-supplied rooms; silently refuse (the client
			// does not retry with fewer rooms, and the socket must stay open).
			return
		}
		h.mu.Lock()
		set, ok := h.rooms[msg.Room]
		if !ok {
			set = make(map[*client]struct{})
			h.rooms[msg.Room] = set
		}
		set[c] = struct{}{}
		c.rooms[msg.Room] = true
		h.mu.Unlock()
	case "unsubscribe":
		h.mu.Lock()
		if set, ok := h.rooms[msg.Room]; ok {
			delete(set, c)
		}
		delete(c.rooms, msg.Room)
		h.mu.Unlock()
	case "location":
		if h.hooks.OnLocation == nil {
			return
		}
		var p LocationPayload
		if json.Unmarshal(msg.Data, &p) != nil {
			return
		}
		_ = h.hooks.OnLocation(c.userID.String(), p)
	case "message":
		if h.hooks.OnChatMessage == nil {
			return
		}
		var p ChatMessagePayload
		if json.Unmarshal(msg.Data, &p) != nil {
			return
		}
		_, _ = h.hooks.OnChatMessage(c.userID.String(), p)
	case "typing":
		if h.hooks.OnTyping == nil {
			return
		}
		var p TypingPayload
		if json.Unmarshal(msg.Data, &p) != nil {
			return
		}
		_ = h.hooks.OnTyping(c.userID.String(), p)
	}
}

func (h *Hub) writeLoop(c *client) {
	ticker := time.NewTicker(pingPeriod)
	defer ticker.Stop()
	for {
		select {
		case payload, ok := <-c.send:
			if !ok {
				return
			}
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(fws.TextMessage, payload); err != nil {
				return
			}
		case <-ticker.C:
			// Protocol-level ping keeps NATs/load balancers from dropping the
			// socket; React Native replies with pong automatically.
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteControl(fws.PingMessage, []byte("ping"), time.Now().Add(writeWait)); err != nil {
				return
			}
		}
	}
}

func (c *client) enqueue(payload []byte) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.closed {
		return
	}
	select {
	case c.send <- payload:
	default:
		// Slow consumer: drop the connection rather than block the hub.
		c.closeLocked()
	}
}

func (c *client) close() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.closeLocked()
}

func (c *client) closeLocked() {
	if c.closed {
		return
	}
	c.closed = true
	close(c.send)
	_ = c.conn.Close()
}

func (h *Hub) register(c *client) {
	h.mu.Lock()
	h.conns[c] = struct{}{}
	h.mu.Unlock()
}

func (h *Hub) unregister(c *client) {
	h.mu.Lock()
	for room := range c.rooms {
		if set, ok := h.rooms[room]; ok {
			delete(set, c)
			if len(set) == 0 {
				delete(h.rooms, room)
			}
		}
	}
	delete(h.conns, c)
	h.mu.Unlock()
	c.close()
}

func (h *Hub) shutdown() {
	h.mu.Lock()
	defer h.mu.Unlock()
	for c := range h.conns {
		c.close()
		delete(h.conns, c)
	}
	h.rooms = make(map[string]map[*client]struct{})
}

// Connections reports the number of live sockets (exposed via health metrics).
func (h *Hub) Connections() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.conns)
}
