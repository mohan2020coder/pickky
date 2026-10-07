package chat

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Conversation struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	DeliveryID uuid.UUID `gorm:"type:uuid;index;not null"`
	CreatedAt  time.Time `gorm:"autoCreateTime"`
	UpdatedAt  time.Time `gorm:"autoUpdateTime"`
}

type ConversationParticipant struct {
	ConversationID uuid.UUID `gorm:"type:uuid;primaryKey"`
	UserID         uuid.UUID `gorm:"type:uuid;primaryKey"`
	JoinedAt       time.Time `gorm:"autoCreateTime"`
}

type Message struct {
	ID             uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ConversationID uuid.UUID `gorm:"type:uuid;index;not null"`
	SenderID       uuid.UUID `gorm:"type:uuid;index;not null"`
	Body           string    `gorm:"type:text;not null"`
	ReadAt         *time.Time
	CreatedAt      time.Time `gorm:"autoCreateTime"`
}

type MessageRead struct {
	MessageID uuid.UUID `gorm:"type:uuid;primaryKey"`
	UserID    uuid.UUID `gorm:"type:uuid;primaryKey"`
	ReadAt    time.Time `gorm:"autoCreateTime"`
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(&Conversation{}, &ConversationParticipant{}, &Message{}, &MessageRead{})
}
