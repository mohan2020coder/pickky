package users

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Phone     string    `gorm:"uniqueIndex;size:20;not null"`
	Name      string    `gorm:"size:100;not null"`
	Email     string    `gorm:"size:100"`
	Password  string    `gorm:"size:255;not null"`
	IsActive  bool      `gorm:"default:true"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
	UpdatedAt time.Time `gorm:"autoUpdateTime"`
}

type Role struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name        string    `gorm:"uniqueIndex;size:30;not null"`
	Description string    `gorm:"size:255"`
}

type Permission struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Code        string    `gorm:"uniqueIndex;size:100;not null"`
	Description string    `gorm:"size:255"`
}

type UserRole struct {
	UserID uuid.UUID `gorm:"type:uuid;primaryKey"`
	RoleID uuid.UUID `gorm:"type:uuid;primaryKey"`
}

type Session struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID       uuid.UUID `gorm:"type:uuid;index;not null"`
	RefreshToken string    `gorm:"size:500;not null"`
	UserAgent    string    `gorm:"size:255"`
	IP           string    `gorm:"size:45"`
	RevokedAt    *time.Time
	ExpiresAt    time.Time
	CreatedAt    time.Time `gorm:"autoCreateTime"`
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(&User{}, &Role{}, &Permission{}, &UserRole{}, &Session{})
}
