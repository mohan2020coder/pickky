package riders

import (
	"errors"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"pickky/backend/internal/auth"
	"pickky/backend/internal/config"
	"pickky/backend/internal/deliveries"
	"pickky/backend/internal/events"
	"pickky/backend/internal/httpx"
	"pickky/backend/internal/middleware"
	"pickky/backend/internal/presence"
)

type Deps struct {
	Auth     fiber.Handler
	DB       *gorm.DB
	Bus      *events.Bus
	Presence *presence.Store
	Cfg      *config.Config
	Svc      *deliveries.Service
}

type handler struct {
	db       *gorm.DB
	bus      *events.Bus
	presence *presence.Store
	svc      *deliveries.Service
}

// Profile mirrors the mobile RiderProfile contract.
type Profile struct {
	ID                  uuid.UUID  `json:"id"`
	UserID              uuid.UUID  `json:"user_id"`
	Status              string     `json:"status"`
	VehicleType         *string    `json:"vehicle_type"`
	LicensePlate        *string    `json:"license_plate"`
	IsVerified          bool       `json:"is_verified"`
	IsSuspended         bool       `json:"is_suspended"`
	Rating              *float64   `json:"rating"`
	EarningsMinor       int64      `json:"earnings_minor"`
	CompletedDeliveries int64      `json:"completed_deliveries"`
	LastLocationAt      *time.Time `json:"last_location_at,omitempty"`
}

func Register(app fiber.Router, d Deps) {
	h := &handler{db: d.DB, bus: d.Bus, presence: d.Presence, svc: d.Svc}

	app.Get("/me", d.Auth, middleware.RequireRole(auth.RoleRider), h.me)
	app.Put("/me", d.Auth, middleware.RequireRole(auth.RoleRider), h.updateMe)
	app.Post("/presence", d.Auth, middleware.RequireRole(auth.RoleRider), h.setPresence)
	app.Get("/offers", d.Auth, middleware.RequireRole(auth.RoleRider), h.offers)
	app.Post("/offers/:id/accept", d.Auth, middleware.RequireRole(auth.RoleRider), h.accept)
	app.Post("/offers/:id/reject", d.Auth, middleware.RequireRole(auth.RoleRider), h.reject)
	app.Get("/earnings", d.Auth, middleware.RequireRole(auth.RoleRider), h.earnings)
	app.Get("/deliveries", d.Auth, middleware.RequireRole(auth.RoleRider), h.riderDeliveries)
}

func (h *handler) riderRow(c *fiber.Ctx) (*Rider, error) {
	userID, _ := httpx.GetUserID(c)
	var r Rider
	if err := h.db.First(&r, "user_id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, httpx.Err(c, fiber.StatusNotFound, "We couldn't find your rider profile.")
		}
		return nil, httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	return &r, nil
}

func (h *handler) toProfile(r *Rider) Profile {
	p := Profile{
		ID:             r.UserID,
		UserID:         r.UserID,
		Status:         r.Status,
		IsVerified:     r.IsVerified,
		IsSuspended:    r.IsSuspended,
		LastLocationAt: r.LastLocationAt,
	}
	if r.VehicleType != "" {
		p.VehicleType = &r.VehicleType
	}
	if r.LicensePlate != "" {
		p.LicensePlate = &r.LicensePlate
	}

	var rating float64
	h.db.Table("ratings").Where("rider_id = ?", r.UserID).Select("COALESCE(AVG(stars),0)").Scan(&rating)
	p.Rating = &rating

	var completed int64
	h.db.Model(&deliveries.Delivery{}).
		Where("rider_id = ? AND status = 'DELIVERED'", r.UserID).Count(&completed)
	p.CompletedDeliveries = completed

	var sum int64
	h.db.Model(&deliveries.Delivery{}).
		Where("rider_id = ? AND status = 'DELIVERED'", r.UserID).
		Select("COALESCE(SUM(ROUND(price_minor * 0.8)),0)").Scan(&sum)
	p.EarningsMinor = sum
	return p
}

func (h *handler) me(c *fiber.Ctx) error {
	r, err := h.riderRow(c)
	if err != nil {
		return err
	}
	return httpx.OK(c, h.toProfile(r))
}

func (h *handler) updateMe(c *fiber.Ctx) error {
	r, err := h.riderRow(c)
	if err != nil {
		return err
	}
	var req struct {
		VehicleType  *string `json:"vehicle_type"`
		LicensePlate *string `json:"license_plate"`
	}
	if err := httpx.Bind(c, &req, true); err != nil {
		return err
	}
	updates := map[string]interface{}{}
	if req.VehicleType != nil {
		updates["vehicle_type"] = *req.VehicleType
	}
	if req.LicensePlate != nil {
		updates["license_plate"] = *req.LicensePlate
	}
	if len(updates) > 0 {
		if err := h.db.Model(r).Updates(updates).Error; err != nil {
			return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
		}
	}
	return httpx.OK(c, h.toProfile(r))
}

// setPresence flips the rider ONLINE/OFFLINE: database status, Redis presence
// and a real-time rider.online/offline event to the admin room.
func (h *handler) setPresence(c *fiber.Ctx) error {
	r, err := h.riderRow(c)
	if err != nil {
		return err
	}
	var req struct {
		Status string `json:"status"`
	}
	if err := httpx.Bind(c, &req, false); err != nil {
		return err
	}
	status := req.Status
	if status != "ONLINE" && status != "OFFLINE" && status != "BUSY" {
		status = "OFFLINE"
	}

	if err := h.db.Model(r).Update("status", status).Error; err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	r.Status = status

	ctx := c.Context()
	switch status {
	case "OFFLINE":
		_ = h.presence.Remove(ctx, r.UserID)
	default:
		_ = h.presence.Set(ctx, r.UserID, status, r.Lat, r.Lng)
	}

	event := "rider.offline"
	if status != "OFFLINE" {
		event = "rider.online"
	}
	env := events.New(event, "rider", r.UserID, fiber.Map{
		"rider_id": r.UserID, "status": status,
	})
	_ = h.bus.Publish(ctx, events.ChannelRider, env, "admin", "support")

	if status != "OFFLINE" && h.svc != nil {
		go h.svc.OfferToRider(ctx, r.UserID)
	}
	return httpx.OK(c, h.toProfile(r))
}

func (h *handler) offers(c *fiber.Ctx) error {
	userID, _ := httpx.GetUserID(c)
	list, err := h.svc.ListOffers(c.Context(), userID)
	if err != nil {
		return deliveriesRespond(c, nil, err)
	}
	return httpx.OK(c, list)
}

func (h *handler) accept(c *fiber.Ctx) error {
	userID, _ := httpx.GetUserID(c)
	offerID, err := uuid.Parse(httpx.Param(c, "id"))
	if err != nil {
		return httpx.Err(c, fiber.StatusConflict, "This request is no longer available.")
	}
	var r Rider
	if err := h.db.First(&r, "user_id = ?", userID).Error; err != nil {
		return httpx.Err(c, fiber.StatusNotFound, "We couldn't find your rider profile.")
	}
	if r.IsSuspended {
		return httpx.Forbidden(c, "Your account has been deactivated.")
	}
	out, err := h.svc.AcceptOffer(c.Context(), offerID, userID)
	return deliveriesRespond(c, out, err)
}

func (h *handler) reject(c *fiber.Ctx) error {
	offerID, err := uuid.Parse(httpx.Param(c, "id"))
	if err != nil {
		return httpx.OK(c, fiber.Map{"ok": true})
	}
	_ = h.svc.RejectOffer(c.Context(), offerID)
	return httpx.OK(c, fiber.Map{"ok": true})
}

// EarningsSummary mirrors the mobile contract (all amounts in minor units).
type EarningsSummary struct {
	TodayMinor      int64  `json:"today_minor"`
	WeekMinor       int64  `json:"week_minor"`
	MonthMinor      int64  `json:"month_minor"`
	DeliveriesToday int    `json:"deliveries_today"`
	DeliveriesWeek  int    `json:"deliveries_week"`
	Currency        string `json:"currency"`
}

func (h *handler) earnings(c *fiber.Ctx) error {
	userID, _ := httpx.GetUserID(c)
	var rows []struct {
		PriceMinor  int64
		DeliveredAt *time.Time
	}
	if err := h.db.Model(&deliveries.Delivery{}).
		Where("rider_id = ? AND status = 'DELIVERED' AND delivered_at IS NOT NULL", userID).
		Select("price_minor, delivered_at").Scan(&rows).Error; err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}

	now := time.Now().UTC()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	week := now.AddDate(0, 0, -7)
	month := now.AddDate(0, 0, -30)

	out := EarningsSummary{Currency: "INR"}
	for _, r := range rows {
		if r.DeliveredAt == nil {
			continue
		}
		earned := int64(float64(r.PriceMinor) * 0.8)
		switch {
		case r.DeliveredAt.After(today):
			out.TodayMinor += earned
			out.DeliveriesToday++
			out.WeekMinor += earned
			out.DeliveriesWeek++
			out.MonthMinor += earned
		case r.DeliveredAt.After(week):
			out.WeekMinor += earned
			out.DeliveriesWeek++
			out.MonthMinor += earned
		case r.DeliveredAt.After(month):
			out.MonthMinor += earned
		}
	}
	return httpx.OK(c, out)
}

func (h *handler) riderDeliveries(c *fiber.Ctx) error {
	userID, _ := httpx.GetUserID(c)
	pg := httpx.PageFrom(c)
	f := deliveries.ListFilter{Page: pg.Page, Limit: pg.Limit, Status: c.Query("status")}

	q := h.db.Model(&deliveries.Delivery{}).Where("rider_id = ?", userID)
	if f.Status != "" {
		q = q.Where("status = ?", f.Status)
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

func deliveriesRespond(c *fiber.Ctx, v any, err error) error {
	if err == nil {
		return httpx.OK(c, v)
	}
	var se *deliveries.SvcError
	if errors.As(err, &se) {
		return httpx.Err(c, se.Status, se.Message)
	}
	return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
}
