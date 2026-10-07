package support

import (
	"errors"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"pickky/backend/internal/auth"
	"pickky/backend/internal/events"
	"pickky/backend/internal/httpx"
	"pickky/backend/internal/middleware"
	"pickky/backend/internal/notifications"
)

type Deps struct {
	Auth fiber.Handler
	DB   *gorm.DB
	Bus  *events.Bus
}

type handler struct {
	db  *gorm.DB
	bus *events.Bus
}

// TicketDTO mirrors the mobile SupportTicket contract.
type TicketDTO struct {
	ID         uuid.UUID  `json:"id"`
	CustomerID *uuid.UUID `json:"customer_id"`
	Reference  string     `json:"reference"`
	Subject    string     `json:"subject"`
	Status     string     `json:"status"`
	Priority   string     `json:"priority"`
	Category   *string    `json:"category"`
	DeliveryID *uuid.UUID `json:"delivery_id"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  *time.Time `json:"updated_at"`
	LastMessage *string   `json:"last_message"`
	UnreadCount int       `json:"unread_count"`
}

// MessageDTO mirrors the mobile TicketMessage contract.
type MessageDTO struct {
	ID         uuid.UUID  `json:"id"`
	TicketID   uuid.UUID  `json:"ticket_id"`
	SenderID   uuid.UUID  `json:"sender_id"`
	SenderName *string    `json:"sender_name"`
	Body       string     `json:"body"`
	IsInternal bool       `json:"is_internal"`
	CreatedAt  time.Time  `json:"created_at"`
}

func Register(app fiber.Router, d Deps) {
	h := &handler{db: d.DB, bus: d.Bus}
	app.Get("/tickets", d.Auth, h.list)
	app.Post("/tickets", d.Auth, h.create)
	app.Get("/tickets/:id", d.Auth, h.get)
	app.Get("/tickets/:id/messages", d.Auth, h.messages)
	app.Post("/tickets/:id/messages", d.Auth, h.addMessage)
}

func isStaff(c *fiber.Ctx) bool {
	return middleware.HasRole(c, auth.RoleSupport, auth.RoleAdmin)
}

func (h *handler) toDTO(c *fiber.Ctx, t *Ticket) TicketDTO {
	d := TicketDTO{
		ID: t.ID, Reference: t.Reference, Subject: t.Subject,
		Status: t.Status, Priority: t.Priority, DeliveryID: t.DeliveryID,
		CreatedAt: t.CreatedAt,
	}
	if !t.UpdatedAt.IsZero() {
		u := t.UpdatedAt.UTC()
		d.UpdatedAt = &u
	}
	customer := t.CustomerID
	d.CustomerID = &customer
	if t.Category != "" {
		d.Category = &t.Category
	}

	var last struct{ Body string }
	h.db.Table("support_messages").Where("ticket_id = ?", t.ID).
		Order("created_at DESC").Limit(1).Scan(&last)
	if last.Body != "" {
		d.LastMessage = &last.Body
	}

	userID, _ := httpx.GetUserID(c)
	var unread int64
	h.db.Table("support_messages").
		Where("ticket_id = ? AND sender_id <> ?", t.ID, userID).Count(&unread)
	d.UnreadCount = int(unread)
	return d
}

func (h *handler) canView(c *fiber.Ctx, t *Ticket) bool {
	userID, _ := httpx.GetUserID(c)
	if t.CustomerID == userID {
		return true
	}
	return isStaff(c)
}

func (h *handler) list(c *fiber.Ctx) error {
	userID, _ := httpx.GetUserID(c)
	pg := httpx.PageFrom(c)

	q := h.db.Model(&Ticket{})
	if !isStaff(c) {
		q = q.Where("customer_id = ?", userID)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	var rows []Ticket
	if err := q.Order("created_at DESC").Limit(pg.Limit).Offset(pg.Offset()).
		Find(&rows).Error; err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}

	items := make([]TicketDTO, 0, len(rows))
	for i := range rows {
		items = append(items, h.toDTO(c, &rows[i]))
	}
	return httpx.OK(c, httpx.Paginated(items, pg, int(total)))
}

func (h *handler) nextReference() string {
	var count int64
	h.db.Table("support_tickets").Count(&count)
	for i := 0; i < 50; i++ {
		ref := fmt.Sprintf("SUP-%d", 100+count+int64(i))
		var n int64
		h.db.Table("support_tickets").Where("reference = ?", ref).Count(&n)
		if n == 0 {
			return ref
		}
	}
	return fmt.Sprintf("SUP-%d", time.Now().Unix()%100000)
}

func (h *handler) create(c *fiber.Ctx) error {
	userID, _ := httpx.GetUserID(c)
	var req struct {
		Subject    string     `json:"subject"`
		Category   string     `json:"category"`
		Body       string     `json:"body"`
		DeliveryID *uuid.UUID `json:"delivery_id"`
	}
	if err := httpx.Bind(c, &req, false); err != nil {
		return err
	}
	if req.Subject == "" || req.Body == "" {
		return httpx.Err(c, fiber.StatusUnprocessableEntity, "Please add a subject and description.")
	}
	if req.Category == "" {
		req.Category = "general"
	}

	now := time.Now().UTC()
	t := Ticket{
		CustomerID:  userID,
		Subject:     req.Subject,
		Reference:   h.nextReference(),
		Status:      "OPEN",
		Priority:    "MEDIUM",
		Category:    req.Category,
		DeliveryID:  req.DeliveryID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	err := h.db.WithContext(c.Context()).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&t).Error; err != nil {
			return err
		}
		return tx.Create(&TicketMessage{
			TicketID: t.ID, SenderID: userID, Body: req.Body, CreatedAt: now,
		}).Error
	})
	if err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}

	env := events.New("support.ticket_created", "ticket", t.ID,
		fiber.Map{"ticket_id": t.ID, "reference": t.Reference})
	_ = h.bus.Publish(c.Context(), events.ChannelSupport, env, "support", "admin", events.UserRoom(userID))

	return httpx.OK(c, h.toDTO(c, &t))
}

func (h *handler) load(c *fiber.Ctx) (*Ticket, error) {
	id, err := uuid.Parse(httpx.Param(c, "id"))
	if err != nil {
		return nil, httpx.Err(c, fiber.StatusNotFound, "We couldn't find that ticket.")
	}
	var t Ticket
	if err := h.db.First(&t, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, httpx.Err(c, fiber.StatusNotFound, "We couldn't find that ticket.")
		}
		return nil, httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	if !h.canView(c, &t) {
		return nil, httpx.Forbidden(c, "You don't have permission to view this ticket.")
	}
	return &t, nil
}

func (h *handler) get(c *fiber.Ctx) error {
	t, err := h.load(c)
	if err != nil {
		return err
	}
	return httpx.OK(c, h.toDTO(c, t))
}

func (h *handler) messages(c *fiber.Ctx) error {
	t, err := h.load(c)
	if err != nil {
		return err
	}
	var rows []TicketMessage
	if err := h.db.Where("ticket_id = ?", t.ID).Order("created_at ASC").
		Find(&rows).Error; err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	userIDs := map[uuid.UUID]bool{}
	for _, m := range rows {
		userIDs[m.SenderID] = true
	}
	names := map[uuid.UUID]string{}
	if len(userIDs) > 0 {
		ids := make([]uuid.UUID, 0, len(userIDs))
		for id := range userIDs {
			ids = append(ids, id)
		}
		var users []struct {
			ID   uuid.UUID
			Name string
		}
		h.db.Table("users").Where("id IN ?", ids).Select("id, name").Scan(&users)
		for _, u := range users {
			names[u.ID] = u.Name
		}
	}

	items := make([]MessageDTO, 0, len(rows))
	for _, m := range rows {
		d := MessageDTO{
			ID: m.ID, TicketID: m.TicketID, SenderID: m.SenderID,
			Body: m.Body, IsInternal: m.IsInternal, CreatedAt: m.CreatedAt,
		}
		if n, ok := names[m.SenderID]; ok {
			d.SenderName = &n
		}
		items = append(items, d)
	}
	return httpx.OK(c, items)
}

func (h *handler) addMessage(c *fiber.Ctx) error {
	userID, _ := httpx.GetUserID(c)
	t, err := h.load(c)
	if err != nil {
		return err
	}
	var req struct {
		Body string `json:"body"`
	}
	if err := httpx.Bind(c, &req, false); err != nil {
		return err
	}
	if req.Body == "" {
		return httpx.Err(c, fiber.StatusUnprocessableEntity, "Message cannot be empty.")
	}

	now := time.Now().UTC()
	m := TicketMessage{TicketID: t.ID, SenderID: userID, Body: req.Body, CreatedAt: now}
	err = h.db.WithContext(c.Context()).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&m).Error; err != nil {
			return err
		}
		return tx.Model(t).Update("updated_at", now).Error
	})
	if err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}

	var name string
	h.db.Table("users").Where("id = ?", userID).Pluck("name", &name)
	dto := MessageDTO{
		ID: m.ID, TicketID: m.TicketID, SenderID: userID, Body: m.Body,
		CreatedAt: m.CreatedAt,
	}
	if name != "" {
		dto.SenderName = &name
	}

	env := events.New("support.ticket_updated", "ticket", t.ID, fiber.Map{"ticket_id": t.ID})
	_ = h.bus.Publish(c.Context(), events.ChannelSupport, env, "support", "admin", events.UserRoom(userID))

	if isStaff(c) {
		_, _ = notifications.Create(c.Context(), h.db, h.bus, t.CustomerID, "support.ticket_updated",
			"Support replied", "There is a new message on your ticket.", fiber.Map{"ticket_id": t.ID})
	}
	return httpx.OK(c, dto)
}
