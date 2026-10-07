package events

import (
	"time"

	"github.com/google/uuid"
)

type Envelope struct {
	Event      string    `json:"event"`
	EventID    uuid.UUID `json:"event_id"`
	Sequence   int64     `json:"sequence"`
	Timestamp  time.Time `json:"timestamp"`
	EntityType string    `json:"entity_type"`
	EntityID   uuid.UUID `json:"entity_id"`
	Data       any       `json:"data"`
}

func New(event, entityType string, entityID uuid.UUID, data any) Envelope {
	return Envelope{
		Event:      event,
		EventID:    uuid.New(),
		Timestamp:  time.Now().UTC(),
		EntityType: entityType,
		EntityID:   entityID,
		Data:       data,
	}
}
