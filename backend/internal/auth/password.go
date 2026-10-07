package auth

import (
	"errors"
	"regexp"

	"golang.org/x/crypto/bcrypt"
)

var phoneCleaner = regexp.MustCompile(`\D`)

func HashPassword(plain string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	return string(b), err
}

func CheckPassword(hash, plain string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}

// Digits normalises a phone number to digits-only form for comparisons.
func Digits(phone string) string { return phoneCleaner.ReplaceAllString(phone, "") }

var ErrInvalidCredentials = errors.New("invalid credentials")
