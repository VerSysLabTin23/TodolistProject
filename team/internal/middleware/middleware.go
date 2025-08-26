package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/VerSysLabTin23/TodolistProject/team/internal/clients"
	"github.com/VerSysLabTin23/TodolistProject/team/internal/models"
	"github.com/VerSysLabTin23/TodolistProject/team/internal/repository"
)

// AuthMiddleware handles authentication and authorization
type AuthMiddleware struct {
	repo       repository.TeamRepository
	authClient *clients.AuthClient
}

// NewAuthMiddleware creates a new auth middleware
func NewAuthMiddleware(repo repository.TeamRepository, authClient *clients.AuthClient) *AuthMiddleware {
	return &AuthMiddleware{
		repo:       repo,
		authClient: authClient,
	}
}

// RequireTeamMembership ensures user is a member of the team
func (am *AuthMiddleware) RequireTeamMembership() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Validate Authorization header with Auth Service and set user in context
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, errResp("UNAUTHORIZED", "Missing or invalid authorization header"))
			c.Abort()
			return
		}
		token := strings.TrimPrefix(authHeader, "Bearer ")
		userInfo, err := am.authClient.ValidateToken(token)
		if err != nil || !userInfo.Valid {
			c.JSON(http.StatusUnauthorized, errResp("UNAUTHORIZED", "Invalid or expired token"))
			c.Abort()
			return
		}
		c.Set("userID", userInfo.User.ID)

		userID, _ := c.Get("userID")
		userIDInt, ok := userID.(int)
		if !ok {
			c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "invalid user ID type"))
			c.Abort()
			return
		}

		teamID, err := models.ParseID(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid team id"))
			c.Abort()
			return
		}

		// Check if user is member of the team
		isMember, err := am.repo.IsUserInTeam(userIDInt, teamID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "failed to check team membership"))
			c.Abort()
			return
		}

		if !isMember {
			c.JSON(http.StatusForbidden, errResp("FORBIDDEN", "user is not a member of this team"))
			c.Abort()
			return
		}

		// Store user info in context for handlers to use
		c.Set("userID", userID)
		c.Set("teamID", teamID)
		c.Next()
	}
}

// RequireTeamOwner ensures user is the owner of the team
func (am *AuthMiddleware) RequireTeamOwner() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Validate Authorization header with Auth Service and set user in context
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, errResp("UNAUTHORIZED", "Missing or invalid authorization header"))
			c.Abort()
			return
		}
		token := strings.TrimPrefix(authHeader, "Bearer ")
		userInfo, err := am.authClient.ValidateToken(token)
		if err != nil || !userInfo.Valid {
			c.JSON(http.StatusUnauthorized, errResp("UNAUTHORIZED", "Invalid or expired token"))
			c.Abort()
			return
		}
		c.Set("userID", userInfo.User.ID)

		userID, _ := c.Get("userID")
		userIDInt, ok := userID.(int)
		if !ok {
			c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "invalid user ID type"))
			c.Abort()
			return
		}

		teamID, err := models.ParseID(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid team id"))
			c.Abort()
			return
		}

		// Check if user is owner of the team
		role, err := am.repo.GetUserRoleInTeam(userIDInt, teamID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "failed to check user role"))
			c.Abort()
			return
		}

		if role == nil || *role != models.RoleOwner {
			c.JSON(http.StatusForbidden, errResp("FORBIDDEN", "only team owner can perform this action"))
			c.Abort()
			return
		}

		// Store user info in context for handlers to use
		c.Set("userID", userID)
		c.Set("teamID", teamID)
		c.Next()
	}
}

// RequireTeamAdmin ensures user is owner or admin of the team
func (am *AuthMiddleware) RequireTeamAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Validate Authorization header with Auth Service and set user in context
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, errResp("UNAUTHORIZED", "Missing or invalid authorization header"))
			c.Abort()
			return
		}
		token := strings.TrimPrefix(authHeader, "Bearer ")
		userInfo, err := am.authClient.ValidateToken(token)
		if err != nil || !userInfo.Valid {
			c.JSON(http.StatusUnauthorized, errResp("UNAUTHORIZED", "Invalid or expired token"))
			c.Abort()
			return
		}
		c.Set("userID", userInfo.User.ID)

		userID, _ := c.Get("userID")
		userIDInt, ok := userID.(int)
		if !ok {
			c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "invalid user ID type"))
			c.Abort()
			return
		}

		teamID, err := models.ParseID(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid team id"))
			c.Abort()
			return
		}

		// Check if user is owner or admin of the team
		role, err := am.repo.GetUserRoleInTeam(userIDInt, teamID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "failed to check user role"))
			c.Abort()
			return
		}

		if role == nil || (*role != models.RoleOwner && *role != models.RoleAdmin) {
			c.JSON(http.StatusForbidden, errResp("FORBIDDEN", "only team owner and admin can perform this action"))
			c.Abort()
			return
		}

		// Store user info in context for handlers to use
		c.Set("userID", userID)
		c.Set("teamID", teamID)
		c.Next()
	}
}

// Error helper
type errorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func errResp(code, msg string) errorResponse { return errorResponse{Code: code, Message: msg} }
