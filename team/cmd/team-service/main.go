package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"

	"github.com/VerSysLabTin23/TodolistProject/team/internal/clients"
	"github.com/VerSysLabTin23/TodolistProject/team/internal/events"
	"github.com/VerSysLabTin23/TodolistProject/team/internal/handlers"
	"github.com/VerSysLabTin23/TodolistProject/team/internal/middleware"
	"github.com/VerSysLabTin23/TodolistProject/team/internal/repository"
)

func main() {
	// Environment variables with defaults
	port := getEnv("PORT", "8083")
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "3306")
	dbUser := getEnv("DB_USER", "root")
	dbPass := getEnv("DB_PASS", "")
	dbName := getEnv("DB_NAME", "teamsdb")

	// Connect to database
	dsn := dbUser + ":" + dbPass + "@tcp(" + dbHost + ":" + dbPort + ")/" + dbName + "?charset=utf8mb4&parseTime=true&loc=UTC"
	gdb, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect mysql: %v", err)
	}

	// Note: Database migrations are handled by dbmate, not auto-migrate

	// Wire repositories, handlers, and middleware
	repo := repository.NewTeamRepository(gdb)
	authClient := clients.NewAuthClient()
	h := handlers.NewTeamHandlers(repo)
	auth := middleware.NewAuthMiddleware(repo, authClient)

	// Initialize Kafka producer (optional)
	producer := events.NewKafkaProducer()
	h.SetProducer(producer)
	defer func() {
		if err := producer.Close(); err != nil {
			log.Printf("failed to close kafka producer: %v", err)
		}
	}()

	// Setup router
	r := gin.Default()

	// Health check
	r.GET("/healthz", h.HealthCheck)

	// Internal service endpoints (no auth required for service-to-service communication)
	r.GET("/internal/teams/:id/members", h.GetTeamMembers)

	// Public endpoints
	r.GET("/teams", h.ListTeams)
	r.POST("/teams", h.CreateTeam)
	r.GET("/teams/:id", h.GetTeam)
	r.GET("/users/:userId/teams", h.GetUserTeams)

	// Team management (requires team membership)
	r.PUT("/teams/:id", auth.RequireTeamMembership(), h.UpdateTeam)
	r.DELETE("/teams/:id", auth.RequireTeamOwner(), h.DeleteTeam)

	// Team membership management (requires admin privileges)
	r.GET("/teams/:id/members", auth.RequireTeamMembership(), h.GetTeamMembers)
	r.POST("/teams/:id/members", auth.RequireTeamAdmin(), h.AddMember)
	r.DELETE("/teams/:id/members/:userId", auth.RequireTeamAdmin(), h.RemoveMember)

	log.Printf("team-service listening on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}

func getEnv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
