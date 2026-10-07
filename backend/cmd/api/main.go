package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	fiberlogger "github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/requestid"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"pickky/backend/internal/admin"
	"pickky/backend/internal/auth"
	"pickky/backend/internal/chat"
	"pickky/backend/internal/config"
	"pickky/backend/internal/database"
	"pickky/backend/internal/deliveries"
	"pickky/backend/internal/events"
	"pickky/backend/internal/locations"
	"pickky/backend/internal/httpx"
	"pickky/backend/internal/logger"
	"pickky/backend/internal/middleware"
	"pickky/backend/internal/notifications"
	"pickky/backend/internal/presence"
	"pickky/backend/internal/redisx"
	"pickky/backend/internal/riders"
	"pickky/backend/internal/support"
	"pickky/backend/internal/sync"
	"pickky/backend/internal/websocket"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}
	log := logger.New(cfg.Env, cfg.LogLevel)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// --- connect dependencies (retry: container orchestration may still be
	// bringing Postgres/Redis up when we start) ---
	db := connectDB(cfg, log)
	applyMigrations(db, log)
	rdb := connectRedis(cfg, log)

	bus := events.NewBus(rdb.R)
	pres := presence.New(rdb.R, cfg.PresenceTTL, cfg.LocationTTL)
	jwt := auth.NewJWT(cfg.JWT.Secret, cfg.JWT.AccessTTL, cfg.JWT.RefreshTTL)
	authMW := middleware.Auth(jwt, db)

	// --- domain services ---
	dsvc := deliveries.NewService(db, cfg, bus, pres, rdb.R, log)
	sim := deliveries.NewSimulator(dsvc, cfg, log)
	dsvc.SetSimulator(sim)

	// --- websocket hub ---
	hub := websocket.NewHub(rdb.R, db, jwt, websocket.Hooks{
		OnPing: func(userID string) {
			if id, err := uuid.Parse(userID); err == nil {
				_ = pres.Touch(context.Background(), id)
			}
		},
		OnLocation: func(userID string, p websocket.LocationPayload) error {
			uid, err := uuid.Parse(userID)
			if err != nil {
				return err
			}
			did, err := uuid.Parse(p.DeliveryID)
			if err != nil {
				return err
			}
			return dsvc.HandleLocation(ctx, uid, deliveries.LocationUpdate{
				DeliveryID: did, Lat: p.Lat, Lng: p.Lng,
				Heading: p.Heading, Speed: p.Speed, Accuracy: p.Accuracy,
			})
		},
		OnChatMessage: func(userID string, p websocket.ChatMessagePayload) (any, error) {
			uid, err := uuid.Parse(userID)
			if err != nil {
				return nil, err
			}
			return chat.SendMessageByUser(db, bus, uid, p.ConversationID, p.Body)
		},
		OnTyping: func(userID string, p websocket.TypingPayload) error {
			uid, err := uuid.Parse(userID)
			if err != nil {
				return err
			}
			return chat.TypingByUser(db, bus, uid, p.ConversationID, p.Typing)
		},
	}, log)

	// --- http ---
	app := fiber.New(fiber.Config{AppName: "pickky", ErrorHandler: httpx.ErrorHandler})
	app.Use(requestid.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: cfg.CORSAllowedOrigins,
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
	}))
	if cfg.HTTPLogs {
		// Per-request access log; request id comes from requestid middleware.
		app.Use(fiberlogger.New(fiberlogger.Config{
			Format: "${time} status=${status} reqid=${locals:requestid} ${method} ${url} latency=${latency} ip=${ip} err=${error}\n",
		}))
	}

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "time": time.Now().UTC()})
	})
	app.Get("/ready", func(c *fiber.Ctx) error {
		sqlDB, err := db.DB()
		if err != nil || sqlDB.PingContext(c.Context()) != nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"status": "degraded"})
		}
		if err := rdb.R.Ping(c.Context()).Err(); err != nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"status": "degraded", "redis": "down"})
		}
		return c.JSON(fiber.Map{"status": "ready"})
	})

	app.Get("/ws", hub.Handler())

	api := app.Group("/api/v1")

	// auth — login/register/refresh/OTP stay public; session routes guarded.
	ah := auth.NewHandler(db, cfg, jwt)
	ah.Register(api.Group("/auth"), authMW)

	deliveries.Register(api.Group("/deliveries"), deliveries.Deps{Auth: authMW, Svc: dsvc})
	riders.Register(api.Group("/riders"), riders.Deps{
		Auth: authMW, DB: db, Bus: bus, Presence: pres, Cfg: cfg, Svc: dsvc,
	})
	notifications.Register(api.Group("/notifications"), notifications.Deps{DB: db, Bus: bus, Auth: authMW})
	chat.Register(api.Group("/conversations"), chat.Deps{DB: db, Bus: bus, Auth: authMW})
	locations.Register(api.Group("/locations"), locations.Deps{DB: db, Bus: bus, Auth: authMW})
	support.Register(api.Group("/support"), support.Deps{Auth: authMW, DB: db, Bus: bus})
	admin.Register(api.Group("/admin"), admin.Deps{Auth: authMW, DB: db, Svc: dsvc, Presence: pres})
	sync.Register(api.Group("/sync"), sync.Deps{Auth: authMW, DB: db, Bus: bus, Presence: pres, Svc: dsvc})

	// --- background workers ---
	go hub.Run(ctx)
	go offerSweeper(ctx, dsvc, log)
	go heartbeatSweeper(ctx, pres, log)

	go func() {
		if err := app.Listen(":" + cfg.Port); err != nil {
			log.Error(err.Error())
			os.Exit(1)
		}
	}()
	log.Info("api listening", "port", cfg.Port, "env", cfg.Env, "level", cfg.LogLevel, "http_logs", cfg.HTTPLogs, "simulate", cfg.Simulate)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	cancel()
	shutCtx, shutCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutCancel()
	_ = app.ShutdownWithContext(shutCtx)
	log.Info("shutting down")
}

// offerSweeper expires stale rider offers and re-matches deliveries that are
// still searching.
func offerSweeper(ctx context.Context, dsvc *deliveries.Service, log *slog.Logger) {
	t := time.NewTicker(5 * time.Second)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			dsvc.ExpireOffers(ctx)
		}
	}
}

// heartbeatSweeper reports on presence; Redis TTL is the actual authority, so
// this only logs when the fleet looks empty.
func heartbeatSweeper(ctx context.Context, pres *presence.Store, log *slog.Logger) {
	t := time.NewTicker(30 * time.Second)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			ids, err := pres.OnlineRiderIDs(ctx)
			if err != nil {
				log.Info("presence unavailable", "err", err)
				continue
			}
			log.Info("presence heartbeat", "online_riders", len(ids))
		}
	}
}

func connectDB(cfg *config.Config, log *slog.Logger) *gorm.DB {
	for i := 1; i <= 60; i++ {
		db, err := database.Connect(cfg)
		if err == nil {
			return db
		}
		log.Warn("waiting for postgres", "attempt", i, "err", err)
		time.Sleep(time.Second)
	}
	log.Error("postgres unavailable")
	os.Exit(1)
	return nil
}

func applyMigrations(db *gorm.DB, log *slog.Logger) {
	sqlDB, err := db.DB()
	if err != nil {
		return
	}
	applied, err := database.Migrate(sqlDB, os.Getenv("MIGRATIONS_DIR"))
	if err != nil {
		log.Info("migrations skipped", "err", err)
		return
	}
	if len(applied) > 0 {
		log.Info("migrations applied", "files", applied)
	}
}

func connectRedis(cfg *config.Config, log *slog.Logger) *redisx.Client {
	for i := 1; i <= 60; i++ {
		rdb, err := redisx.Connect(cfg)
		if err == nil {
			return rdb
		}
		log.Warn("waiting for redis", "attempt", i, "err", err)
		time.Sleep(time.Second)
	}
	log.Error("redis unavailable")
	os.Exit(1)
	return nil
}
