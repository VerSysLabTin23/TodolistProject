package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
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

	// Auto-migrate database schema
	if err := gdb.AutoMigrate(&Team{}, &TeamMember{}); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	// Wire repositories, handlers, and middleware
	repo := NewTeamRepository(gdb)
	authClient := NewAuthClient()
	h := NewTeamHandlers(repo)
	auth := NewAuthMiddleware(repo, authClient)

	// Setup router
	r := gin.Default()

	// Health check
	r.GET("/healthz", h.HealthCheck)

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
