package admin

import (
	"errors"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"pickky/backend/internal/auth"
	"pickky/backend/internal/deliveries"
	"pickky/backend/internal/httpx"
	"pickky/backend/internal/middleware"
	"pickky/backend/internal/presence"
	"pickky/backend/internal/riders"
)

type Deps struct {
	Auth     fiber.Handler
	DB       *gorm.DB
	Svc      *deliveries.Service
	Presence *presence.Store
}

type handler struct {
	db       *gorm.DB
	svc      *deliveries.Service
	presence *presence.Store
}

func Register(app fiber.Router, d Deps) {
	h := &handler{db: d.DB, svc: d.Svc, presence: d.Presence}
	gate := []fiber.Handler{d.Auth, middleware.RequireRole(auth.RoleAdmin)}

	app.Get("/overview", gate[0], gate[1], h.overview)
	app.Get("/users", gate[0], gate[1], h.users)
	app.Get("/riders", gate[0], gate[1], h.riderList)
	app.Patch("/riders/:id", gate[0], gate[1], h.patchRider)
	app.Get("/deliveries", gate[0], gate[1], h.deliveriesList)
	app.Get("/issues", gate[0], gate[1], h.issues)
	app.Post("/deliveries/:id/assign", gate[0], gate[1], h.assign)
	app.Post("/deliveries/:id/cancel", gate[0], gate[1], h.cancel)
}

type Overview struct {
	ActiveDeliveries int64  `json:"active_deliveries"`
	TodayDeliveries  int64  `json:"today_deliveries"`
	OnlineRiders     int64  `json:"online_riders"`
	PendingIssues    int64  `json:"pending_issues"`
	RevenueMinor     int64  `json:"revenue_minor"`
	Currency         string `json:"currency"`
}

func (h *handler) overview(c *fiber.Ctx) error {
	var o Overview
	o.Currency = "INR"

	h.db.Model(&deliveries.Delivery{}).
		Where("status NOT IN ?", []string{"DELIVERED", "CANCELLED", "FAILED"}).
		Count(&o.ActiveDeliveries)

	today := time.Now().UTC().Truncate(24 * time.Hour)
	h.db.Model(&deliveries.Delivery{}).Where("created_at >= ?", today).
		Count(&o.TodayDeliveries)

	online, err := h.presence.OnlineRiderIDs(c.Context())
	if err == nil {
		o.OnlineRiders = int64(len(online))
	} else {
		h.db.Model(&riders.Rider{}).Where("status = 'ONLINE'").Count(&o.OnlineRiders)
	}

	h.db.Table("support_tickets").Where("status = 'OPEN'").Count(&o.PendingIssues)

	h.db.Model(&deliveries.Delivery{}).Where("status = 'DELIVERED'").
		Select("COALESCE(SUM(price_minor),0)").Scan(&o.RevenueMinor)

	return httpx.OK(c, o)
}

type UserRow struct {
	ID        uuid.UUID  `json:"id"`
	Name      string     `json:"name"`
	Phone     string     `json:"phone"`
	Email     *string    `json:"email"`
	Roles     []string   `json:"roles"`
	CreatedAt *time.Time `json:"created_at"`
	IsActive  bool       `json:"is_active"`
	Status    string     `json:"status"`
}

func (h *handler) users(c *fiber.Ctx) error {
	pg := httpx.PageFrom(c)
	q := h.db.Table("users u")
	if s := c.Query("q"); s != "" {
		like := "%" + s + "%"
		q = q.Where("lower(u.name) LIKE lower(?) OR u.phone LIKE ?", like, like)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	var rows []struct {
		ID        uuid.UUID
		Name      string
		Phone     string
		Email     *string
		CreatedAt time.Time
		IsActive  bool
		Roles     *string
	}
	if err := q.Order("u.created_at DESC").Limit(pg.Limit).Offset(pg.Offset()).
		Select("u.id, u.name, u.phone, u.email, u.created_at, u.is_active, (SELECT string_agg(r.name, ',') FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id) AS roles").
		Scan(&rows).Error; err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}

	items := make([]UserRow, 0, len(rows))
	for _, r := range rows {
		created := r.CreatedAt.UTC()
		item := UserRow{
			ID: r.ID, Name: r.Name, Phone: r.Phone, Email: r.Email,
			Roles: []string{}, CreatedAt: &created, IsActive: r.IsActive,
		}
		if r.IsActive {
			item.Status = "ACTIVE"
		} else {
			item.Status = "SUSPENDED"
		}
		if r.Roles != nil && *r.Roles != "" {
			item.Roles = splitCSV(*r.Roles)
		}
		items = append(items, item)
	}
	return httpx.OK(c, httpx.Paginated(items, pg, int(total)))
}

func splitCSV(s string) []string {
	out := []string{}
	cur := ""
	for _, ch := range s {
		if ch == ',' {
			if cur != "" {
				out = append(out, cur)
			}
			cur = ""
			continue
		}
		cur += string(ch)
	}
	if cur != "" {
		out = append(out, cur)
	}
	return out
}

type RiderRow struct {
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	Rating       float64   `json:"rating"`
	VehicleType  string    `json:"vehicle_type"`
	LicensePlate string    `json:"license_plate"`
	Status       string    `json:"status"`
	IsVerified   bool      `json:"is_verified"`
	IsSuspended  bool      `json:"is_suspended"`
}

func (h *handler) riderList(c *fiber.Ctx) error {
	pg := httpx.PageFrom(c)
	q := h.db.Table("riders r JOIN users u ON u.id = r.user_id")
	if s := c.Query("q"); s != "" {
		like := "%" + s + "%"
		q = q.Where("lower(u.name) LIKE lower(?)", like)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	var rows []RiderRow
	if err := q.
		Select(`r.user_id AS id, u.name, r.vehicle_type, r.license_plate, r.status,
			r.is_verified, r.is_suspended,
			COALESCE((SELECT AVG(stars) FROM ratings rd WHERE rd.rider_id = r.user_id), 0) AS rating`).
		Order("u.name").Limit(pg.Limit).Offset(pg.Offset()).Scan(&rows).Error; err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	return httpx.OK(c, httpx.Paginated(rows, pg, int(total)))
}

func (h *handler) patchRider(c *fiber.Ctx) error {
	id, err := uuid.Parse(httpx.Param(c, "id"))
	if err != nil {
		return httpx.Err(c, fiber.StatusNotFound, "We couldn't find that rider.")
	}
	var req struct {
		IsVerified  *bool `json:"is_verified"`
		IsSuspended *bool `json:"is_suspended"`
	}
	if err := httpx.Bind(c, &req, true); err != nil {
		return err
	}
	updates := map[string]interface{}{}
	if req.IsVerified != nil {
		updates["is_verified"] = *req.IsVerified
	}
	if req.IsSuspended != nil {
		updates["is_suspended"] = *req.IsSuspended
		updates["status"] = "OFFLINE"
	}
	if len(updates) == 0 {
		return httpx.OK(c, fiber.Map{"ok": true})
	}
	res := h.db.Model(&riders.Rider{}).Where("user_id = ?", id).Updates(updates)
	if res.Error != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	if res.RowsAffected == 0 {
		return httpx.Err(c, fiber.StatusNotFound, "We couldn't find that rider.")
	}
	if req.IsSuspended != nil && *req.IsSuspended {
		_ = h.presence.Remove(c.Context(), id)
	}
	return httpx.OK(c, fiber.Map{"ok": true})
}

func (h *handler) deliveriesList(c *fiber.Ctx) error {
	pg := httpx.PageFrom(c)
	items, total, err := h.svc.ListByAdmin(c.Context(), c.Query("status"), c.Query("q"), pg.Page, pg.Limit)
	if err != nil {
		return svcRespond(c, nil, err)
	}
	return httpx.OK(c, httpx.Paginated(items, pg, total))
}

func (h *handler) issues(c *fiber.Ctx) error {
	pg := httpx.PageFrom(c)
	q := h.db.Model(&deliveries.Delivery{}).
		Where("status IN ?", []string{"CANCELLED", "FAILED"})
	if s := c.Query("q"); s != "" {
		like := "%" + s + "%"
		q = q.Where("lower(reference) LIKE lower(?) OR lower(pickup_addr) LIKE lower(?)", like, like)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	var rows []deliveries.Delivery
	if err := q.Order("created_at DESC").Limit(pg.Limit).Offset(pg.Offset()).
		Find(&rows).Error; err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	items, err := deliveries.Hydrate(c.Context(), h.db, rows)
	if err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	return httpx.OK(c, httpx.Paginated(items, pg, int(total)))
}

func (h *handler) assign(c *fiber.Ctx) error {
	d, err := h.svc.GetRow(c.Context(), httpx.Param(c, "id"))
	if err != nil {
		return svcRespond(c, nil, err)
	}
	var req struct {
		RiderID *uuid.UUID `json:"rider_id"`
	}
	if err := httpx.Bind(c, &req, false); err != nil {
		return err
	}
	if req.RiderID == nil {
		return httpx.Err(c, fiber.StatusUnprocessableEntity, "Please choose a rider.")
	}
	out, err := h.svc.AssignRider(c.Context(), d, *req.RiderID, "")
	return svcRespond(c, out, err)
}

func (h *handler) cancel(c *fiber.Ctx) error {
	d, err := h.svc.GetRow(c.Context(), httpx.Param(c, "id"))
	if err != nil {
		return svcRespond(c, nil, err)
	}
	var req struct {
		Reason string `json:"reason"`
	}
	_ = httpx.Bind(c, &req, true)
	reason := req.Reason
	if reason == "" {
		reason = "Cancelled by admin"
	}
	out, err := h.svc.Cancel(c.Context(), d, reason)
	return svcRespond(c, out, err)
}

func svcRespond(c *fiber.Ctx, v any, err error) error {
	if err == nil {
		return httpx.OK(c, v)
	}
	var se *deliveries.SvcError
	if errors.As(err, &se) {
		return httpx.Err(c, se.Status, se.Message)
	}
	return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
}
