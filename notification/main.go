package main

import (
	"context"
	"net/http"
	"os/signal"
	"syscall"

	"github.com/gin-gonic/gin"
)

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	// Initialize services
	authClient := NewAuthClient()
	emailSender := NewEmailSender()

	// start kafka consumer in background
	stopKafka := startKafkaConsumer(ctx, authClient, emailSender)
	defer stopKafka()

	r := gin.Default()
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "pong from notification service",
		})
	})
	_ = r.Run()
}
