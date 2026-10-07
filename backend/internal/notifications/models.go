package notifications

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Notification struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID    uuid.UUID `gorm:"type:uuid;index;not null"`
	Type      string    `gorm:"size:40;not null"`
	Title     string    `gorm:"size:120;not null"`
	Message   string    `gorm:"size:500;not null"`
	Data      string    `gorm:"type:jsonb"`
	ReadAt    *time.Time
	CreatedAt time.Time `gorm:"autoCreateTime"`
}

type NotificationPreference struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID       uuid.UUID `gorm:"type:uuid;uniqueIndex;not null"`
	InAppEnabled bool      `gorm:"default:true"`
	CreatedAt    time.Time `gorm:"autoCreateTime"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime"`
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(&Notification{}, &NotificationPreference{})
}
