package main

import (
	"fmt"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func main() {
	// Load environment variables
	port := getEnv("PORT", "8084")
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "3306")
	dbUser := getEnv("DB_USER", "root")
	dbPass := getEnv("DB_PASS", "pass")
	dbName := getEnv("DB_NAME", "authdb")

	// Connect to database
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&loc=UTC&charset=utf8mb4",
		dbUser, dbPass, dbHost, dbPort, dbName)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Auto-migrate schema
	if err := db.AutoMigrate(&User{}); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	// Initialize services
	userRepo := NewUserRepository(db)
	authService := NewAuthService(userRepo)
	handlers := NewAuthHandlers(authService, userRepo)
	jwtMiddleware := NewJWTMiddleware(authService)

	// Setup router
	r := gin.Default()

	// Health check
	r.GET("/healthz", handlers.HealthCheck)

	// JWT validation endpoint (for other services)
	r.POST("/validate", jwtMiddleware.RequireAuth(), func(c *gin.Context) {
		userID, _ := GetUserIDFromContext(c)
		username, _ := GetUsernameFromContext(c)
		role, _ := GetUserRoleFromContext(c)

		c.JSON(200, gin.H{
			"valid": true,
			"user": gin.H{
				"id":       userID,
				"username": username,
				"role":     role,
			},
		})
	})

	// Authentication endpoints
	auth := r.Group("/auth")
	{
		auth.POST("/register", handlers.Register)
		auth.POST("/login", handlers.Login)
		auth.POST("/refresh", handlers.Refresh)
		auth.POST("/logout", handlers.Logout)
	}

	// User management endpoints (require authentication)
	users := r.Group("/users")
	{
		users.GET("", handlers.ListUsers)                       // Admin only
		users.POST("", handlers.CreateUser)                     // Admin only
		users.GET("/:id", handlers.GetUser)                     // Self or admin
		users.PUT("/:id", handlers.UpdateUser)                  // Self or admin
		users.DELETE("/:id", handlers.DeleteUser)               // Admin only
		users.GET("/profile", handlers.GetProfile)              // Self
		users.PUT("/profile", handlers.UpdateProfile)           // Self
		users.POST("/change-password", handlers.ChangePassword) // Self
	}

	// Start server
	log.Printf("Auth Service starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// getEnv gets an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
