package locations

import (
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
	db *gorm.DB
}

func Register(app fiber.Router, d Deps) {
	h := &handler{db: d.DB}
	app.Get("/search", h.search)
	app.Get("/saved", d.Auth, h.listSaved)
	app.Post("/saved", d.Auth, h.createSaved)
	app.Post("/saved/:id/delete", d.Auth, h.deleteSaved)
}

type place struct {
	ID       string  `json:"id"`
	Title    string  `json:"title"`
	Subtitle string  `json:"subtitle"`
	Lat      float64 `json:"lat"`
	Lng      float64 `json:"lng"`
}

var places = []place{
	{ID: "p1", Title: "Koramangala, Bengaluru", Subtitle: "4th Block, 5th Cross", Lat: 12.9352, Lng: 77.6245},
	{ID: "p2", Title: "Indiranagar, Bengaluru", Subtitle: "100 Feet Road", Lat: 12.9719, Lng: 77.6412},
	{ID: "p3", Title: "HSR Layout, Bengaluru", Subtitle: "Sector 2, 27th Main", Lat: 12.9081, Lng: 77.6476},
	{ID: "p4", Title: "MG Road, Bengaluru", Subtitle: "Metro Station", Lat: 12.9756, Lng: 77.6063},
	{ID: "p5", Title: "Whitefield, Bengaluru", Subtitle: "ITPL Main Road", Lat: 12.9698, Lng: 77.7500},
	{ID: "p6", Title: "Jayanagar, Bengaluru", Subtitle: "4th Block", Lat: 12.9250, Lng: 77.5938},
	{ID: "p7", Title: "Bellandur, Bengaluru", Subtitle: "Outer Ring Road", Lat: 12.9305, Lng: 77.6784},
	{ID: "p8", Title: "Yelahanka, Bengaluru", Subtitle: "New Town", Lat: 13.1005, Lng: 77.5963},
}

func (h *handler) search(c *fiber.Ctx) error {
	q := strings.ToLower(strings.TrimSpace(c.Query("q")))
	out := make([]place, 0, len(places))
	for _, p := range places {
		if q == "" ||
			strings.Contains(strings.ToLower(p.Title), q) ||
			strings.Contains(strings.ToLower(p.Subtitle), q) {
			out = append(out, p)
		}
	}
	return httpx.OK(c, out)
}

// SavedAddress is a light GORM model for the saved_addresses table.
type SavedAddress struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID    uuid.UUID `gorm:"type:uuid;index;not null"`
	Label     string    `gorm:"size:60;not null"`
	Address   string    `gorm:"size:255;not null"`
	Lat       float64   `gorm:"not null"`
	Lng       float64   `gorm:"not null"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
}

func (SavedAddress) TableName() string { return "saved_addresses" }

type savedRecord struct {
	ID      uuid.UUID `json:"id"`
	Label   string    `json:"label"`
	Address string    `json:"address"`
	Lat     float64   `json:"lat"`
	Lng     float64   `json:"lng"`
}

func toSaved(a SavedAddress) savedRecord {
	return savedRecord{ID: a.ID, Label: a.Label, Address: a.Address, Lat: a.Lat, Lng: a.Lng}
}

func (h *handler) listSaved(c *fiber.Ctx) error {
	userID, _ := c.Locals(httpx.ContextUserID).(uuid.UUID)
	var items []SavedAddress
	if err := h.db.Where("user_id = ?", userID).Order("created_at ASC").Find(&items).Error; err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	out := make([]savedRecord, 0, len(items))
	for _, it := range items {
		out = append(out, toSaved(it))
	}
	return httpx.OK(c, out)
}

func (h *handler) createSaved(c *fiber.Ctx) error {
	userID, _ := c.Locals(httpx.ContextUserID).(uuid.UUID)
	var req struct {
		Label   string   `json:"label"`
		Address string   `json:"address"`
		Lat     *float64 `json:"lat"`
		Lng     *float64 `json:"lng"`
	}
	if err := httpx.Bind(c, &req, false); err != nil {
		return err
	}
	label := strings.TrimSpace(req.Label)
	address := strings.TrimSpace(req.Address)
	if label == "" || address == "" || req.Lat == nil || req.Lng == nil {
		return httpx.Unprocessable(c, "Please fill in all required fields.")
	}

	a := SavedAddress{UserID: userID, Label: label, Address: address, Lat: *req.Lat, Lng: *req.Lng}
	if err := h.db.Create(&a).Error; err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	return httpx.OK(c, toSaved(a))
}

func (h *handler) deleteSaved(c *fiber.Ctx) error {
	userID, _ := c.Locals(httpx.ContextUserID).(uuid.UUID)
	id, err := uuid.Parse(httpx.Param(c, "id"))
	if err != nil {
		return httpx.OK(c, fiber.Map{"ok": true})
	}
	if err := h.db.Where("id = ? AND user_id = ?", id, userID).
		Delete(&SavedAddress{}).Error; err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	return httpx.OK(c, fiber.Map{"ok": true})
}
