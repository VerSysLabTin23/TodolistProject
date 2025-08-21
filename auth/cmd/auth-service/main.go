package main

import (
	"fmt"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"

	"github.com/VerSysLabTin23/TodolistProject/auth/internal/handlers"
	"github.com/VerSysLabTin23/TodolistProject/auth/internal/middleware"
	"github.com/VerSysLabTin23/TodolistProject/auth/internal/models"
	"github.com/VerSysLabTin23/TodolistProject/auth/internal/repository"
	"github.com/VerSysLabTin23/TodolistProject/auth/internal/service"
)

func main() {
	port := getEnv("PORT", "8084")
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "3306")
	dbUser := getEnv("DB_USER", "root")
	dbPass := getEnv("DB_PASS", "pass")
	dbName := getEnv("DB_NAME", "authdb")

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&loc=UTC&charset=utf8mb4", dbUser, dbPass, dbHost, dbPort, dbName)
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	if err := db.AutoMigrate(&models.User{}); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	userRepo := repository.NewUserRepository(db)
	authService := service.NewAuthService(userRepo)
	h := handlers.NewAuthHandlers(authService, userRepo)
	jwt := middleware.NewJWTMiddleware(authService)

	r := gin.Default()

	r.GET("/healthz", h.HealthCheck)

	// JWT validation for other services
	r.POST("/validate", jwt.RequireAuth(), func(c *gin.Context) {
		userID, _ := middleware.GetUserIDFromContext(c)
		username, _ := middleware.GetUsernameFromContext(c)
		role, _ := middleware.GetUserRoleFromContext(c)
		c.JSON(200, gin.H{"valid": true, "user": gin.H{"id": userID, "username": username, "role": role}})
	})

	auth := r.Group("/auth")
	{
		auth.POST("/register", h.Register)
		auth.POST("/login", h.Login)
		auth.POST("/refresh", h.Refresh)
		auth.POST("/logout", h.Logout)
	}

	users := r.Group("/users", jwt.RequireAuth())
	{
		users.GET("", h.ListUsers)   // Admin should be enforced upstream if needed
		users.POST("", h.CreateUser) // Admin only (can add jwt.RequireAdmin())
		users.GET(":id", h.GetUser)  // Self or admin (enforce inside handler or via middleware)
		users.PUT(":id", h.UpdateUser)
		users.DELETE(":id", h.DeleteUser)
		users.GET("/profile", h.GetProfile)
		users.PUT("/profile", h.UpdateProfile)
		users.POST("/change-password", h.ChangePassword)
	}

	log.Printf("Auth Service starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
