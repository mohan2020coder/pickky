package redisx

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"

	"pickky/backend/internal/config"
)

type Client struct {
	R *redis.Client
}

func Connect(cfg *config.Config) (*Client, error) {
	r := redis.NewClient(&redis.Options{
		Addr:         fmt.Sprintf("%s:%d", cfg.Redis.Host, cfg.Redis.Port),
		Password:     cfg.Redis.Password,
		DB:           cfg.Redis.DB,
		PoolSize:     cfg.Redis.PoolSize,
		MinIdleConns: cfg.Redis.MinIdle,
		DialTimeout:  cfg.Redis.ConnTimeout,
		ReadTimeout:  cfg.Redis.ReadTimeout,
		WriteTimeout: cfg.Redis.WriteTimeout,
	})
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := r.Ping(ctx).Err(); err != nil {
		return nil, err
	}
	return &Client{R: r}, nil
}
