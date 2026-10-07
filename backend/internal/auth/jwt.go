package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var (
	ErrInvalidToken = errors.New("invalid token")
	ErrExpiredToken = errors.New("expired token")
)

type Claims struct {
	UserID uuid.UUID `json:"user_id"`
	Role   string    `json:"role"`
	jwt.RegisteredClaims
}

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
}

type JWTManager struct {
	secret     string
	accessTTL  time.Duration
	refreshTTL time.Duration
}

func NewJWT(secret string, accessTTL, refreshTTL time.Duration) *JWTManager {
	return &JWTManager{secret: secret, accessTTL: accessTTL, refreshTTL: refreshTTL}
}

func (j *JWTManager) Generate(userID uuid.UUID, role string) (TokenPair, error) {
	now := time.Now().UTC()
	accessExp := now.Add(j.accessTTL)
	access := jwt.NewWithClaims(jwt.SigningMethodHS256, Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(accessExp),
			ID:        uuid.NewString(),
		},
	})
	at, err := access.SignedString([]byte(j.secret))
	if err != nil {
		return TokenPair{}, err
	}
	refreshExp := now.Add(j.refreshTTL)
	refresh := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.RegisteredClaims{
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(refreshExp),
		ID:        uuid.NewString(),
		Subject:   userID.String(),
	})
	rt, err := refresh.SignedString([]byte(j.secret))
	if err != nil {
		return TokenPair{}, err
	}
	return TokenPair{AccessToken: at, RefreshToken: rt, ExpiresIn: int64(j.accessTTL.Seconds())}, nil
}

func (j *JWTManager) ParseAccess(token string) (*Claims, error) {
	var c Claims
	t, err := jwt.ParseWithClaims(token, &c, func(t *jwt.Token) (any, error) { return []byte(j.secret), nil })
	if err != nil || !t.Valid {
		return nil, ErrInvalidToken
	}
	if time.Now().UTC().After(c.ExpiresAt.Time) {
		return nil, ErrExpiredToken
	}
	return &c, nil
}
