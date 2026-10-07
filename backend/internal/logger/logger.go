package logger

import (
	"log/slog"
	"os"
	"strings"
)

// New builds the process logger.
// env: "dev" -> human-readable text on stdout, anything else -> JSON on stdout.
// level: debug|info|warn|error (case-insensitive); unknown/empty falls back to info.
func New(env string, level string) *slog.Logger {
	var lvl slog.Level
	switch strings.ToLower(strings.TrimSpace(level)) {
	case "debug":
		lvl = slog.LevelDebug
	case "warn", "warning":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	default:
		lvl = slog.LevelInfo
	}
	opts := &slog.HandlerOptions{Level: lvl}
	var h slog.Handler
	if env == "dev" {
		h = slog.NewTextHandler(os.Stdout, opts)
	} else {
		h = slog.NewJSONHandler(os.Stdout, opts)
	}
	return slog.New(h)
}
