package deliveries

import (
	"errors"

	"github.com/gofiber/fiber/v2"

	"pickky/backend/internal/auth"
	"pickky/backend/internal/httpx"
	"pickky/backend/internal/middleware"
)

type Deps struct {
	Auth fiber.Handler
	Svc  *Service
}

type handler struct{ svc *Service }

// Register mounts the customer/rider delivery endpoints.
func Register(app fiber.Router, d Deps) {
	h := &handler{svc: d.Svc}
	app.Post("/quote", d.Auth, h.quote)
	app.Post("/", d.Auth, h.create)
	app.Get("/", d.Auth, h.list)
	app.Get("/:id", d.Auth, h.get)
	app.Post("/:id/cancel", d.Auth, h.cancel)
	app.Post("/:id/verify", d.Auth, h.verify)
	app.Post("/:id/rating", d.Auth, h.rating)
	app.Post("/:id/status", d.Auth, middleware.RequireRole(auth.RoleRider, auth.RoleAdmin), h.status)
}

// svcRespond maps service failures onto their HTTP status 1:1.
func svcRespond(c *fiber.Ctx, v any, err error) error {
	if err == nil {
		return httpx.OK(c, v)
	}
	var se *SvcError
	if errors.As(err, &se) {
		return httpx.Err(c, se.Status, se.Message)
	}
	return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
}

func (h *handler) quote(c *fiber.Ctx) error {
	var req CreateRequest
	if err := httpx.Bind(c, &req, false); err != nil {
		return err
	}
	if req.Pickup.Addr == "" || req.Dropoff.Addr == "" {
		return httpx.Err(c, fiber.StatusUnprocessableEntity, "Pickup and destination are required.")
	}
	return httpx.OK(c, h.svc.Quote(req.Pickup, req.Dropoff))
}

func (h *handler) create(c *fiber.Ctx) error {
	userID, _ := httpx.GetUserID(c)
	var req CreateRequest
	if err := httpx.Bind(c, &req, false); err != nil {
		return err
	}
	d, err := h.svc.Create(c.Context(), userID, req)
	return svcRespond(c, d, err)
}

func (h *handler) list(c *fiber.Ctx) error {
	userID, _ := httpx.GetUserID(c)
	pg := httpx.PageFrom(c)
	items, total, err := h.svc.ListForUser(c.Context(), userID, ListFilter{
		Scope:  c.Query("scope"),
		Status: c.Query("status"),
		Page:   pg.Page,
		Limit:  pg.Limit,
	})
	if err != nil {
		return svcRespond(c, nil, err)
	}
	return httpx.OK(c, httpx.Paginated(items, pg, total))
}

// canView mirrors the mock: customer, assigned rider, ADMIN and SUPPORT.
func canView(c *fiber.Ctx, d *Delivery) bool {
	userID, _ := httpx.GetUserID(c)
	if d.CustomerID == userID {
		return true
	}
	if d.RiderID != nil && *d.RiderID == userID {
		return true
	}
	return middleware.HasRole(c, auth.RoleAdmin, auth.RoleSupport)
}

func (h *handler) get(c *fiber.Ctx) error {
	d, err := h.svc.GetRow(c.Context(), httpx.Param(c, "id"))
	if err != nil {
		return svcRespond(c, nil, err)
	}
	if !canView(c, d) {
		return httpx.Forbidden(c, "You don't have permission to view this delivery.")
	}
	dto, err := h.svc.hydrateOne(c.Context(), d)
	return svcRespond(c, dto, err)
}

func (h *handler) cancel(c *fiber.Ctx) error {
	userID, _ := httpx.GetUserID(c)
	d, err := h.svc.GetRow(c.Context(), httpx.Param(c, "id"))
	if err != nil {
		return svcRespond(c, nil, err)
	}
	isAdmin := middleware.HasRole(c, auth.RoleAdmin)
	if d.CustomerID != userID && !isAdmin {
		return httpx.Forbidden(c, "You don't have permission to cancel this delivery.")
	}
	var req struct {
		Reason string `json:"reason"`
	}
	_ = httpx.Bind(c, &req, true)
	reason := req.Reason
	if isAdmin && middleware.HasRole(c, auth.RoleAdmin) && d.CustomerID != userID {
		if reason == "" {
			reason = "Cancelled by admin"
		}
	}
	if d.CustomerID == userID && reason == "" {
		reason = "Cancelled by customer"
	}
	out, err := h.svc.Cancel(c.Context(), d, reason)
	return svcRespond(c, out, err)
}

func (h *handler) verify(c *fiber.Ctx) error {
	userID, _ := httpx.GetUserID(c)
	d, err := h.svc.GetRow(c.Context(), httpx.Param(c, "id"))
	if err != nil {
		return svcRespond(c, nil, err)
	}
	if !canView(c, d) {
		return httpx.Forbidden(c, "You don't have permission to view this delivery.")
	}
	var req struct {
		OTP   string `json:"otp"`
		Stage string `json:"stage"`
	}
	if err := httpx.Bind(c, &req, false); err != nil {
		return err
	}
	_ = userID
	out, err := h.svc.VerifyOTP(c.Context(), d, req.OTP, req.Stage)
	return svcRespond(c, out, err)
}

func (h *handler) rating(c *fiber.Ctx) error {
	userID, _ := httpx.GetUserID(c)
	d, err := h.svc.GetRow(c.Context(), httpx.Param(c, "id"))
	if err != nil {
		return svcRespond(c, nil, err)
	}
	var req struct {
		Stars   int      `json:"stars"`
		Comment string   `json:"comment"`
		Tags    []string `json:"tags"`
	}
	if err := httpx.Bind(c, &req, false); err != nil {
		return err
	}
	if err := h.svc.Rate(c.Context(), d, userID, req.Stars, req.Comment, req.Tags); err != nil {
		return svcRespond(c, nil, err)
	}
	return httpx.OK(c, fiber.Map{"ok": true})
}

func (h *handler) status(c *fiber.Ctx) error {
	d, err := h.svc.GetRow(c.Context(), httpx.Param(c, "id"))
	if err != nil {
		return svcRespond(c, nil, err)
	}
	userID, _ := httpx.GetUserID(c)
	isAdmin := middleware.HasRole(c, auth.RoleAdmin)
	if !isAdmin && (d.RiderID == nil || *d.RiderID != userID) {
		return httpx.Forbidden(c, "You don't have permission to update this delivery.")
	}
	var req struct {
		Status string `json:"status"`
		Note   string `json:"note"`
	}
	if err := httpx.Bind(c, &req, false); err != nil {
		return err
	}
	out, err := h.svc.UpdateStatus(c.Context(), d, ParseStatus(req.Status), req.Note, isAdmin)
	return svcRespond(c, out, err)
}
