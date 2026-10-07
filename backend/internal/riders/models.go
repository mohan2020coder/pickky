package riders

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Rider struct {
	ID               uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID           uuid.UUID `gorm:"type:uuid;uniqueIndex;not null"`
	Status           string    `gorm:"size:20;index;not null"` // OFFLINE, ONLINE, BUSY
	VehicleType      string    `gorm:"size:30"`
	LicensePlate     string    `gorm:"size:20"`
	Lat              float64
	Lng              float64
	LastLocationAt   *time.Time
	IsVerified       bool `gorm:"default:false"`
	IsSuspended      bool `gorm:"default:false"`
	CreatedAt        time.Time `gorm:"autoCreateTime"`
	UpdatedAt        time.Time `gorm:"autoUpdateTime"`
}

type RiderDocument struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	RiderID   uuid.UUID `gorm:"type:uuid;index;not null"`
	Type      string    `gorm:"size:30;not null"`
	FileURL   string    `gorm:"size:255;not null"`
	Verified  bool      `gorm:"default:false"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
}

type RiderVehicle struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	RiderID      uuid.UUID `gorm:"type:uuid;index;not null"`
	Type         string    `gorm:"size:30;not null"`
	LicensePlate string    `gorm:"size:20;not null"`
	Color        string    `gorm:"size:30"`
	Year         int
	CreatedAt    time.Time `gorm:"autoCreateTime"`
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(&Rider{}, &RiderDocument{}, &RiderVehicle{})
}
