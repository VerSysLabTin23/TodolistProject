package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"

	"github.com/VerSysLabTin23/TodolistProject/task/internal/clients"
	"github.com/VerSysLabTin23/TodolistProject/task/internal/handlers"
	"github.com/VerSysLabTin23/TodolistProject/task/internal/middleware"
	"github.com/VerSysLabTin23/TodolistProject/task/internal/repository"
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
	repo := repository.NewTaskRepository(gdb)
	teamClient := clients.NewTeamClient()
	authClient := clients.NewAuthClient()
	h := handlers.NewTaskHandlers(repo, teamClient)
	auth := middleware.NewAuthMiddleware(authClient)

	// --- router ---
	r := gin.Default()

	// Health check
	r.GET("/healthz", h.HealthCheck)

	// Team-scoped task collection (recommended) - requires authentication
	r.GET("/teams/:teamId/tasks", auth.RequireAuth(), h.ListTasksByTeam)
	r.POST("/teams/:teamId/tasks", auth.RequireAuth(), h.CreateTaskInTeam)

	// Cross-team collection (optional convenience) - requires authentication
	r.GET("/tasks", auth.RequireAuth(), h.ListTasksAcrossTeams)

	// Single task operations - requires authentication
	r.GET("/tasks/:id", auth.RequireAuth(), h.GetTask)
	r.PUT("/tasks/:id", auth.RequireAuth(), h.UpdateTask)
	r.DELETE("/tasks/:id", auth.RequireAuth(), h.DeleteTask)

	// Handy sub-resources - requires authentication
	r.PUT("/tasks/:id/assignee", auth.RequireAuth(), h.SetAssignee)
	r.POST("/tasks/:id/complete", auth.RequireAuth(), h.UpdateCompletion)

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
