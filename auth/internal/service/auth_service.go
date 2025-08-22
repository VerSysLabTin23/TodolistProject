package service

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/VerSysLabTin23/TodolistProject/auth/internal/models"
	"github.com/VerSysLabTin23/TodolistProject/auth/internal/repository"
)

// AuthService handles authentication logic
type AuthService struct {
	repo       repository.UserRepository
	jwtSecret  []byte
	accessTTL  time.Duration
	refreshTTL time.Duration
}

// TODO: Secret key should be stored in a secure way, use env variable or secret manager
func NewAuthService(repo repository.UserRepository) *AuthService {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-secret-key-change-in-production"
	}
	accessTTL := 15 * time.Minute
	refreshTTL := 7 * 24 * time.Hour
	if s := os.Getenv("JWT_ACCESS_TTL"); s != "" {
		if ttl, err := time.ParseDuration(s); err == nil {
			accessTTL = ttl
		}
	}
	if s := os.Getenv("JWT_REFRESH_TTL"); s != "" {
		if ttl, err := time.ParseDuration(s); err == nil {
			refreshTTL = ttl
		}
	}
	return &AuthService{repo: repo, jwtSecret: []byte(jwtSecret), accessTTL: accessTTL, refreshTTL: refreshTTL}
}

func (s *AuthService) RegisterUser(req models.RegisterRequest) (*models.User, error) {
	exists, err := s.repo.ExistsByUsername(req.Username)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("username already exists")
	}
	exists, err = s.repo.ExistsByEmail(req.Email)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("email already exists")
	}
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	user := &models.User{Username: req.Username, Email: req.Email, PasswordHash: string(hashedPassword), FirstName: req.FirstName, LastName: req.LastName, Role: "user", IsActive: true}
	if err := s.repo.Create(user); err != nil {
		return nil, err
	}
	return user, nil
}

func (s *AuthService) AuthenticateUser(req models.LoginRequest) (*models.LoginResponse, error) {
	user, err := s.repo.GetByUsername(req.Username)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}
	if !user.IsActive {
		return nil, errors.New("user account is deactivated")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid credentials")
	}
	accessToken, err := s.generateAccessToken(user)
	if err != nil {
		return nil, err
	}
	refreshToken, err := s.generateRefreshToken(user)
	if err != nil {
		return nil, err
	}
	return &models.LoginResponse{AccessToken: accessToken, RefreshToken: refreshToken, User: user.ToUserResponse()}, nil
}

func (s *AuthService) RefreshToken(refreshToken string) (*models.LoginResponse, error) {
	claims, err := s.parseToken(refreshToken)
	if err != nil {
		return nil, errors.New("invalid refresh token")
	}
	user, err := s.repo.GetByID(claims.UserID)
	if err != nil {
		return nil, errors.New("user not found")
	}
	if !user.IsActive {
		return nil, errors.New("user account is deactivated")
	}
	accessToken, err := s.generateAccessToken(user)
	if err != nil {
		return nil, err
	}
	newRefreshToken, err := s.generateRefreshToken(user)
	if err != nil {
		return nil, err
	}
	return &models.LoginResponse{AccessToken: accessToken, RefreshToken: newRefreshToken, User: user.ToUserResponse()}, nil
}

// ValidateToken verifies a JWT (access or refresh) and returns its claims if valid.
// It ensures:
// - the token is well-formed and signed using an HMAC algorithm (e.g., HS256)
// - the signature matches the configured JWT secret
// - standard registered claims (exp, iat, etc.) are valid
// Returns an error if any validation step fails.
func (s *AuthService) ValidateToken(tokenString string) (*models.Claims, error) {
	return s.parseToken(tokenString)
}

func (s *AuthService) ChangePassword(userID int, req models.ChangePasswordRequest) error {
	user, err := s.repo.GetByID(userID)
	if err != nil {
		return errors.New("user not found")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		return errors.New("current password is incorrect")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	user.PasswordHash = string(hash)
	return s.repo.Update(user)
}

func (s *AuthService) generateAccessToken(user *models.User) (string, error) {
	claims := &models.Claims{UserID: user.ID, Username: user.Username, Role: user.Role, RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.accessTTL)), IssuedAt: jwt.NewNumericDate(time.Now()), Issuer: "auth-service"}}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

func (s *AuthService) generateRefreshToken(user *models.User) (string, error) {
	claims := &models.Claims{UserID: user.ID, Username: user.Username, Role: user.Role, RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.refreshTTL)), IssuedAt: jwt.NewNumericDate(time.Now()), Issuer: "auth-service"}}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

// parseToken parses and validates a JWT string.
// Flow:
//  1. jwt.ParseWithClaims decodes the token and verifies the signature via the key func below
//  2. Only HMAC signing methods are accepted; other algorithms are rejected
//  3. The key func returns the server's JWT secret used to verify the signature
//  4. On success, the library checks standard registered claims and sets token.Valid
//  5. We assert the claims to our typed struct and return them if token.Valid is true
func (s *AuthService) parseToken(tokenString string) (*models.Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &models.Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}
	if claims, ok := token.Claims.(*models.Claims); ok && token.Valid {
		return claims, nil
	}
	return nil, errors.New("invalid token")
}

func (s *AuthService) HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

func (s *AuthService) VerifyPassword(password, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}
