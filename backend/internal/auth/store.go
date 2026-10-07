package auth

import (
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	userspkg "pickky/backend/internal/users"
)

// UserDTO is the exact `User` shape the mobile client consumes.
type UserDTO struct {
	ID        uuid.UUID  `json:"id"`
	Name      string     `json:"name"`
	Phone     string     `json:"phone"`
	Email     *string    `json:"email"`
	Roles     []string   `json:"roles"`
	CreatedAt *time.Time `json:"created_at,omitempty"`
}

type Session struct {
	User  UserDTO    `json:"user"`
	Tokens TokenPair `json:"tokens"`
}

type Store struct {
	db  *gorm.DB
	jwt *JWTManager
}

func NewStore(db *gorm.DB, jwt *JWTManager) *Store { return &Store{db: db, jwt: jwt} }

func toDTO(u userspkg.User, roles []string) UserDTO {
	var email *string
	if u.Email != "" {
		e := u.Email
		email = &e
	}
	if roles == nil {
		roles = []string{}
	}
	created := u.CreatedAt
	return UserDTO{ID: u.ID, Name: u.Name, Phone: u.Phone, Email: email, Roles: roles, CreatedAt: &created}
}

func (s *Store) RolesFor(userID uuid.UUID) []string {
	var csv string
	if err := s.db.Raw(`SELECT COALESCE((
		SELECT string_agg(r.name, ',') FROM user_roles ur
		JOIN roles r ON r.id = ur.role_id
		WHERE ur.user_id = ?), '')`, userID).Row().Scan(&csv); err != nil {
		return []string{}
	}
	return SplitCSV(csv)
}

// SplitCSV turns a comma-joined role list into a slice (empty-safe).
func SplitCSV(csv string) []string {
	if csv == "" {
		return []string{}
	}
	return strings.Split(csv, ",")
}

func (s *Store) roleID(name string) (uuid.UUID, error) {
	var id uuid.UUID
	err := s.db.Raw(`SELECT id FROM roles WHERE name = ?`, name).Row().Scan(&id)
	return id, err
}

// EnsureRoles inserts the four system roles if they are missing (bootstrap).
func EnsureRoles(db *gorm.DB) error {
	roles := []struct{ name, desc string }{
		{"CUSTOMER", "Places deliveries"},
		{"RIDER", "Fulfils deliveries"},
		{"ADMIN", "Full operations access"},
		{"SUPPORT", "Ticket handling"},
	}
	for _, r := range roles {
		if err := db.Exec(`INSERT INTO roles (name, description) VALUES (?, ?)
			ON CONFLICT (name) DO NOTHING`, r.name, r.desc).Error; err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) issueSession(userID uuid.UUID, userAgent, ip string) (TokenPair, error) {
	tokens, err := s.jwt.Generate(userID, "")
	if err != nil {
		return TokenPair{}, err
	}
	sess := userspkg.Session{
		UserID:       userID,
		RefreshToken: tokens.RefreshToken,
		UserAgent:    userAgent,
		IP:           ip,
		ExpiresAt:    time.Now().UTC().Add(s.jwt.refreshTTL),
	}
	if err := s.db.Create(&sess).Error; err != nil {
		return TokenPair{}, err
	}
	return tokens, nil
}
