package redisx

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/redis/go-redis/v9"

	"pickky/backend/internal/config"
	"pickky/backend/internal/events"
)

var (
	ErrLockNotAcquired = errors.New("lock not acquired")
)

type PubSub struct {
	rdb *redis.Client
}

func NewPubSub(c *Client) *PubSub { return &PubSub{rdb: c.R} }

func (p *PubSub) Publish(ctx context.Context, channel string, evt events.Envelope) error {
	b, err := json.Marshal(evt)
	if err != nil {
		return err
	}
	return p.rdb.Publish(ctx, channel, b).Err()
}

func (p *PubSub) Subscribe(ctx context.Context, channels ...string) <-chan *redis.Message {
	return p.rdb.Subscribe(ctx, channels...).Channel()
}

func (c *Client) WithLock(ctx context.Context, cfg *config.Config, key string, fn func() error) error {
	lockKey := "lock:" + key
	ok, err := c.R.SetNX(ctx, lockKey, "1", cfg.LockTTL).Result()
	if err != nil {
		return err
	}
	if !ok {
		return ErrLockNotAcquired
	}
	defer c.R.Del(ctx, lockKey)
	return fn()
}
