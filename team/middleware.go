package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware handles authentication and authorization
type AuthMiddleware struct {
	repo TeamRepository
}

// NewAuthMiddleware creates a new auth middleware
func NewAuthMiddleware(repo TeamRepository) *AuthMiddleware {
	return &AuthMiddleware{repo: repo}
}

// RequireTeamMembership ensures user is a member of the team
func (am *AuthMiddleware) RequireTeamMembership() gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: Extract user ID from JWT token
		userID := 1 // Placeholder - should come from JWT token

		teamID, err := parseID(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid team id"))
			c.Abort()
			return
		}

		// Check if user is member of the team
		isMember, err := am.repo.IsUserInTeam(userID, teamID)
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
		// TODO: Extract user ID from JWT token
		userID := 1 // Placeholder - should come from JWT token

		teamID, err := parseID(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid team id"))
			c.Abort()
			return
		}

		// Check if user is owner of the team
		role, err := am.repo.GetUserRoleInTeam(userID, teamID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "failed to check user role"))
			c.Abort()
			return
		}

		if role == nil || *role != RoleOwner {
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
		// TODO: Extract user ID from JWT token
		userID := 1 // Placeholder - should come from JWT token

		teamID, err := parseID(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid team id"))
			c.Abort()
			return
		}

		// Check if user is owner or admin of the team
		role, err := am.repo.GetUserRoleInTeam(userID, teamID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "failed to check user role"))
			c.Abort()
			return
		}

		if role == nil || (*role != RoleOwner && *role != RoleAdmin) {
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

// Error helper - reusing types from handlers.go
