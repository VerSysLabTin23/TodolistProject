package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/VerSysLabTin23/TodolistProject/auth/internal/models"
	"github.com/VerSysLabTin23/TodolistProject/auth/internal/repository"
	"github.com/VerSysLabTin23/TodolistProject/auth/internal/service"
)

// AuthHandlers handles HTTP requests for authentication
type AuthHandlers struct {
	authService *service.AuthService
	userRepo    repository.UserRepository
}

func NewAuthHandlers(authService *service.AuthService, userRepo repository.UserRepository) *AuthHandlers {
	return &AuthHandlers{authService: authService, userRepo: userRepo}
}

func (h *AuthHandlers) HealthCheck(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) }

func (h *AuthHandlers) Register(c *gin.Context) {
	var req models.RegisterRequest
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

func (h *AuthHandlers) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", err.Error()))
		return
	}
	resp, err := h.authService.AuthenticateUser(req)
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
	c.JSON(http.StatusOK, resp)
}

func (h *AuthHandlers) Refresh(c *gin.Context) {
	var req models.RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", err.Error()))
		return
	}
	resp, err := h.authService.RefreshToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, errResp("UNAUTHORIZED", "Invalid refresh token"))
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *AuthHandlers) Logout(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Logout successful"})
}

func (h *AuthHandlers) ListUsers(c *gin.Context) {
	var filters models.UserFilters
	if err := c.ShouldBindQuery(&filters); err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", err.Error()))
		return
	}
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
	responses := make([]models.UserResponse, 0, len(users))
	for _, u := range users {
		responses = append(responses, u.ToUserResponse())
	}
	c.JSON(http.StatusOK, gin.H{"users": responses, "total": total, "limit": filters.Limit, "offset": filters.Offset})
}

func (h *AuthHandlers) CreateUser(c *gin.Context) {
	var req models.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", err.Error()))
		return
	}
	exists, err := h.userRepo.ExistsByUsername(req.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to check username"))
		return
	}
	if exists {
		c.JSON(http.StatusConflict, errResp("CONFLICT", "Username already exists"))
		return
	}
	exists, err = h.userRepo.ExistsByEmail(req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to check email"))
		return
	}
	if exists {
		c.JSON(http.StatusConflict, errResp("CONFLICT", "Email already exists"))
		return
	}
	hash, err := h.authService.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to hash password"))
		return
	}
	newUser := &models.User{Username: req.Username, Email: req.Email, PasswordHash: hash, FirstName: req.FirstName, LastName: req.LastName, Role: req.Role, IsActive: true}
	if err := h.userRepo.Create(newUser); err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to create user"))
		return
	}
	c.JSON(http.StatusCreated, newUser.ToUserResponse())
}

func (h *AuthHandlers) GetUser(c *gin.Context) {
	targetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "Invalid user ID"))
		return
	}
	targetUser, err := h.userRepo.GetByID(targetID)
	if err != nil {
		c.JSON(http.StatusNotFound, errResp("NOT_FOUND", "User not found"))
		return
	}
	c.JSON(http.StatusOK, targetUser.ToUserResponse())
}

func (h *AuthHandlers) UpdateUser(c *gin.Context) {
	targetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "Invalid user ID"))
		return
	}
	var req models.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", err.Error()))
		return
	}
	user, err := h.userRepo.GetByID(targetID)
	if err != nil {
		c.JSON(http.StatusNotFound, errResp("NOT_FOUND", "User not found"))
		return
	}
	if req.Username != nil {
		if *req.Username != user.Username {
			if exists, err := h.userRepo.ExistsByUsername(*req.Username); err != nil {
				c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to check username"))
				return
			} else if exists {
				c.JSON(http.StatusConflict, errResp("CONFLICT", "Username already exists"))
				return
			}
		}
		user.Username = *req.Username
	}
	if req.Email != nil {
		if *req.Email != user.Email {
			if exists, err := h.userRepo.ExistsByEmail(*req.Email); err != nil {
				c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to check email"))
				return
			} else if exists {
				c.JSON(http.StatusConflict, errResp("CONFLICT", "Email already exists"))
				return
			}
		}
		user.Email = *req.Email
	}
	if req.FirstName != nil {
		user.FirstName = *req.FirstName
	}
	if req.LastName != nil {
		user.LastName = *req.LastName
	}
	if req.Role != nil {
		user.Role = *req.Role
	}
	if req.IsActive != nil {
		user.IsActive = *req.IsActive
	}
	if err := h.userRepo.Update(user); err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to update user"))
		return
	}
	c.JSON(http.StatusOK, user.ToUserResponse())
}

func (h *AuthHandlers) DeleteUser(c *gin.Context) {
	targetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "Invalid user ID"))
		return
	}
	if err := h.userRepo.Delete(targetID); err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to delete user"))
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *AuthHandlers) GetProfile(c *gin.Context) {
	userID := c.GetInt("userID")
	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to get user"))
		return
	}
	c.JSON(http.StatusOK, user.ToUserResponse())
}

func (h *AuthHandlers) UpdateProfile(c *gin.Context) {
	userID := c.GetInt("userID")
	var req models.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", err.Error()))
		return
	}
	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to get user"))
		return
	}
	if req.FirstName != nil {
		user.FirstName = *req.FirstName
	}
	if req.LastName != nil {
		user.LastName = *req.LastName
	}
	if req.Email != nil {
		if *req.Email != user.Email {
			if exists, err := h.userRepo.ExistsByEmail(*req.Email); err != nil {
				c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "Failed to check email"))
				return
			} else if exists {
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

func (h *AuthHandlers) ChangePassword(c *gin.Context) {
	userID := c.GetInt("userID")
	var req models.ChangePasswordRequest
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

func errResp(code, message string) gin.H { return gin.H{"code": code, "message": message} }
