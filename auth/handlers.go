package main

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// AuthHandlers handles HTTP requests for authentication
type AuthHandlers struct {
	authService *AuthService
	userRepo    UserRepository
}

// NewAuthHandlers creates new authentication handlers
func NewAuthHandlers(authService *AuthService, userRepo UserRepository) *AuthHandlers {
	return &AuthHandlers{
		authService: authService,
		userRepo:    userRepo,
	}
}

// HealthCheck handles health check requests
func (h *AuthHandlers) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// Register handles user registration
func (h *AuthHandlers) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", err.Error()))
		return
	}

	user, err := h.authService.RegisterUser(req)
	if err != nil {
		switch err.Error() {
		case "username already exists":
			c.JSON(http.StatusConflict, errResp("CONFLICT", "Username already exists"))
		case "email already exists":
			c.JSON(http.StatusConflict, errResp("CONFLICT", "Email already exists"))
		default:
			c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to register user"))
		}
		return
	}

	c.JSON(http.StatusCreated, user.ToUserResponse())
}

// Login handles user authentication
func (h *AuthHandlers) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", err.Error()))
		return
	}

	response, err := h.authService.AuthenticateUser(req)
	if err != nil {
		switch err.Error() {
		case "invalid credentials":
			c.JSON(http.StatusUnauthorized, errResp("UNAUTHORIZED", "Invalid credentials"))
		case "user account is deactivated":
			c.JSON(http.StatusUnauthorized, errResp("UNAUTHORIZED", "User account is deactivated"))
		default:
			c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Authentication failed"))
		}
		return
	}

	c.JSON(http.StatusOK, response)
}

// Refresh handles token refresh
func (h *AuthHandlers) Refresh(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", err.Error()))
		return
	}

	response, err := h.authService.RefreshToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, errResp("UNAUTHORIZED", "Invalid refresh token"))
		return
	}

	c.JSON(http.StatusOK, response)
}

// Logout handles user logout
func (h *AuthHandlers) Logout(c *gin.Context) {
	// In a real implementation, you might want to blacklist the token
	// For now, we just return success
	c.JSON(http.StatusOK, gin.H{"message": "Logout successful"})
}

// ListUsers handles listing users (admin only)
func (h *AuthHandlers) ListUsers(c *gin.Context) {
	// TODO: Extract user from JWT and check if admin
	userID := 1 // Placeholder - should come from JWT token

	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to get user"))
		return
	}

	if user.Role != "admin" {
		c.JSON(http.StatusForbidden, errResp("FORBIDDEN", "Insufficient permissions"))
		return
	}

	var filters UserFilters
	if err := c.ShouldBindQuery(&filters); err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", err.Error()))
		return
	}

	// Validate limits
	if filters.Limit <= 0 {
		filters.Limit = 50
	}
	if filters.Limit > 200 {
		filters.Limit = 200
	}
	if filters.Offset < 0 {
		filters.Offset = 0
	}

	users, total, err := h.userRepo.List(filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to list users"))
		return
	}

	// Convert to responses
	var responses []UserResponse
	for _, user := range users {
		responses = append(responses, user.ToUserResponse())
	}

	c.JSON(http.StatusOK, gin.H{
		"users":  responses,
		"total":  total,
		"limit":  filters.Limit,
		"offset": filters.Offset,
	})
}

// CreateUser handles user creation (admin only)
func (h *AuthHandlers) CreateUser(c *gin.Context) {
	// TODO: Extract user from JWT and check if admin
	userID := 1 // Placeholder - should come from JWT token

	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to get user"))
		return
	}

	if user.Role != "admin" {
		c.JSON(http.StatusForbidden, errResp("FORBIDDEN", "Insufficient permissions"))
		return
	}

	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", err.Error()))
		return
	}

	// Check if username already exists
	exists, err := h.userRepo.ExistsByUsername(req.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to check username"))
		return
	}
	if exists {
		c.JSON(http.StatusConflict, errResp("CONFLICT", "Username already exists"))
		return
	}

	// Check if email already exists
	exists, err = h.userRepo.ExistsByEmail(req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to check email"))
		return
	}
	if exists {
		c.JSON(http.StatusConflict, errResp("CONFLICT", "Email already exists"))
		return
	}

	// Hash password
	hashedPassword, err := h.authService.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to hash password"))
		return
	}

	// Create user
	newUser := &User{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: hashedPassword,
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Role:         req.Role,
		IsActive:     true,
	}

	if err := h.userRepo.Create(newUser); err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to create user"))
		return
	}

	c.JSON(http.StatusCreated, newUser.ToUserResponse())
}

// GetUser handles getting a user by ID
func (h *AuthHandlers) GetUser(c *gin.Context) {
	// TODO: Extract user from JWT and check permissions
	userID := 1 // Placeholder - should come from JWT token

	// Check if requesting user is admin or requesting their own profile
	requestingUser, err := h.userRepo.GetByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to get user"))
		return
	}

	targetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "Invalid user ID"))
		return
	}

	// Only allow users to see their own profile or admins to see any profile
	if requestingUser.Role != "admin" && requestingUser.ID != targetID {
		c.JSON(http.StatusForbidden, errResp("FORBIDDEN", "Insufficient permissions"))
		return
	}

	targetUser, err := h.userRepo.GetByID(targetID)
	if err != nil {
		c.JSON(http.StatusNotFound, errResp("NOT_FOUND", "User not found"))
		return
	}

	c.JSON(http.StatusOK, targetUser.ToUserResponse())
}

// UpdateUser handles updating a user
func (h *AuthHandlers) UpdateUser(c *gin.Context) {
	// TODO: Extract user from JWT and check permissions
	userID := 1 // Placeholder - should come from JWT token

	// Check if requesting user is admin or updating their own profile
	requestingUser, err := h.userRepo.GetByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to get user"))
		return
	}

	targetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "Invalid user ID"))
		return
	}

	// Only allow users to update their own profile or admins to update any profile
	if requestingUser.Role != "admin" && requestingUser.ID != targetID {
		c.JSON(http.StatusForbidden, errResp("FORBIDDEN", "Insufficient permissions"))
		return
	}

	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", err.Error()))
		return
	}

	targetUser, err := h.userRepo.GetByID(targetID)
	if err != nil {
		c.JSON(http.StatusNotFound, errResp("NOT_FOUND", "User not found"))
		return
	}

	// Update fields if provided
	if req.Username != nil {
		// Check if username already exists
		if *req.Username != targetUser.Username {
			exists, err := h.userRepo.ExistsByUsername(*req.Username)
			if err != nil {
				c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to check username"))
				return
			}
			if exists {
				c.JSON(http.StatusConflict, errResp("CONFLICT", "Username already exists"))
				return
			}
		}
		targetUser.Username = *req.Username
	}

	if req.Email != nil {
		// Check if email already exists
		if *req.Email != targetUser.Email {
			exists, err := h.userRepo.ExistsByEmail(*req.Email)
			if err != nil {
				c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to check email"))
				return
			}
			if exists {
				c.JSON(http.StatusConflict, errResp("CONFLICT", "Email already exists"))
				return
			}
		}
		targetUser.Email = *req.Email
	}

	if req.FirstName != nil {
		targetUser.FirstName = *req.FirstName
	}

	if req.LastName != nil {
		targetUser.LastName = *req.LastName
	}

	// Only admins can change role and active status
	if requestingUser.Role == "admin" {
		if req.Role != nil {
			targetUser.Role = *req.Role
		}
		if req.IsActive != nil {
			targetUser.IsActive = *req.IsActive
		}
	}

	if err := h.userRepo.Update(targetUser); err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to update user"))
		return
	}

	c.JSON(http.StatusOK, targetUser.ToUserResponse())
}

// DeleteUser handles deleting a user (admin only)
func (h *AuthHandlers) DeleteUser(c *gin.Context) {
	// TODO: Extract user from JWT and check if admin
	userID := 1 // Placeholder - should come from JWT token

	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to get user"))
		return
	}

	if user.Role != "admin" {
		c.JSON(http.StatusForbidden, errResp("FORBIDDEN", "Insufficient permissions"))
		return
	}

	targetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "Invalid user ID"))
		return
	}

	// Prevent admin from deleting themselves
	if targetID == userID {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "Cannot delete your own account"))
		return
	}

	if err := h.userRepo.Delete(targetID); err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to delete user"))
		return
	}

	c.Status(http.StatusNoContent)
}

// GetProfile handles getting current user profile
func (h *AuthHandlers) GetProfile(c *gin.Context) {
	// TODO: Extract user from JWT
	userID := 1 // Placeholder - should come from JWT token

	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to get user"))
		return
	}

	c.JSON(http.StatusOK, user.ToUserResponse())
}

// UpdateProfile handles updating current user profile
func (h *AuthHandlers) UpdateProfile(c *gin.Context) {
	// TODO: Extract user from JWT
	userID := 1 // Placeholder - should come from JWT token

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", err.Error()))
		return
	}

	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to get user"))
		return
	}

	// Update fields if provided
	if req.FirstName != nil {
		user.FirstName = *req.FirstName
	}

	if req.LastName != nil {
		user.LastName = *req.LastName
	}

	if req.Email != nil {
		// Check if email already exists
		if *req.Email != user.Email {
			exists, err := h.userRepo.ExistsByEmail(*req.Email)
			if err != nil {
				c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to check email"))
				return
			}
			if exists {
				c.JSON(http.StatusConflict, errResp("CONFLICT", "Email already exists"))
				return
			}
		}
		user.Email = *req.Email
	}

	if err := h.userRepo.Update(user); err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to update profile"))
		return
	}

	c.JSON(http.StatusOK, user.ToUserResponse())
}

// ChangePassword handles changing user password
func (h *AuthHandlers) ChangePassword(c *gin.Context) {
	// TODO: Extract user from JWT
	userID := 1 // Placeholder - should come from JWT token

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", err.Error()))
		return
	}

	if err := h.authService.ChangePassword(userID, req); err != nil {
		switch err.Error() {
		case "user not found":
			c.JSON(http.StatusNotFound, errResp("NOT_FOUND", "User not found"))
		case "current password is incorrect":
			c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "Current password is incorrect"))
		default:
			c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to change password"))
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
}

// Helper function to create error responses
func errResp(code, message string) gin.H {
	return gin.H{
		"code":    code,
		"message": message,
	}
}
