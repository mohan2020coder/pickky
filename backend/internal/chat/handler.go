package chat

import (
	"context"
	"errors"
	"log/slog"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"pickky/backend/internal/auth"
	"pickky/backend/internal/events"
	"pickky/backend/internal/httpx"
	"pickky/backend/internal/middleware"
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
	app.Get("/:id/messages", d.Auth, h.messages)
	app.Post("/:id/messages", d.Auth, h.send)
	app.Post("/:id/read", d.Auth, h.read)
}

// MessageDTO is the chat message wire format. Named DTO to avoid colliding
// with the GORM Message model in this package.
type MessageDTO struct {
	ID             uuid.UUID  `json:"id"`
	ConversationID uuid.UUID  `json:"conversation_id"`
	SenderID       uuid.UUID  `json:"sender_id"`
	Body           string     `json:"body"`
	ReadAt         *time.Time `json:"read_at"`
	CreatedAt      time.Time  `json:"created_at"`
	DeliveryStatus string     `json:"delivery_status"`
}

// ConversationDTO is the conversation view for the mobile client.
type ConversationDTO struct {
	ID          uuid.UUID   `json:"id"`
	DeliveryID  *uuid.UUID  `json:"delivery_id"`
	Title       *string     `json:"title"`
	Participant any         `json:"participant"`
	LastMessage *MessageDTO `json:"last_message"`
	UnreadCount int         `json:"unread_count"`
	UpdatedAt   *time.Time  `json:"updated_at"`
}

func toMessageDTO(m Message) MessageDTO {
	return MessageDTO{
		ID:             m.ID,
		ConversationID: m.ConversationID,
		SenderID:       m.SenderID,
		Body:           m.Body,
		ReadAt:         m.ReadAt,
		CreatedAt:      m.CreatedAt,
		DeliveryStatus: "sent",
	}
}

func toMessageDTOPtr(m Message) *MessageDTO {
	dto := toMessageDTO(m)
	return &dto
}

type convAccess struct {
	DeliveryID uuid.UUID
	CustomerID uuid.UUID
	RiderID    *uuid.UUID
}

// convRow is one row of the conversation list query.
type convRow struct {
	ID          uuid.UUID
	DeliveryID  uuid.UUID
	CustomerID  uuid.UUID
	RiderID     *uuid.UUID
	Title       *string
	UnreadCount int
	UpdatedAt   time.Time
}

type riderParticipant struct {
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	Rating       float64   `json:"rating"`
	VehicleType  string    `json:"vehicle_type"`
	LicensePlate string    `json:"license_plate"`
	PhotoURL     *string   `json:"photo_url"`
}

type participantUser struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Phone     string    `json:"phone"`
	Email     *string   `json:"email"`
	Roles     []string  `json:"roles"`
	CreatedAt time.Time `json:"created_at"`
}

func loadConversation(db *gorm.DB, id uuid.UUID) (*convAccess, error) {
	var ca convAccess
	res := db.Raw(`SELECT d.id AS delivery_id, d.customer_id, d.rider_id
		FROM conversations c
		JOIN deliveries d ON d.id = c.delivery_id
		WHERE c.id = ?`, id).Scan(&ca)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, nil
	}
	return &ca, nil
}

func isStaff(db *gorm.DB, userID uuid.UUID) bool {
	var n int64
	if err := db.Raw(`SELECT COUNT(*) FROM user_roles ur
		JOIN roles r ON r.id = ur.role_id
		WHERE ur.user_id = ? AND r.name IN ('ADMIN', 'SUPPORT')`, userID).
		Scan(&n).Error; err != nil {
		return false
	}
	return n > 0
}

// authorize returns the conversation access row or a response error. It never
// returns both a nil access and a nil error.
func (h *handler) authorize(c *fiber.Ctx, id uuid.UUID) (*convAccess, error) {
	ca, err := loadConversation(h.db, id)
	if err != nil {
		return nil, httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	if ca == nil {
		return nil, httpx.NotFound(c, "Conversation not found.")
	}
	userID, _ := c.Locals(httpx.ContextUserID).(uuid.UUID)
	ok := userID == ca.CustomerID ||
		(ca.RiderID != nil && userID == *ca.RiderID) ||
		middleware.HasRole(c, auth.RoleAdmin, auth.RoleSupport)
	if !ok {
		return nil, httpx.Forbidden(c, "You don't have access to this conversation.")
	}
	return ca, nil
}

func (h *handler) list(c *fiber.Ctx) error {
	userID, _ := c.Locals(httpx.ContextUserID).(uuid.UUID)

	sql := `SELECT c.id, c.delivery_id, c.updated_at, d.customer_id, d.rider_id,
		CASE WHEN d.customer_id = ? THEN ru.name ELSE cu.name END AS title,
		(SELECT COUNT(*) FROM messages m
			WHERE m.conversation_id = c.id AND m.read_at IS NULL AND m.sender_id <> ?) AS unread_count
		FROM conversations c
		JOIN deliveries d ON d.id = c.delivery_id
		LEFT JOIN users ru ON ru.id = d.rider_id
		LEFT JOIN users cu ON cu.id = d.customer_id
		WHERE d.customer_id = ? OR d.rider_id = ?`
	args := []any{userID, userID, userID, userID}

	if did := strings.TrimSpace(c.Query("delivery_id")); did != "" {
		if id, err := uuid.Parse(did); err == nil {
			sql += ` AND d.id = ?`
			args = append(args, id)
		} else {
			sql += ` AND d.id = ?`
			args = append(args, uuid.Nil)
		}
	}
	sql += ` ORDER BY c.updated_at DESC`

	var rows []convRow
	if err := h.db.Raw(sql, args...).Scan(&rows).Error; err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}

	convIDs := make([]uuid.UUID, 0, len(rows))
	var riderIDs, customerIDs []uuid.UUID
	for _, r := range rows {
		convIDs = append(convIDs, r.ID)
		if r.CustomerID == userID {
			if r.RiderID != nil {
				riderIDs = append(riderIDs, *r.RiderID)
			}
		} else {
			customerIDs = append(customerIDs, r.CustomerID)
		}
	}

	riderMap := make(map[uuid.UUID]riderParticipant)
	if len(riderIDs) > 0 {
		var parts []riderParticipant
		err := h.db.Raw(`SELECT r.user_id AS id, u.name,
			COALESCE((SELECT AVG(rt.stars)::double precision FROM ratings rt
				WHERE rt.rider_id = r.user_id), 0) AS rating,
			COALESCE(r.vehicle_type, '') AS vehicle_type,
			COALESCE(r.license_plate, '') AS license_plate
			FROM riders r
			JOIN users u ON u.id = r.user_id
			WHERE r.user_id IN (?)`, dedupe(riderIDs)).Scan(&parts).Error
		if err != nil {
			return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
		}
		for _, p := range parts {
			riderMap[p.ID] = p
		}
	}

	customerMap := make(map[uuid.UUID]participantUser)
	if len(customerIDs) > 0 {
		var users []struct {
			ID        uuid.UUID
			Name      string
			Phone     string
			Email     *string
			CreatedAt time.Time
		}
		if err := h.db.Raw(`SELECT u.id, u.name, u.phone, u.email, u.created_at
			FROM users u WHERE u.id IN (?)`, dedupe(customerIDs)).Scan(&users).Error; err != nil {
			return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
		}

		var roleRows []struct {
			UserID uuid.UUID
			Name   string
		}
		if err := h.db.Raw(`SELECT ur.user_id, r.name FROM user_roles ur
			JOIN roles r ON r.id = ur.role_id
			WHERE ur.user_id IN (?)`, dedupe(customerIDs)).Scan(&roleRows).Error; err != nil {
			return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
		}
		rolesByUser := make(map[uuid.UUID][]string)
		for _, rr := range roleRows {
			rolesByUser[rr.UserID] = append(rolesByUser[rr.UserID], rr.Name)
		}

		for _, u := range users {
			roles := rolesByUser[u.ID]
			if roles == nil {
				roles = []string{}
			}
			customerMap[u.ID] = participantUser{
				ID:        u.ID,
				Name:      u.Name,
				Phone:     u.Phone,
				Email:     u.Email,
				Roles:     roles,
				CreatedAt: u.CreatedAt,
			}
		}
	}

	lastByConv := make(map[uuid.UUID]Message)
	if len(convIDs) > 0 {
		var last []Message
		if err := h.db.Raw(`SELECT DISTINCT ON (conversation_id) id, conversation_id, sender_id, body, read_at, created_at
			FROM messages WHERE conversation_id IN (?)
			ORDER BY conversation_id, created_at DESC`, dedupe(convIDs)).Scan(&last).Error; err != nil {
			return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
		}
		// DISTINCT ON already yields at most one (the newest) row per conversation.
		for _, m := range last {
			lastByConv[m.ConversationID] = m
		}
	}

	out := make([]ConversationDTO, 0, len(rows))
	for _, r := range rows {
		convID := r.ID
		updatedAt := r.UpdatedAt
		dto := ConversationDTO{
			ID:          convID,
			DeliveryID:  &r.DeliveryID,
			Title:       r.Title,
			UnreadCount: r.UnreadCount,
			UpdatedAt:   &updatedAt,
		}
		if lm, ok := lastByConv[convID]; ok {
			dto.LastMessage = toMessageDTOPtr(lm)
		}
		if r.CustomerID == userID {
			if r.RiderID != nil {
				if p, ok := riderMap[*r.RiderID]; ok {
					dto.Participant = p
				}
			}
		} else {
			if p, ok := customerMap[r.CustomerID]; ok {
				dto.Participant = p
			}
		}
		out = append(out, dto)
	}
	return httpx.OK(c, out)
}

func (h *handler) messages(c *fiber.Ctx) error {
	convID, err := uuid.Parse(httpx.Param(c, "id"))
	if err != nil {
		return httpx.NotFound(c, "Conversation not found.")
	}
	if _, err := h.authorize(c, convID); err != nil {
		return err
	}

	q := h.db.Where("conversation_id = ?", convID)
	if before := strings.TrimSpace(c.Query("before")); before != "" {
		t, err := time.Parse(time.RFC3339, before)
		if err != nil {
			return httpx.BadRequest(c, "Invalid before parameter.")
		}
		q = q.Where("created_at < ?", t)
	}

	var msgs []Message
	if err := q.Order("created_at ASC").Find(&msgs).Error; err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	out := make([]MessageDTO, 0, len(msgs))
	for _, m := range msgs {
		out = append(out, toMessageDTO(m))
	}
	return httpx.OK(c, out)
}

func (h *handler) send(c *fiber.Ctx) error {
	userID, _ := c.Locals(httpx.ContextUserID).(uuid.UUID)
	convID, err := uuid.Parse(httpx.Param(c, "id"))
	if err != nil {
		return httpx.NotFound(c, "Conversation not found.")
	}
	ca, err := h.authorize(c, convID)
	if err != nil {
		return err
	}

	var req struct {
		Body string `json:"body"`
	}
	if err := httpx.Bind(c, &req, true); err != nil {
		return err
	}
	if strings.TrimSpace(req.Body) == "" {
		return httpx.Unprocessable(c, "Please enter a message.")
	}

	dto, err := insertAndBroadcast(c.Context(), h.db, h.bus, ca, userID, convID, strings.TrimSpace(req.Body))
	if err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	return httpx.OK(c, dto)
}

func (h *handler) read(c *fiber.Ctx) error {
	userID, _ := c.Locals(httpx.ContextUserID).(uuid.UUID)
	convID, err := uuid.Parse(httpx.Param(c, "id"))
	if err != nil {
		return httpx.OK(c, fiber.Map{"ok": true})
	}
	if err := h.db.Model(&Message{}).
		Where("conversation_id = ? AND sender_id <> ?", convID, userID).
		Update("read_at", time.Now().UTC()).Error; err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	return httpx.OK(c, fiber.Map{"ok": true})
}

// insertAndBroadcast persists a message, bumps the conversation timestamp and
// fans the created message out. The caller must already be authorized.
func insertAndBroadcast(ctx context.Context, db *gorm.DB, bus *events.Bus, ca *convAccess, senderID, convID uuid.UUID, body string) (*MessageDTO, error) {
	m := Message{ConversationID: convID, SenderID: senderID, Body: body}
	if err := db.WithContext(ctx).Create(&m).Error; err != nil {
		return nil, err
	}
	if err := db.Model(&Conversation{}).Where("id = ?", convID).
		Update("updated_at", time.Now().UTC()).Error; err != nil {
		return nil, err
	}

	dto := toMessageDTO(m)
	rooms := []string{"conversation:" + convID.String(), events.UserRoom(ca.CustomerID)}
	if ca.RiderID != nil {
		rooms = append(rooms, events.UserRoom(*ca.RiderID))
	}
	if err := bus.Publish(ctx, events.ChannelChat,
		events.New("chat.message_created", "conversation", convID, dto), rooms...); err != nil {
		slog.Error("chat.message_created fan-out failed", "error", err, "conversation_id", convID)
	}
	return &dto, nil
}

// SendMessageByUser persists a message from userID and fans it out. Used by the
// WebSocket hub when the mobile client sends a chat frame.
func SendMessageByUser(db *gorm.DB, bus *events.Bus, userID uuid.UUID, conversationID, body string) (*MessageDTO, error) {
	convID, err := uuid.Parse(strings.TrimSpace(conversationID))
	if err != nil {
		return nil, errors.New("Conversation not found.")
	}
	body = strings.TrimSpace(body)
	if body == "" {
		return nil, errors.New("Please enter a message.")
	}
	ca, err := loadConversation(db, convID)
	if err != nil {
		return nil, err
	}
	if ca == nil {
		return nil, errors.New("Conversation not found.")
	}
	if userID != ca.CustomerID &&
		(ca.RiderID == nil || userID != *ca.RiderID) &&
		!isStaff(db, userID) {
		return nil, errors.New("You don't have access to this conversation.")
	}
	return insertAndBroadcast(context.Background(), db, bus, ca, userID, convID, body)
}

// TypingByUser broadcasts an ephemeral typing indicator without persisting it.
func TypingByUser(db *gorm.DB, bus *events.Bus, userID uuid.UUID, conversationID string, typing bool) error {
	convID, err := uuid.Parse(strings.TrimSpace(conversationID))
	if err != nil {
		return errors.New("Conversation not found.")
	}
	ca, err := loadConversation(db, convID)
	if err != nil {
		return err
	}
	if ca == nil {
		return errors.New("Conversation not found.")
	}
	rooms := []string{"conversation:" + convID.String(), events.UserRoom(ca.CustomerID)}
	if ca.RiderID != nil {
		rooms = append(rooms, events.UserRoom(*ca.RiderID))
	}
	return bus.Publish(context.Background(), events.ChannelChat,
		events.New("chat.typing", "conversation", convID,
			fiber.Map{"conversation_id": convID, "typing": typing}), rooms...)
}

func dedupe(ids []uuid.UUID) []uuid.UUID {
	seen := make(map[uuid.UUID]struct{}, len(ids))
	out := make([]uuid.UUID, 0, len(ids))
	for _, id := range ids {
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	return out
}
