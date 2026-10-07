package payments

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Payment struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	DeliveryID  uuid.UUID `gorm:"type:uuid;index;not null"`
	AmountMinor int64     `gorm:"not null"`
	Currency    string    `gorm:"size:3;not null;default:INR"`
	Method      string    `gorm:"size:20"`
	Status      string    `gorm:"size:20;index;not null"`
	Reference   string    `gorm:"size:100"`
	CreatedAt   time.Time `gorm:"autoCreateTime"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime"`
	CapturedAt  *time.Time
	FailedAt    *time.Time
}

type PaymentAttempt struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	PaymentID    uuid.UUID `gorm:"type:uuid;index;not null"`
	AmountMinor  int64     `gorm:"not null"`
	Status       string    `gorm:"size:20;not null"`
	RawResponse  string    `gorm:"type:text"`
	CreatedAt    time.Time `gorm:"autoCreateTime"`
}

type Refund struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	PaymentID    uuid.UUID `gorm:"type:uuid;index;not null"`
	AmountMinor  int64     `gorm:"not null"`
	Status       string    `gorm:"size:20;not null"`
	Reason       string    `gorm:"size:255"`
	CreatedAt    time.Time `gorm:"autoCreateTime"`
	ProcessedAt  *time.Time
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(&Payment{}, &PaymentAttempt{}, &Refund{})
}
