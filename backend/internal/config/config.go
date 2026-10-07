package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port string
	Env  string
	// LogLevel is debug|info|warn|error (slog). Unknown values fall back to info.
	LogLevel string
	// HTTPLogs enables per-request access logs (fiber logger middleware).
	// Defaults to true in dev, false otherwise.
	HTTPLogs           bool
	DB                 DBConfig
	Redis             RedisConfig
	JWT               JWTConfig
	CORSAllowedOrigins string
	Pricing           PricingConfig
	OTP               OTPConfig
	PresenceTTL       time.Duration
	LocationTTL       time.Duration
	LockTTL           time.Duration
	OfferTTL          time.Duration
	RPCDeadline       time.Duration
	// Simulate drives the server-side delivery lifecycle theatre used in dev
	// when no real rider accepts an offer.
	Simulate bool
}

type DBConfig struct {
	Host     string
	Port     int
	Name     string
	User     string
	Password string
	SSLMode  string
}

type RedisConfig struct {
	Host         string
	Port         int
	Password     string
	DB           int
	PoolSize     int
	MinIdle      int
	ConnTimeout  time.Duration
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
}

type JWTConfig struct {
	Secret     string
	AccessTTL  time.Duration
	RefreshTTL time.Duration
}

type PricingConfig struct {
	DefaultBaseMinor int64
	PerKMMinor       int64
}

type OTPConfig struct {
	TTL time.Duration
	// FixedCode is the OTP accepted in dev/demo environments (README documents
	// "OTP is always 1234"). A real SMS provider would replace this later.
	FixedCode string
}

func Load() (*Config, error) {
	c := &Config{}
	c.Port = getEnv("PORT", "8080")
	c.Env = getEnv("APP_ENV", "dev")
	c.LogLevel = strings.ToLower(getEnv("LOG_LEVEL", "info"))
	// HTTP_LOGS=on/off overrides the dev default (on in dev, off otherwise).
	httpLogsDefault := "off"
	if c.Env == "dev" {
		httpLogsDefault = "on"
	}
	switch strings.ToLower(getEnv("HTTP_LOGS", httpLogsDefault)) {
	case "true", "on", "1", "yes":
		c.HTTPLogs = true
	default:
		c.HTTPLogs = false
	}
	c.CORSAllowedOrigins = getEnv("CORS_ALLOWED_ORIGINS", "*")

	dbPort, _ := strconv.Atoi(getEnv("DB_PORT", "5432"))
	c.DB = DBConfig{
		Host:     getEnv("DB_HOST", "localhost"),
		Port:     dbPort,
		Name:     getEnv("DB_NAME", "pickky"),
		User:     getEnv("DB_USER", "pickky"),
		Password: getEnv("DB_PASSWORD", "pickky"),
		SSLMode:  getEnv("DB_SSLMODE", "disable"),
	}

	rPort, _ := strconv.Atoi(getEnv("REDIS_PORT", "6379"))
	rPool, _ := strconv.Atoi(getEnv("REDIS_POOL_SIZE", "10"))
	rMinIdle, _ := strconv.Atoi(getEnv("REDIS_MIN_IDLE", "2"))
	c.Redis = RedisConfig{
		Host:         getEnv("REDIS_HOST", "localhost"),
		Port:         rPort,
		Password:     getEnv("REDIS_PASSWORD", ""),
		DB:           atoi(getEnv("REDIS_DB", "0")),
		PoolSize:     rPool,
		MinIdle:      rMinIdle,
		ConnTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
	}

	c.JWT.Secret = getEnv("JWT_SECRET", "dev")
	c.JWT.AccessTTL = d(getEnv("JWT_ACCESS_TTL", "15m"))
	c.JWT.RefreshTTL = d(getEnv("JWT_REFRESH_TTL", "7d"))

	c.Pricing.DefaultBaseMinor = atoi64(getEnv("PRICING_DEFAULT_BASE_MINOR", "4000"))
	c.Pricing.PerKMMinor = atoi64(getEnv("PRICING_PER_KM_MINOR", "1500"))

	c.OTP.TTL = d(getEnv("OTP_TTL", "300s"))
	c.OTP.FixedCode = getEnv("OTP_FIXED_CODE", "1234")
	c.Simulate = strings.EqualFold(getEnv("DELIVERY_SIMULATION", "true"), "true")
	c.PresenceTTL = d(getEnv("PRESENCE_TTL", "5m"))
	c.LocationTTL = d(getEnv("LOCATION_TTL", "5m"))
	c.LockTTL = d(getEnv("LOCK_TTL", "5s"))
	c.OfferTTL = d(getEnv("OFFER_TTL", "30s"))
	c.RPCDeadline = d(getEnv("RPC_DEADLINE", "5s"))
	return c, nil
}

func getEnv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
func atoi(s string) int { v, _ := strconv.Atoi(s); return v }
func atoi64(s string) int64 { v, _ := strconv.ParseInt(s, 10, 64); return v }
func d(s string) time.Duration { v, _ := time.ParseDuration(s); return v }

func (c *Config) DSN() string {
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.DB.Host, c.DB.Port, c.DB.User, c.DB.Password, c.DB.Name, c.DB.SSLMode)
}
