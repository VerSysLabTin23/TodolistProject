package middleware

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

// RequireInternalToken enforces a shared token for internal service-to-service calls
func RequireInternalToken() gin.HandlerFunc {
	expected := os.Getenv("INTERNAL_TOKEN")
	return func(c *gin.Context) {
		if expected == "" {
			c.Next()
			return
		}
		token := c.GetHeader("X-Internal-Token")
		if token == "" {
			// also accept Authorization: Bearer <token>
			authz := c.GetHeader("Authorization")
			const bearer = "Bearer "
			if len(authz) > len(bearer) && authz[:len(bearer)] == bearer {
				token = authz[len(bearer):]
			}
		}
		if token != expected {
			c.JSON(http.StatusUnauthorized, gin.H{"code": "UNAUTHORIZED", "message": "invalid internal token"})
			c.Abort()
			return
		}
		c.Next()
	}
}
