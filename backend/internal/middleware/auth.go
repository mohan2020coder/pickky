package middleware

import (
	"database/sql"
	"errors"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"pickky/backend/internal/auth"
	"pickky/backend/internal/httpx"
)

const ContextRoles = "roles"

// Auth validates the bearer token and loads the user's roles from PostgreSQL.
// Roles are always read server-side; the token is never trusted for them.
func Auth(j *auth.JWTManager, db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		t := httpx.BearerFrom(c)
		if t == "" {
			return httpx.Unauthorized(c, "missing token")
		}
		cl, err := j.ParseAccess(t)
		if err != nil {
			return httpx.Unauthorized(c, "invalid token")
		}
		roles, active, err := loadRoles(db, cl.UserID)
		if err != nil {
			return httpx.Err(c, fiber.StatusServiceUnavailable, "service unavailable")
		}
		if !active {
			return httpx.Forbidden(c, "Your account has been deactivated.")
		}
		c.Locals(httpx.ContextUserID, cl.UserID)
		c.Locals(httpx.ContextRole, cl.Role)
		c.Locals(ContextRoles, roles)
		return c.Next()
	}
}

func loadRoles(db *gorm.DB, userID uuid.UUID) ([]string, bool, error) {
	var (
		csv      string
		isActive bool
	)
	err := db.Raw(`SELECT COALESCE((
			SELECT string_agg(r.name, ',') FROM user_roles ur
			JOIN roles r ON r.id = ur.role_id
			WHERE ur.user_id = u.id), '') AS roles, u.is_active
		FROM users u WHERE u.id = ?`, userID).Row().Scan(&csv, &isActive)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, false, nil
		}
		return nil, false, err
	}
	if csv == "" {
		return []string{}, isActive, nil
	}
	return strings.Split(csv, ","), isActive, nil
}

// Roles returns the roles loaded by Auth.
func Roles(c *fiber.Ctx) []string {
	v, _ := c.Locals(ContextRoles).([]string)
	return v
}

func HasRole(c *fiber.Ctx, roles ...auth.Role) bool {
	have := Roles(c)
	for _, want := range roles {
		for _, r := range have {
			if r == string(want) {
				return true
			}
		}
	}
	return false
}

// RequireRole gates a route on at least one of the given roles.
func RequireRole(roles ...auth.Role) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if !HasRole(c, roles...) {
			return httpx.Forbidden(c, "You don't have permission to do that.")
		}
		return c.Next()
	}
}

// RequireAnyRole returns a handler that accepts any authenticated user.
func RequireAnyRole() fiber.Handler {
	return func(c *fiber.Ctx) error { return c.Next() }
}
