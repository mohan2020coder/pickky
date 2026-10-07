package admin

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ServiceZone struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name      string    `gorm:"size:100;not null"`
	Polygon   string    `gorm:"type:jsonb"`
	IsActive  bool      `gorm:"default:true"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
	UpdatedAt time.Time `gorm:"autoUpdateTime"`
}

type PricingRule struct {
	ID             uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name           string    `gorm:"size:100;not null"`
	BaseMinor      int64     `gorm:"not null"`
	PerKMMinor     int64     `gorm:"not null"`
	ServiceZoneID  *uuid.UUID
	ActiveFrom     time.Time
	ActiveTo       *time.Time
	IsActive       bool      `gorm:"default:true"`
	CreatedAt      time.Time `gorm:"autoCreateTime"`
	UpdatedAt      time.Time `gorm:"autoUpdateTime"`
}

type AuditLog struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ActorID    *uuid.UUID
	Action     string `gorm:"size:100;not null"`
	EntityType string `gorm:"size:40"`
	EntityID   *uuid.UUID
	IP         string `gorm:"size:45"`
	UserAgent  string `gorm:"size:255"`
	Details    string `gorm:"type:jsonb"`
	CreatedAt  time.Time `gorm:"autoCreateTime"`
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(&ServiceZone{}, &PricingRule{}, &AuditLog{})
}
