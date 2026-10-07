package httpx

import (
	"errors"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type Page struct {
	Page  int `json:"page"`
	Limit int `json:"limit"`
}

func (p Page) Offset() int { return (p.Page - 1) * p.Limit }

func PageFrom(c *fiber.Ctx) Page {
	page := atoiDefault(c.Query("page"), 1)
	if page < 1 {
		page = 1
	}
	limit := atoiDefault(c.Query("limit"), 20)
	if limit < 1 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}
	return Page{Page: page, Limit: limit}
}

func Paginated[T any](items []T, p Page, total int) fiber.Map {
	return fiber.Map{
		"data": items,
		"meta": fiber.Map{"page": p.Page, "limit": p.Limit, "total": total},
	}
}

func OK(c *fiber.Ctx, body any) error {
	return c.Status(fiber.StatusOK).JSON(body)
}

// Err signals a failure as a *fiber.Error carrying the client-facing message.
// The body is rendered centrally by ErrorHandler — which guarantees Err always
// returns a non-nil error (unlike c.Status().JSON(), which returns nil on
// success and would turn "return nil, Err(...)" into a silent nil,nil).
func Err(c *fiber.Ctx, status int, msg string) error {
	return fiber.NewError(status, msg)
}

// ErrorHandler renders every error — including route-not-found — as the
// {"error": "<message>"} shape the mobile client reads.
func ErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	msg := "Something went wrong. Please try again."
	var fe *fiber.Error
	if errors.As(err, &fe) {
		code = fe.Code
		msg = fe.Message
	}
	if c.Response().StatusCode() != 200 && len(c.Response().Body()) > 0 {
		// A handler already wrote a response; keep it.
		return nil
	}
	return c.Status(code).JSON(fiber.Map{"error": msg})
}

func BadRequest(c *fiber.Ctx, msg string) error { return Err(c, fiber.StatusBadRequest, msg) }
func Unauthorized(c *fiber.Ctx, msg string) error {
	return Err(c, fiber.StatusUnauthorized, msg)
}
func Forbidden(c *fiber.Ctx, msg string) error { return Err(c, fiber.StatusForbidden, msg) }
func NotFound(c *fiber.Ctx, msg string) error  { return Err(c, fiber.StatusNotFound, msg) }
func Conflict(c *fiber.Ctx, msg string) error  { return Err(c, fiber.StatusConflict, msg) }
func Unprocessable(c *fiber.Ctx, msg string) error {
	return Err(c, fiber.StatusUnprocessableEntity, msg)
}

// Bind parses the JSON body into dst. Empty bodies are tolerated when allowEmpty
// is true (the mobile client posts `{}` for actions without payloads).
func Bind(c *fiber.Ctx, dst any, allowEmpty bool) error {
	if allowEmpty && len(c.Body()) == 0 {
		return nil
	}
	if err := c.BodyParser(dst); err != nil {
		return Err(c, fiber.StatusUnprocessableEntity, "Invalid request body.")
	}
	return nil
}

func Param(c *fiber.Ctx, name string) string { return strings.TrimSpace(c.Params(name)) }

func atoiDefault(s string, def int) int {
	if s == "" {
		return def
	}
	v, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return v
}
