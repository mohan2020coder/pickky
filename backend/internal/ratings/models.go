package ratings

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Rating struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	DeliveryID uuid.UUID `gorm:"type:uuid;index;not null"`
	CustomerID uuid.UUID `gorm:"type:uuid;index;not null"`
	RiderID    uuid.UUID `gorm:"type:uuid;index;not null"`
	Stars      int       `gorm:"not null"`
	Comment    string    `gorm:"size:500"`
	Tags       string    `gorm:"type:jsonb"`
	CreatedAt  time.Time `gorm:"autoCreateTime"`
}

func AutoMigrate(db *gorm.DB) error { return db.AutoMigrate(&Rating{}) }
