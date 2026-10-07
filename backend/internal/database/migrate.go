package database

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// Migrate applies every .sql file in dir exactly once, in filename order.
// Applied files are recorded in schema_migrations so the operation is idempotent.
func Migrate(db *sql.DB, dir string) ([]string, error) {
	if dir == "" {
		dir = os.Getenv("MIGRATIONS_DIR")
	}
	if dir == "" {
		dir = "migrations"
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("read migrations dir: %w", err)
	}
	var files []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)

	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		name TEXT PRIMARY KEY,
		applied_at TIMESTAMP NOT NULL DEFAULT NOW()
	)`); err != nil {
		return nil, fmt.Errorf("create schema_migrations: %w", err)
	}

	var applied []string
	for _, name := range files {
		var exists bool
		if err := db.QueryRow(`SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE name = $1)`, name).Scan(&exists); err != nil {
			return applied, err
		}
		if exists {
			continue
		}
		body, err := os.ReadFile(filepath.Join(dir, name))
		if err != nil {
			return applied, err
		}
		tx, err := db.Begin()
		if err != nil {
			return applied, err
		}
		if _, err := tx.Exec(string(body)); err != nil {
			_ = tx.Rollback()
			return applied, fmt.Errorf("apply %s: %w", name, err)
		}
		if _, err := tx.Exec(`INSERT INTO schema_migrations (name) VALUES ($1)`, name); err != nil {
			_ = tx.Rollback()
			return applied, err
		}
		if err := tx.Commit(); err != nil {
			return applied, err
		}
		applied = append(applied, name)
	}
	return applied, nil
}
