package middleware

import (
	"net/http"
	"strings"

	"github.com/VerSysLabTin23/TodolistProject/auth/internal/service"
	"github.com/gin-gonic/gin"
)

// JWTMiddleware handles JWT token validation
type JWTMiddleware struct{ authService *service.AuthService }

func NewJWTMiddleware(authService *service.AuthService) *JWTMiddleware {
	return &JWTMiddleware{authService: authService}
}

// RequireAuth validates the Authorization header and verifies the JWT:
// - expects header format: "Authorization: Bearer <token>"
// - extracts token and delegates validation to AuthService.ValidateToken
// - on success, puts user information (id, username, role) into the request context
// - on failure, responds 401 and aborts the request
func (m *JWTMiddleware) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"code": "UNAUTHORIZED", "message": "Missing authorization header"})
			c.Abort()
			return
		}
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"code": "UNAUTHORIZED", "message": "Invalid authorization header format"})
			c.Abort()
			return
		}
		token := strings.TrimPrefix(authHeader, "Bearer ")
		claims, err := m.authService.ValidateToken(token) // validate token: parse token and check if it is valid
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"code": "UNAUTHORIZED", "message": "Invalid or expired token"})
			c.Abort()
			return
		}
		c.Set("userID", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("userRole", claims.Role)
		c.Next()
	}
}

func (m *JWTMiddleware) RequireRole(requiredRole string) gin.HandlerFunc {
	return func(c *gin.Context) {
		m.RequireAuth()(c)
		if c.IsAborted() {
			return
		}
		userRole, exists := c.Get("userRole")
		if !exists {
			c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL_ERROR", "message": "User role not found in context"})
			c.Abort()
			return
		}
		if userRole != requiredRole {
			c.JSON(http.StatusForbidden, gin.H{"code": "FORBIDDEN", "message": "Insufficient permissions"})
			c.Abort()
			return
		}
		c.Next()
	}
}

func (m *JWTMiddleware) RequireAdmin() gin.HandlerFunc { return m.RequireRole("admin") }

func GetUserIDFromContext(c *gin.Context) (int, bool) {
	v, ok := c.Get("userID")
	if !ok {
		return 0, false
	}
	if id, ok := v.(int); ok {
		return id, true
	}
	return 0, false
}
func GetUsernameFromContext(c *gin.Context) (string, bool) {
	v, ok := c.Get("username")
	if !ok {
		return "", false
	}
	if s, ok := v.(string); ok {
		return s, true
	}
	return "", false
}
func GetUserRoleFromContext(c *gin.Context) (string, bool) {
	v, ok := c.Get("userRole")
	if !ok {
		return "", false
	}
	if s, ok := v.(string); ok {
		return s, true
	}
	return "", false
}
