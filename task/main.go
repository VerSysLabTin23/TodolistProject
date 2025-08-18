package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func main() {
	// --- env with defaults ---
	port := getEnv("PORT", "8081")
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "3306")
	dbUser := getEnv("DB_USER", "root")
	dbPass := getEnv("DB_PASS", "")
	dbName := getEnv("DB_NAME", "tasksdb")

	// --- connect DB ---
	dsn := dbUser + ":" + dbPass + "@tcp(" + dbHost + ":" + dbPort + ")/" + dbName + "?charset=utf8mb4&parseTime=true&loc=UTC"
	gdb, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect mysql: %v", err)
	}

	// --- wire repos/handlers ---
	repo := NewTaskRepository(gdb)
	teamClient := NewTeamClient()
	h := NewTaskHandlers(repo, teamClient)

	// --- router ---
	r := gin.Default()

	// Health check
	r.GET("/healthz", h.HealthCheck)

	// Team-scoped task collection (recommended)
	r.GET("/teams/:teamId/tasks", h.ListTasksByTeam)
	r.POST("/teams/:teamId/tasks", h.CreateTaskInTeam)

	// Cross-team collection (optional convenience)
	r.GET("/tasks", h.ListTasksAcrossTeams)

	// Single task operations
	r.GET("/tasks/:id", h.GetTask)
	r.PUT("/tasks/:id", h.UpdateTask)
	r.DELETE("/tasks/:id", h.DeleteTask)

	// Handy sub-resources
	r.PUT("/tasks/:id/assignee", h.SetAssignee)
	r.POST("/tasks/:id/complete", h.UpdateCompletion)

	log.Printf("task-service listening on :%s", port)
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
