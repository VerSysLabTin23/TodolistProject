package main

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware handles authentication and authorization for Task Service
type AuthMiddleware struct {
	authClient *AuthClient
}

// NewAuthMiddleware creates a new auth middleware
func NewAuthMiddleware(authClient *AuthClient) *AuthMiddleware {
	return &AuthMiddleware{
		authClient: authClient,
	}
}

// RequireAuth ensures the request has a valid JWT token
func (am *AuthMiddleware) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    "UNAUTHORIZED",
				"message": "Missing authorization header",
			})
			c.Abort()
			return
		}

		// Check if it's a Bearer token
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    "UNAUTHORIZED",
				"message": "Invalid authorization header format",
			})
			c.Abort()
			return
		}

		// Extract token
		token := strings.TrimPrefix(authHeader, "Bearer ")

		// Validate token with Auth Service
		userInfo, err := am.authClient.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    "UNAUTHORIZED",
				"message": "Invalid or expired token",
			})
			c.Abort()
			return
		}

		if !userInfo.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    "UNAUTHORIZED",
				"message": "Invalid token",
			})
			c.Abort()
			return
		}

		// Store user info in context
		c.Set("userID", userInfo.User.ID)
		c.Set("username", userInfo.User.Username)
		c.Set("userRole", userInfo.User.Role)

		c.Next()
	}
}

// RequireRole ensures the user has a specific role
func (am *AuthMiddleware) RequireRole(requiredRole string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// First ensure authentication
		am.RequireAuth()(c)
		if c.IsAborted() {
			return
		}

		// Check role
		userRole, exists := c.Get("userRole")
		if !exists {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "User role not found in context",
			})
			c.Abort()
			return
		}

		if userRole != requiredRole {
			c.JSON(http.StatusForbidden, gin.H{
				"code":    "FORBIDDEN",
				"message": "Insufficient permissions",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireAdmin ensures the user is an admin
func (am *AuthMiddleware) RequireAdmin() gin.HandlerFunc {
	return am.RequireRole("admin")
}

// GetUserIDFromContext extracts user ID from gin context
func GetUserIDFromContext(c *gin.Context) (int, bool) {
	userID, exists := c.Get("userID")
	if !exists {
		return 0, false
	}

	if id, ok := userID.(int); ok {
		return id, true
	}

	return 0, false
}

// GetUsernameFromContext extracts username from gin context
func GetUsernameFromContext(c *gin.Context) (string, bool) {
	username, exists := c.Get("username")
	if !exists {
		return "", false
	}

	if name, ok := username.(string); ok {
		return name, true
	}

	return "", false
}

// GetUserRoleFromContext extracts user role from gin context
func GetUserRoleFromContext(c *gin.Context) (string, bool) {
	role, exists := c.Get("userRole")
	if !exists {
		return "", false
	}

	if userRole, ok := role.(string); ok {
		return userRole, true
	}

	return "", false
}
