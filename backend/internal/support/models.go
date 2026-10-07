package support

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Ticket struct {
	ID         uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	CustomerID uuid.UUID  `gorm:"type:uuid;index;not null"`
	AssigneeID *uuid.UUID
	DeliveryID *uuid.UUID
	Subject    string `gorm:"size:120;not null"`
	Reference  string `gorm:"size:20"`
	Status     string `gorm:"size:20;index;not null"`
	Priority   string `gorm:"size:20"`
	Category   string `gorm:"size:40"`
	CreatedAt  time.Time `gorm:"autoCreateTime"`
	UpdatedAt  time.Time `gorm:"autoUpdateTime"`
	ResolvedAt *time.Time
	ClosedAt   *time.Time
}

// TableName pins the support_* table names from 0001_init.sql (GORM would
// pluralize Ticket to "tickets").
func (Ticket) TableName() string { return "support_tickets" }

type TicketMessage struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TicketID  uuid.UUID `gorm:"type:uuid;index;not null"`
	SenderID  uuid.UUID `gorm:"type:uuid;index;not null"`
	Body      string    `gorm:"type:text;not null"`
	IsInternal bool     `gorm:"default:false"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
}

func (TicketMessage) TableName() string { return "support_messages" }

type TicketNote struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TicketID  uuid.UUID `gorm:"type:uuid;index;not null"`
	AuthorID  uuid.UUID `gorm:"type:uuid;index;not null"`
	Note      string    `gorm:"type:text;not null"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
}

func (TicketNote) TableName() string { return "support_notes" }

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(&Ticket{}, &TicketMessage{}, &TicketNote{})
}
