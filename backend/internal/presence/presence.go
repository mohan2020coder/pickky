package presence

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// Store keeps short-lived rider presence and live delivery location in Redis.
// PostgreSQL remains the source of truth for durable rider state.
type Store struct {
	rdb         *redis.Client
	presenceTTL time.Duration
	locationTTL time.Duration
}

func New(rdb *redis.Client, presenceTTL, locationTTL time.Duration) *Store {
	return &Store{rdb: rdb, presenceTTL: presenceTTL, locationTTL: locationTTL}
}

func riderKey(userID uuid.UUID) string { return fmt.Sprintf("presence:rider:%s", userID) }
func viewerKey(deliveryID uuid.UUID) string {
	return fmt.Sprintf("delivery:%s:viewers", deliveryID)
}

type RiderPresence struct {
	UserID    uuid.UUID `json:"user_id"`
	Status    string    `json:"status"`
	Lat       float64   `json:"lat"`
	Lng       float64   `json:"lng"`
	LastSeen  time.Time `json:"last_seen"`
	ExpiresAt time.Time `json:"-"`
}

// Set records rider presence and refreshes the TTL heartbeat.
func (s *Store) Set(ctx context.Context, userID uuid.UUID, status string, lat, lng float64) error {
	p := RiderPresence{
		UserID:   userID,
		Status:   status,
		Lat:      lat,
		Lng:      lng,
		LastSeen: time.Now().UTC(),
	}
	b, err := json.Marshal(p)
	if err != nil {
		return err
	}
	return s.rdb.Set(ctx, riderKey(userID), b, s.presenceTTL).Err()
}

// Touch refreshes the TTL without changing the stored payload.
func (s *Store) Touch(ctx context.Context, userID uuid.UUID) error {
	return s.rdb.Expire(ctx, riderKey(userID), s.presenceTTL).Err()
}

func (s *Store) Remove(ctx context.Context, userID uuid.UUID) error {
	return s.rdb.Del(ctx, riderKey(userID)).Err()
}

func (s *Store) Get(ctx context.Context, userID uuid.UUID) (*RiderPresence, error) {
	val, err := s.rdb.Get(ctx, riderKey(userID)).Result()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var p RiderPresence
	if err := json.Unmarshal([]byte(val), &p); err != nil {
		return nil, err
	}
	return &p, nil
}

// OnlineRiderIDs scans presence keys to find currently-online riders.
// A key expiring is the STALE -> OFFLINE signal described in AGENTS.md.
func (s *Store) OnlineRiderIDs(ctx context.Context) ([]uuid.UUID, error) {
	var ids []uuid.UUID
	iter := s.rdb.Scan(ctx, 0, "presence:rider:*", 100).Iterator()
	for iter.Next(ctx) {
		raw := strings.TrimPrefix(iter.Val(), "presence:rider:")
		id, err := uuid.Parse(raw)
		if err != nil {
			continue
		}
		ids = append(ids, id)
	}
	return ids, iter.Err()
}

// SaveLocation stores the latest GPS fix for an active delivery with a TTL.
func (s *Store) SaveLocation(ctx context.Context, deliveryID uuid.UUID, lat, lng, heading, speed, accuracy float64) error {
	key := fmt.Sprintf("delivery:%s:location", deliveryID)
	fields := map[string]interface{}{
		"lat":       strconv.FormatFloat(lat, 'f', 6, 64),
		"lng":       strconv.FormatFloat(lng, 'f', 6, 64),
		"heading":   strconv.FormatFloat(heading, 'f', 2, 64),
		"speed":     strconv.FormatFloat(speed, 'f', 2, 64),
		"accuracy":  strconv.FormatFloat(accuracy, 'f', 2, 64),
		"timestamp": strconv.FormatInt(time.Now().UTC().UnixMilli(), 10),
	}
	pipe := s.rdb.TxPipeline()
	pipe.HSet(ctx, key, fields)
	pipe.Expire(ctx, key, s.locationTTL)
	_, err := pipe.Exec(ctx)
	return err
}

func (s *Store) Location(ctx context.Context, deliveryID uuid.UUID) (map[string]string, error) {
	key := fmt.Sprintf("delivery:%s:location", deliveryID)
	return s.rdb.HGetAll(ctx, key).Result()
}

func (s *Store) SetViewers(ctx context.Context, deliveryID uuid.UUID, userID uuid.UUID, ttl time.Duration) error {
	return s.rdb.SAdd(ctx, viewerKey(deliveryID), userID.String()).Err()
}
