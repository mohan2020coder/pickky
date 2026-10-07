package deliveries

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Location struct {
	Lat      float64 `json:"lat"`
	Lng      float64 `json:"lng"`
	Addr     string  `json:"addr"`
	Postcode string  `json:"postcode,omitempty"`
}

type DeliveryItem struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	DeliveryID  uuid.UUID `gorm:"type:uuid;index;not null"`
	Description string    `gorm:"size:255;not null"`
	Quantity    int       `gorm:"default:1"`
	WeightKg    float64
	Fragile     bool
	CreatedAt   time.Time `gorm:"autoCreateTime"`
}

type Delivery struct {
	ID                uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	CustomerID        uuid.UUID `gorm:"type:uuid;index;not null"`
	RiderID           *uuid.UUID
	Status            Status `gorm:"size:40;index;not null"`
	Reference         string `gorm:"uniqueIndex;size:20"`
	PackageType       string `gorm:"size:30"`
	PickupLat         float64
	PickupLng         float64
	PickupAddr        string `gorm:"size:255"`
	DropoffLat        float64
	DropoffLng        float64
	DropoffAddr       string `gorm:"size:255"`
	Instructions      string `gorm:"size:500"`
	PriceMinor        int64  `gorm:"not null"`
	DistanceKm        float64
	PickupOTP         string `gorm:"size:10"`
	DeliveryOTP       string `gorm:"size:10"`
	PickupVerifiedAt  *time.Time
	DeliveredAt       *time.Time
	CancelledAt       *time.Time
	CancelReason      string `gorm:"size:255"`
	StatusChangedAt   time.Time
	CreatedAt         time.Time `gorm:"autoCreateTime"`
	UpdatedAt         time.Time `gorm:"autoUpdateTime"`
	Items             []DeliveryItem
	StatusHistory     []DeliveryStatusHistory
}

type DeliveryStatusHistory struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	DeliveryID uuid.UUID `gorm:"type:uuid;index;not null"`
	Status     Status    `gorm:"size:40;not null"`
	Note       string    `gorm:"size:255"`
	CreatedAt  time.Time `gorm:"autoCreateTime"`
}

// TableName keeps the singular form used by 0001_init.sql (GORM would
// otherwise pluralize to delivery_status_histories).
func (DeliveryStatusHistory) TableName() string { return "delivery_status_history" }

type DeliveryAssignment struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	DeliveryID  uuid.UUID `gorm:"type:uuid;index;not null"`
	RiderID     uuid.UUID `gorm:"type:uuid;index;not null"`
	Status      string    `gorm:"size:20;not null"`
	OfferedAt   time.Time
	ExpiresAt   *time.Time
	RespondedAt *time.Time
	Accepted    *bool
	CreatedAt   time.Time `gorm:"autoCreateTime"`
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(&Delivery{}, &DeliveryItem{}, &DeliveryStatusHistory{}, &DeliveryAssignment{})
}
