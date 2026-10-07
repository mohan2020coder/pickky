package httpx

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

const ContextUserID = "user_id"
const ContextRole = "role"

func GetUserID(c *fiber.Ctx) (uuid.UUID, bool) {
	v := c.Locals(ContextUserID)
	if v == nil {
		return uuid.Nil, false
	}
	id, ok := v.(uuid.UUID)
	return id, ok
}

// GetRole returns the primary role claim carried by the access token. Fine
// grained checks must use middleware.Roles / RequireRole instead, which read
// the authoritative role list from PostgreSQL.
func GetRole(c *fiber.Ctx) (string, bool) {
	v := c.Locals(ContextRole)
	if v == nil {
		return "", false
	}
	r, ok := v.(string)
	return r, ok
}

func BearerFrom(c *fiber.Ctx) string {
	h := c.Get("Authorization")
	if h == "" {
		return ""
	}
	parts := strings.SplitN(h, " ", 2)
	if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
		return parts[1]
	}
	return ""
}
