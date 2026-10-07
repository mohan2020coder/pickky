package notifications

import (
	"context"
	"encoding/json"
	"log/slog"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"pickky/backend/internal/events"
	"pickky/backend/internal/httpx"
)

type Deps struct {
	DB   *gorm.DB
	Bus  *events.Bus
	Auth fiber.Handler
}

type handler struct {
	db  *gorm.DB
	bus *events.Bus
}

func Register(app fiber.Router, d Deps) {
	h := &handler{db: d.DB, bus: d.Bus}
	app.Get("/", d.Auth, h.list)
	app.Get("/unread-count", d.Auth, h.unreadCount)
	app.Post("/:id/read", d.Auth, h.markRead)
	app.Post("/read-all", d.Auth, h.markAllRead)
}

// NotificationRecord is the exact JSON contract the mobile client expects.
type NotificationRecord struct {
	ID        uuid.UUID  `json:"id"`
	UserID    uuid.UUID  `json:"user_id,omitempty"`
	Type      string     `json:"type"`
	Title     string     `json:"title"`
	Message   string     `json:"message"`
	Data      any        `json:"data"`
	ReadAt    *time.Time `json:"read_at"`
	CreatedAt time.Time  `json:"created_at"`
}

// ToRecord converts a stored notification into its JSON contract.
func ToRecord(n Notification) NotificationRecord { return toRecord(n) }

func toRecord(n Notification) NotificationRecord {
	var data any
	if strings.TrimSpace(n.Data) != "" {
		if err := json.Unmarshal([]byte(n.Data), &data); err != nil {
			data = nil
		}
	}
	return NotificationRecord{
		ID:        n.ID,
		UserID:    n.UserID,
		Type:      n.Type,
		Title:     n.Title,
		Message:   n.Message,
		Data:      data,
		ReadAt:    n.ReadAt,
		CreatedAt: n.CreatedAt,
	}
}

func (h *handler) list(c *fiber.Ctx) error {
	userID, _ := c.Locals(httpx.ContextUserID).(uuid.UUID)
	pg := httpx.PageFrom(c)

	q := h.db.Model(&Notification{}).Where("user_id = ?", userID)
	if c.Query("unread") == "true" {
		q = q.Where("read_at IS NULL")
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}

	var items []Notification
	if err := q.Order("created_at DESC").Limit(pg.Limit).Offset(pg.Offset()).Find(&items).Error; err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}

	records := make([]NotificationRecord, 0, len(items))
	for _, it := range items {
		records = append(records, toRecord(it))
	}
	return httpx.OK(c, httpx.Paginated(records, pg, int(total)))
}

func (h *handler) unreadCount(c *fiber.Ctx) error {
	userID, _ := c.Locals(httpx.ContextUserID).(uuid.UUID)
	var count int64
	if err := h.db.Model(&Notification{}).
		Where("user_id = ? AND read_at IS NULL", userID).Count(&count).Error; err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	return httpx.OK(c, fiber.Map{"count": count})
}

func (h *handler) markRead(c *fiber.Ctx) error {
	userID, _ := c.Locals(httpx.ContextUserID).(uuid.UUID)
	id, err := uuid.Parse(httpx.Param(c, "id"))
	if err != nil {
		return httpx.OK(c, fiber.Map{"ok": true})
	}

	res := h.db.Model(&Notification{}).
		Where("id = ? AND user_id = ? AND read_at IS NULL", id, userID).
		Update("read_at", time.Now().UTC())
	if res.Error != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	if res.RowsAffected > 0 {
		if err := h.bus.Publish(c.Context(), events.ChannelNotification,
			events.New("notification.read", "notification", id,
				fiber.Map{"id": id, "user_id": userID}),
			events.UserRoom(userID)); err != nil {
			slog.Error("notification.read fan-out failed", "error", err, "id", id)
		}
	}
	return httpx.OK(c, fiber.Map{"ok": true})
}

func (h *handler) markAllRead(c *fiber.Ctx) error {
	userID, _ := c.Locals(httpx.ContextUserID).(uuid.UUID)
	if err := h.db.Model(&Notification{}).
		Where("user_id = ? AND read_at IS NULL", userID).
		Update("read_at", time.Now().UTC()).Error; err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	return httpx.OK(c, fiber.Map{"ok": true})
}

// Create persists a notification for userID and fans it out to the user's
// real-time room. A Redis/WebSocket failure never fails the insert.
func Create(ctx context.Context, db *gorm.DB, bus *events.Bus, userID uuid.UUID, typ, title, message string, data any) (*Notification, error) {
	payload := "null"
	if data != nil {
		if b, err := json.Marshal(data); err == nil {
			payload = string(b)
		} else {
			slog.Warn("notification data marshal failed, storing null", "error", err)
		}
	}

	n := Notification{UserID: userID, Type: typ, Title: title, Message: message, Data: payload}
	if err := db.WithContext(ctx).Create(&n).Error; err != nil {
		return nil, err
	}

	rec := toRecord(n)
	if err := bus.Publish(ctx, events.ChannelNotification,
		events.New("notification.created", "notification", n.ID, rec),
		events.UserRoom(userID)); err != nil {
		slog.Error("notification fan-out failed", "error", err, "id", n.ID)
	}
	return &n, nil
}
