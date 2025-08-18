package main

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// User represents a user in the system
type User struct {
	ID           int       `json:"id" gorm:"primaryKey"`
	Username     string    `json:"username" gorm:"uniqueIndex;not null"`
	Email        string    `json:"email" gorm:"uniqueIndex;not null"`
	PasswordHash string    `json:"-" gorm:"column:password_hash;not null"`
	FirstName    string    `json:"firstName" gorm:"column:first_name"`
	LastName     string    `json:"lastName" gorm:"column:last_name"`
	Role         string    `json:"role" gorm:"not null;default:'user'"`
	IsActive     bool      `json:"isActive" gorm:"column:is_active;not null;default:true"`
	CreatedAt    time.Time `json:"createdAt" gorm:"column:created_at;not null;default:CURRENT_TIMESTAMP"`
	UpdatedAt    time.Time `json:"updatedAt" gorm:"column:updated_at;not null;default:CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"`
}

// TableName specifies the table name for User
func (User) TableName() string {
	return "users"
}

// UserResponse represents the user data sent in API responses
type UserResponse struct {
	ID        int       `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	FirstName string    `json:"firstName"`
	LastName  string    `json:"lastName"`
	Role      string    `json:"role"`
	IsActive  bool      `json:"isActive"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// RegisterRequest represents the request body for user registration
type RegisterRequest struct {
	Username  string `json:"username" binding:"required,min=3,max=50"`
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password" binding:"required,min=6"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
}

// LoginRequest represents the request body for user login
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse represents the response body for successful login
type LoginResponse struct {
	AccessToken  string       `json:"accessToken"`
	RefreshToken string       `json:"refreshToken"`
	User         UserResponse `json:"user"`
}

// RefreshRequest represents the request body for token refresh
type RefreshRequest struct {
	RefreshToken string `json:"refreshToken" binding:"required"`
}

// CreateUserRequest represents the request body for creating a user (admin only)
type CreateUserRequest struct {
	Username  string `json:"username" binding:"required,min=3,max=50"`
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password" binding:"required,min=6"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Role      string `json:"role" binding:"required,oneof=user admin"`
}

// UpdateUserRequest represents the request body for updating a user
type UpdateUserRequest struct {
	Username  *string `json:"username"`
	Email     *string `json:"email"`
	FirstName *string `json:"firstName"`
	LastName  *string `json:"lastName"`
	Role      *string `json:"role"`
	IsActive  *bool   `json:"isActive"`
}

// UpdateProfileRequest represents the request body for updating user profile
type UpdateProfileRequest struct {
	FirstName *string `json:"firstName"`
	LastName  *string `json:"lastName"`
	Email     *string `json:"email"`
}

// ChangePasswordRequest represents the request body for changing password
type ChangePasswordRequest struct {
	CurrentPassword string `json:"currentPassword" binding:"required"`
	NewPassword     string `json:"newPassword" binding:"required,min=6"`
}

// UserFilters represents filters for user listing
type UserFilters struct {
	Query  string `form:"q"`
	Limit  int    `form:"limit,default=50"`
	Offset int    `form:"offset,default=0"`
}

// Error represents an error response
type Error struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// Claims represents JWT claims
type Claims struct {
	UserID   int    `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

// ToUserResponse converts a User to UserResponse
func (u *User) ToUserResponse() UserResponse {
	return UserResponse{
		ID:        u.ID,
		Username:  u.Username,
		Email:     u.Email,
		FirstName: u.FirstName,
		LastName:  u.LastName,
		Role:      u.Role,
		IsActive:  u.IsActive,
		CreatedAt: u.CreatedAt,
		UpdatedAt: u.UpdatedAt,
	}
}

// ValidateRole validates if the role is valid
func ValidateRole(role string) bool {
	return role == "user" || role == "admin"
}
