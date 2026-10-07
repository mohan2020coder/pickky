package sync

import (
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"pickky/backend/internal/deliveries"
	"pickky/backend/internal/events"
	"pickky/backend/internal/httpx"
	"pickky/backend/internal/notifications"
	"pickky/backend/internal/presence"
)

type Deps struct {
	Auth     fiber.Handler
	DB       *gorm.DB
	Bus      *events.Bus
	Presence *presence.Store
	Svc      *deliveries.Service
}

type handler struct {
	db  *gorm.DB
	bus *events.Bus
}

// Register mounts GET /sync — the reconnect recovery endpoint. Clients call it
// after every WebSocket reconnect; PostgreSQL is the source of truth for
// whatever was missed while offline.
func Register(app fiber.Router, d Deps) {
	h := &handler{db: d.DB, bus: d.Bus}
	app.Get("/", d.Auth, h.sync)
}

func (h *handler) sync(c *fiber.Ctx) error {
	userID, _ := httpx.GetUserID(c)
	ctx := c.Context()

	// Notifications: latest 50 for this user.
	var notifs []notifications.Notification
	h.db.WithContext(ctx).Where("user_id = ?", userID).
		Order("created_at DESC").Limit(50).Find(&notifs)
	notifRecords := make([]notifications.NotificationRecord, 0, len(notifs))
	for _, n := range notifs {
		notifRecords = append(notifRecords, notifications.ToRecord(n))
	}

	var unread int64
	h.db.WithContext(ctx).Model(&notifications.Notification{}).
		Where("user_id = ? AND read_at IS NULL", userID).Count(&unread)

	// Deliveries: everything of mine that is still active.
	var rows []deliveries.Delivery
	h.db.WithContext(ctx).
		Where("customer_id = ? OR rider_id = ?", userID, userID).
		Where("status NOT IN ?", []string{"DELIVERED", "CANCELLED", "FAILED"}).
		Order("created_at DESC").Limit(50).Find(&rows)
	items, err := deliveries.Hydrate(ctx, h.db, rows)
	if err != nil {
		items = []deliveries.DeliveryDTO{}
	}

	// Events buffered while the socket was down.
	evts := h.bus.RecentEvents(ctx, userID, 40)
	if evts == nil {
		evts = []events.Envelope{}
	}

	resp := fiber.Map{
		"notifications": notifRecords,
		"deliveries":    items,
		"events":        evts,
		"unread_count":  unread,
	}

	// Riders also get their current presence back.
	var status string
	if err := h.db.WithContext(ctx).Table("riders").
		Where("user_id = ?", userID).Pluck("status", &status).Error; err == nil && status != "" {
		resp["rider_status"] = status
	}

	return httpx.OK(c, resp)
}
