package events

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// Pub/Sub channels used to fan events out across backend instances.
const (
	ChannelDelivery     = "events:delivery"
	ChannelRider        = "events:rider"
	ChannelNotification = "events:notification"
	ChannelChat         = "events:chat"
	ChannelSupport      = "events:support"
	ChannelSystem       = "events:system"
)

const (
	eventLogTTL = 48 * time.Hour
	eventLogLen = 40
)

// Wire is the message published on Redis: the client-facing envelope plus the
// rooms it must reach. Clients never see the rooms field.
type Wire struct {
	Rooms    []string          `json:"rooms"`
	Envelope json.RawMessage   `json:"envelope"`
}

// Bus publishes domain events to Redis Pub/Sub (for the WebSocket hub) and
// mirrors them into a short-lived per-user event log used by GET /sync.
type Bus struct {
	rdb *redis.Client
}

func NewBus(rdb *redis.Client) *Bus { return &Bus{rdb: rdb} }

func (b *Bus) Publish(ctx context.Context, channel string, env Envelope, rooms ...string) error {
	payload, err := json.Marshal(env)
	if err != nil {
		return err
	}
	if b == nil || b.rdb == nil {
		return nil
	}

	// Recoverable copy for reconnecting clients (AGENTS.md §9): important
	// events are mirrored to Redis with a TTL so /sync can replay them.
	for _, room := range rooms {
		if !strings.HasPrefix(room, "user:") {
			continue
		}
		userID := strings.TrimPrefix(room, "user:")
		if _, err := uuid.Parse(userID); err != nil {
			continue
		}
		key := fmt.Sprintf("events:user:%s", userID)
		pipe := b.rdb.TxPipeline()
		pipe.RPush(ctx, key, payload)
		pipe.LTrim(ctx, key, -eventLogLen, -1)
		pipe.Expire(ctx, key, eventLogTTL)
		if _, err := pipe.Exec(ctx); err != nil {
			return err
		}
	}

	wire, err := json.Marshal(Wire{Rooms: rooms, Envelope: payload})
	if err != nil {
		return err
	}
	return b.rdb.Publish(ctx, channel, wire).Err()
}

// RecentEvents returns the tail of the per-user event log for sync recovery.
func (b *Bus) RecentEvents(ctx context.Context, userID uuid.UUID, limit int64) []Envelope {
	if b == nil || b.rdb == nil {
		return nil
	}
	if limit <= 0 || limit > eventLogLen {
		limit = eventLogLen
	}
	key := fmt.Sprintf("events:user:%s", userID.String())
	vals, err := b.rdb.LRange(ctx, key, -limit, -1).Result()
	if err != nil {
		return nil
	}
	out := make([]Envelope, 0, len(vals))
	for _, v := range vals {
		var env Envelope
		if err := json.Unmarshal([]byte(v), &env); err != nil {
			continue
		}
		out = append(out, env)
	}
	return out
}

// UserRoom is the canonical room name for a user's private event stream.
func UserRoom(userID uuid.UUID) string { return "user:" + userID.String() }
