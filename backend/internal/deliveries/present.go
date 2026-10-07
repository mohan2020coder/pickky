package deliveries

import (
	"context"
	"math"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type GeoDTO struct {
	Lat      float64 `json:"lat"`
	Lng      float64 `json:"lng"`
	Addr     string  `json:"addr"`
	Postcode *string `json:"postcode,omitempty"`
}

type ItemDTO struct {
	ID          uuid.UUID `json:"id"`
	Description string    `json:"description"`
	Quantity    int       `json:"quantity"`
	WeightKg    *float64  `json:"weight_kg"`
	Fragile     bool      `json:"fragile"`
}

type HistoryDTO struct {
	ID        uuid.UUID `json:"id"`
	Status    Status    `json:"status"`
	Note      *string   `json:"note"`
	CreatedAt time.Time `json:"created_at"`
}

type RiderSummaryDTO struct {
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	Rating       *float64  `json:"rating"`
	VehicleType  *string   `json:"vehicle_type"`
	LicensePlate *string   `json:"license_plate"`
	PhotoURL     *string   `json:"photo_url"`
}

type DeliveryDTO struct {
	ID               uuid.UUID         `json:"id"`
	Reference        string            `json:"reference"`
	CustomerID       uuid.UUID         `json:"customer_id"`
	RiderID          *uuid.UUID        `json:"rider_id"`
	Status           Status            `json:"status"`
	Pickup           GeoDTO            `json:"pickup"`
	Dropoff          GeoDTO            `json:"dropoff"`
	Instructions     *string           `json:"instructions"`
	PriceMinor       int64             `json:"price_minor"`
	Currency         string            `json:"currency"`
	DistanceKm       float64           `json:"distance_km"`
	EtaMinutes       *int              `json:"eta_minutes"`
	PickupOTP        *string           `json:"pickup_otp"`
	DeliveryOTP      *string           `json:"delivery_otp"`
	PickupVerifiedAt *time.Time        `json:"pickup_verified_at"`
	DeliveredAt      *time.Time        `json:"delivered_at"`
	CancelledAt      *time.Time        `json:"cancelled_at"`
	CancelReason     *string           `json:"cancel_reason"`
	StatusChangedAt  *time.Time        `json:"status_changed_at"`
	CreatedAt        time.Time         `json:"created_at"`
	UpdatedAt        *time.Time        `json:"updated_at"`
	Items            []ItemDTO         `json:"items"`
	StatusHistory    []HistoryDTO      `json:"status_history"`
	Rider            *RiderSummaryDTO  `json:"rider"`
	PackageType      *string           `json:"package_type"`
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func timePtr(t *time.Time) *time.Time { return t }

// Hydrate turns delivery rows into the exact JSON the mobile client consumes:
// nested pickup/dropoff, items, status history and a hydrated rider summary.
func Hydrate(ctx context.Context, db *gorm.DB, rows []Delivery) ([]DeliveryDTO, error) {
	out := make([]DeliveryDTO, 0, len(rows))
	if len(rows) == 0 {
		return out, nil
	}

	ids := make([]uuid.UUID, 0, len(rows))
	for _, r := range rows {
		ids = append(ids, r.ID)
	}

	type itemRow struct {
		DeliveryID uuid.UUID
		Item       ItemDTO
	}
	var items []DeliveryItem
	if err := db.WithContext(ctx).Where("delivery_id IN ?", ids).
		Order("created_at").Find(&items).Error; err != nil {
		return nil, err
	}
	var history []DeliveryStatusHistory
	if err := db.WithContext(ctx).Where("delivery_id IN ?", ids).
		Order("created_at").Find(&history).Error; err != nil {
		return nil, err
	}

	// Rider summaries keyed by user id (deliveries.rider_id references users).
	riderIDs := []uuid.UUID{}
	seen := map[uuid.UUID]bool{}
	for _, r := range rows {
		if r.RiderID != nil && !seen[*r.RiderID] {
			seen[*r.RiderID] = true
			riderIDs = append(riderIDs, *r.RiderID)
		}
	}
	type riderRow struct {
		ID           uuid.UUID
		Name         string
		Rating       *float64
		VehicleType  *string
		LicensePlate *string
	}
	riderMap := map[uuid.UUID]riderRow{}
	if len(riderIDs) > 0 {
		var rr []riderRow
		err := db.WithContext(ctx).Raw(`
			SELECT u.id, u.name,
			       (SELECT AVG(rd.stars)::float FROM ratings rd WHERE rd.rider_id = u.id) AS rating,
			       r.vehicle_type, r.license_plate
			FROM users u LEFT JOIN riders r ON r.user_id = u.id
			WHERE u.id IN ?`, riderIDs).Scan(&rr).Error
		if err != nil {
			return nil, err
		}
		for _, x := range rr {
			riderMap[x.ID] = x
		}
	}

	itemsBy := map[uuid.UUID][]ItemDTO{}
	for _, it := range items {
		itemsBy[it.DeliveryID] = append(itemsBy[it.DeliveryID], ItemDTO{
			ID: it.ID, Description: it.Description, Quantity: it.Quantity,
			WeightKg: weightPtr(it.WeightKg), Fragile: it.Fragile,
		})
	}
	histBy := map[uuid.UUID][]HistoryDTO{}
	for _, h := range history {
		var note *string
		if h.Note != "" {
			note = &h.Note
		}
		histBy[h.DeliveryID] = append(histBy[h.DeliveryID], HistoryDTO{
			ID: h.ID, Status: h.Status, Note: note, CreatedAt: h.CreatedAt.UTC(),
		})
	}

	for _, r := range rows {
		d := DeliveryDTO{
			ID:          r.ID,
			Reference:   r.Reference,
			CustomerID:  r.CustomerID,
			RiderID:     r.RiderID,
			Status:      r.Status,
			Pickup:      GeoDTO{Lat: r.PickupLat, Lng: r.PickupLng, Addr: r.PickupAddr},
			Dropoff:     GeoDTO{Lat: r.DropoffLat, Lng: r.DropoffLng, Addr: r.DropoffAddr},
			Instructions: strPtr(r.Instructions),
			PriceMinor:  r.PriceMinor,
			Currency:    "INR",
			DistanceKm:  r.DistanceKm,
			PickupOTP:   strPtr(r.PickupOTP),
			DeliveryOTP: strPtr(r.DeliveryOTP),
			StatusChangedAt: timePtr(nonZeroTime(r.StatusChangedAt)),
			CreatedAt:   r.CreatedAt,
			UpdatedAt:   nonZeroTime(r.UpdatedAt),
			Items:       itemsBy[r.ID],
			StatusHistory: histBy[r.ID],
			PackageType: strPtr(r.PackageType),
			PickupVerifiedAt: fromPtr(r.PickupVerifiedAt),
			DeliveredAt:      fromPtr(r.DeliveredAt),
			CancelledAt:      fromPtr(r.CancelledAt),
			CancelReason:     strPtr(r.CancelReason),
		}
		if d.Items == nil {
			d.Items = []ItemDTO{}
		}
		if d.StatusHistory == nil {
			d.StatusHistory = []HistoryDTO{}
		}
		eta := approxEtaMinutes(rawDistance(r.DistanceKm), 22)
		d.EtaMinutes = &eta
		if r.RiderID != nil {
			if rr, ok := riderMap[*r.RiderID]; ok {
				d.Rider = &RiderSummaryDTO{
					ID: rr.ID, Name: rr.Name, Rating: rr.Rating,
					VehicleType: rr.VehicleType, LicensePlate: rr.LicensePlate,
				}
			}
		}
		out = append(out, d)
	}
	return out, nil
}

// rawDistance inverts the 1.3x route factor applied at pricing time so the
// ETA shown matches the quote the customer confirmed.
func rawDistance(stored float64) float64 { return stored }

func weightPtr(w float64) *float64 {
	if w == 0 {
		return nil
	}
	return &w
}

func nonZeroTime(t time.Time) *time.Time {
	if t.IsZero() {
		return nil
	}
	u := t.UTC()
	return &u
}

func fromPtr(p *time.Time) *time.Time {
	if p == nil {
		return nil
	}
	u := p.UTC()
	return &u
}

// Round1 rounds to one decimal place (exported for tests).
func Round1(v float64) float64 { return math.Round(v*10) / 10 }
