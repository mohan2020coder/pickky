package auth

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"pickky/backend/internal/config"
	"pickky/backend/internal/httpx"
	userspkg "pickky/backend/internal/users"
)

type Handler struct {
	store *Store
	jwt   *JWTManager
	db    *gorm.DB
	cfg   *config.Config
}

func NewHandler(db *gorm.DB, cfg *config.Config, jwt *JWTManager) *Handler {
	return &Handler{store: NewStore(db, jwt), jwt: jwt, db: db, cfg: cfg}
}

// Register mounts the auth routes. authMW guards only the routes that require
// an authenticated session; login/register/refresh/OTP stay public.
func (h *Handler) Register(app fiber.Router, authMW fiber.Handler) {
	app.Post("/register", h.register)
	app.Post("/login", h.login)
	app.Post("/refresh", h.refresh)
	app.Post("/logout", authMW, h.logout)
	app.Get("/me", authMW, h.me)
	app.Post("/otp/request", h.otpRequest)
	app.Post("/otp/verify", h.otpVerify)
	app.Post("/password/forgot", h.passwordForgot)
	app.Post("/password/reset", h.passwordReset)
	app.Put("/password", authMW, h.passwordChange)
}

type registerReq struct {
	Name     string `json:"name"`
	Phone    string `json:"phone"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

func (h *Handler) register(c *fiber.Ctx) error {
	var req registerReq
	if err := httpx.Bind(c, &req, false); err != nil {
		return err
	}
	req.Name = strings.TrimSpace(req.Name)
	req.Phone = strings.TrimSpace(req.Phone)
	if req.Name == "" {
		return httpx.Unprocessable(c, "Please fill in all required fields.")
	}
	if req.Phone == "" {
		return httpx.Unprocessable(c, "Please fill in all required fields.")
	}
	if len(req.Password) < 8 {
		return httpx.Unprocessable(c, "Password must be at least 8 characters.")
	}

	digits := Digits(req.Phone)
	var existing userspkg.User
	err := h.db.Where("phone = ? OR regexp_replace(phone, '\\D', '', 'g') = ?", req.Phone, digits).
		First(&existing).Error
	if err == nil {
		return httpx.Conflict(c, "An account with this phone number already exists.")
	}
	if err != gorm.ErrRecordNotFound {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}

	role := strings.ToUpper(strings.TrimSpace(req.Role))
	switch role {
	case "RIDER", "ADMIN", "SUPPORT":
	default:
		role = "CUSTOMER"
	}

	user := userspkg.User{
		Name:     req.Name,
		Phone:    req.Phone,
		Email:    strings.TrimSpace(req.Email),
		IsActive: true,
	}
	hash, err := HashPassword(req.Password)
	if err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	user.Password = hash

	tx := h.db.Begin()
	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	roleID, err := h.roleIDTx(tx, role)
	if err != nil {
		tx.Rollback()
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	if err := tx.Exec(`INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`, user.ID, roleID).Error; err != nil {
		tx.Rollback()
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	if role == "RIDER" {
		rider := map[string]any{
			"user_id": user.ID, "status": "OFFLINE", "vehicle_type": "Bike",
			"license_plate": "", "is_verified": false, "is_suspended": false,
		}
		if err := tx.Table("riders").Create(rider).Error; err != nil {
			tx.Rollback()
			return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
		}
	}
	if err := tx.Commit().Error; err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}

	tokens, err := h.store.issueSession(user.ID, c.Get("User-Agent"), c.IP())
	if err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	return httpx.OK(c, Session{User: toDTO(user, []string{role}), Tokens: tokens})
}

type loginReq struct {
	Identifier string `json:"identifier"`
	Password   string `json:"password"`
}

func (h *Handler) login(c *fiber.Ctx) error {
	var req loginReq
	if err := httpx.Bind(c, &req, false); err != nil {
		return err
	}
	identifier := strings.TrimSpace(req.Identifier)
	if identifier == "" || req.Password == "" {
		return httpx.Unauthorized(c, "We couldn't find an account with those details.")
	}
	var user userspkg.User
	err := h.db.Where("phone = ? OR email = ? OR lower(name) = lower(?)", identifier, identifier, identifier).
		First(&user).Error
	if err == gorm.ErrRecordNotFound || (err == nil && !CheckPassword(user.Password, req.Password)) {
		return httpx.Unauthorized(c, "We couldn't find an account with those details.")
	}
	if err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	if !user.IsActive {
		return httpx.Forbidden(c, "Your account has been deactivated.")
	}
	tokens, err := h.store.issueSession(user.ID, c.Get("User-Agent"), c.IP())
	if err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	return httpx.OK(c, Session{User: toDTO(user, h.store.RolesFor(user.ID)), Tokens: tokens})
}

type refreshReq struct {
	RefreshToken string `json:"refresh_token"`
}

func (h *Handler) refresh(c *fiber.Ctx) error {
	var req refreshReq
	if err := httpx.Bind(c, &req, false); err != nil {
		return err
	}
	if req.RefreshToken == "" {
		return httpx.Unauthorized(c, "Your session has expired. Please sign in again.")
	}
	var sess userspkg.Session
	err := h.db.Where("refresh_token = ? AND revoked_at IS NULL AND expires_at > now()",
		req.RefreshToken).First(&sess).Error
	if err != nil {
		return httpx.Unauthorized(c, "Your session has expired. Please sign in again.")
	}

	// Rotation: the presented refresh token is revoked and a brand new pair
	// is issued (AGENTS.md §27 token rotation).
	now := time.Now().UTC()
	if err := h.db.Model(&userspkg.Session{}).Where("id = ?", sess.ID).
		Update("revoked_at", now).Error; err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	tokens, err := h.store.issueSession(sess.UserID, c.Get("User-Agent"), c.IP())
	if err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	return httpx.OK(c, tokens) // bare TokenPair, per client contract
}

func (h *Handler) logout(c *fiber.Ctx) error {
	userID, _ := c.Locals(httpx.ContextUserID).(uuid.UUID)
	if err := h.db.Model(&userspkg.Session{}).
		Where("user_id = ? AND revoked_at IS NULL", userID).
		Update("revoked_at", time.Now().UTC()).Error; err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	return httpx.OK(c, fiber.Map{"ok": true})
}

func (h *Handler) me(c *fiber.Ctx) error {
	userID, _ := c.Locals(httpx.ContextUserID).(uuid.UUID)
	var user userspkg.User
	if err := h.db.First(&user, "id = ?", userID).Error; err != nil {
		return httpx.NotFound(c, "Account not found.")
	}
	return httpx.OK(c, toDTO(user, h.store.RolesFor(user.ID)))
}

type phoneReq struct {
	Phone string `json:"phone"`
}

func (h *Handler) otpRequest(c *fiber.Ctx) error {
	var req phoneReq
	if err := httpx.Bind(c, &req, false); err != nil {
		return err
	}
	if strings.TrimSpace(req.Phone) == "" {
		return httpx.Unprocessable(c, "Please fill in all required fields.")
	}
	// No FCM / SMS provider is wired in dev; the code is fixed and documented
	// in the README (OTP is always 1234).
	return httpx.OK(c, fiber.Map{"sent": true})
}

type otpVerifyReq struct {
	Phone string `json:"phone"`
	Code  string `json:"code"`
}

func (h *Handler) otpCodeOK(code string) bool {
	fixed := h.cfg.OTP.FixedCode
	if fixed == "" {
		fixed = "1234"
	}
	return strings.TrimSpace(code) == fixed
}

func (h *Handler) otpVerify(c *fiber.Ctx) error {
	var req otpVerifyReq
	if err := httpx.Bind(c, &req, false); err != nil {
		return err
	}
	if !h.otpCodeOK(req.Code) {
		return httpx.Unprocessable(c, "That code is not valid.")
	}
	digits := Digits(req.Phone)
	var user userspkg.User
	err := h.db.Where("phone = ? OR regexp_replace(phone, '\\D', '', 'g') = ?", req.Phone, digits).
		First(&user).Error
	if err == gorm.ErrRecordNotFound {
		return httpx.NotFound(c, "We couldn't find an account with that phone number.")
	}
	if err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	if !user.IsActive {
		return httpx.Forbidden(c, "Your account has been deactivated.")
	}
	tokens, err := h.store.issueSession(user.ID, c.Get("User-Agent"), c.IP())
	if err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	return httpx.OK(c, Session{User: toDTO(user, h.store.RolesFor(user.ID)), Tokens: tokens})
}

func (h *Handler) passwordForgot(c *fiber.Ctx) error {
	var req phoneReq
	if err := httpx.Bind(c, &req, false); err != nil {
		return err
	}
	if strings.TrimSpace(req.Phone) == "" {
		return httpx.Unprocessable(c, "Please fill in all required fields.")
	}
	return httpx.OK(c, fiber.Map{"sent": true})
}

type passwordResetReq struct {
	Phone    string `json:"phone"`
	Code     string `json:"code"`
	Password string `json:"password"`
}

func (h *Handler) passwordReset(c *fiber.Ctx) error {
	var req passwordResetReq
	if err := httpx.Bind(c, &req, false); err != nil {
		return err
	}
	if !h.otpCodeOK(req.Code) {
		return httpx.Unprocessable(c, "That code is not valid.")
	}
	if len(req.Password) < 8 {
		return httpx.Unprocessable(c, "Password must be at least 8 characters.")
	}
	digits := Digits(req.Phone)
	var user userspkg.User
	err := h.db.Where("phone = ? OR regexp_replace(phone, '\\D', '', 'g') = ?", req.Phone, digits).
		First(&user).Error
	if err == gorm.ErrRecordNotFound {
		return httpx.NotFound(c, "We couldn't find an account with that phone number.")
	}
	if err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	hash, err := HashPassword(req.Password)
	if err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	if err := h.db.Model(&userspkg.User{}).Where("id = ?", user.ID).
		Update("password", hash).Error; err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	// A password reset invalidates every existing session.
	h.db.Model(&userspkg.Session{}).Where("user_id = ? AND revoked_at IS NULL", user.ID).
		Update("revoked_at", time.Now().UTC())
	return httpx.OK(c, fiber.Map{"ok": true})
}

type passwordChangeReq struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

func (h *Handler) passwordChange(c *fiber.Ctx) error {
	var req passwordChangeReq
	if err := httpx.Bind(c, &req, false); err != nil {
		return err
	}
	userID, _ := c.Locals(httpx.ContextUserID).(uuid.UUID)
	var user userspkg.User
	if err := h.db.First(&user, "id = ?", userID).Error; err != nil {
		return httpx.NotFound(c, "Account not found.")
	}
	if !CheckPassword(user.Password, req.CurrentPassword) {
		return httpx.Unprocessable(c, "Your current password is incorrect.")
	}
	if len(req.NewPassword) < 8 {
		return httpx.Unprocessable(c, "Password must be at least 8 characters.")
	}
	hash, err := HashPassword(req.NewPassword)
	if err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	if err := h.db.Model(&userspkg.User{}).Where("id = ?", userID).
		Update("password", hash).Error; err != nil {
		return httpx.Err(c, fiber.StatusInternalServerError, "Something went wrong. Please try again.")
	}
	return httpx.OK(c, fiber.Map{"ok": true})
}

func (h *Handler) roleIDTx(tx *gorm.DB, name string) (uuid.UUID, error) {
	var id uuid.UUID
	err := tx.Raw(`SELECT id FROM roles WHERE name = ?`, name).Row().Scan(&id)
	return id, err
}
