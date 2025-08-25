package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/segmentio/kafka-go"
)

type TaskEvent struct {
	EventType  string      `json:"eventType"`
	TaskID     int         `json:"taskId"`
	TeamID     int         `json:"teamId"`
	ActorID    int         `json:"actorId"`
	CreatorID  int         `json:"creatorId"`
	AssigneeID *int        `json:"assigneeId,omitempty"`
	Timestamp  time.Time   `json:"timestamp"`
	Payload    interface{} `json:"payload,omitempty"`
}

type UserEvent struct {
	EventType string      `json:"eventType"`
	UserID    int         `json:"userId"`
	Timestamp time.Time   `json:"timestamp"`
	Payload   interface{} `json:"payload,omitempty"`
}

func startKafkaConsumer(ctx context.Context, authClient *AuthClient, emailSender *EmailSender) func() {
	brokers := os.Getenv("KAFKA_BROKERS")
	if brokers == "" {
		brokers = "dev_kafka:9092"
	}
	topics := []string{"task.updated", "task.completed", "user.created"}

	log.Printf("Starting Kafka consumer with brokers: %s, topics: %v", brokers, topics)

	// For simplicity, use a single reader per topic in goroutines
	stopFns := make([]func(), 0, len(topics))
	for _, tp := range topics {
		tp := tp
		log.Printf("Creating Kafka reader for topic: %s", tp)
		r := kafka.NewReader(kafka.ReaderConfig{Brokers: []string{brokers}, GroupID: "notification-service", Topic: tp})
		go func() {
			log.Printf("Starting consumer goroutine for topic: %s", tp)
			for {
				m, err := r.ReadMessage(ctx)
				if err != nil {
					if ctx.Err() != nil {
						log.Printf("Context cancelled, stopping consumer for topic: %s", tp)
						return
					}
					log.Printf("kafka read error on %s: %v", tp, err)
					continue
				}

				log.Printf("[kafka] %s key=%s value=%s", tp, string(m.Key), string(m.Value))

				// Parse the event based on topic
				switch tp {
				case "task.updated", "task.completed":
					var event TaskEvent
					if err := json.Unmarshal(m.Value, &event); err != nil {
						log.Printf("failed to parse task event: %v", err)
						continue
					}
					processTaskEvent(authClient, emailSender, tp, event)

				case "user.created":
					var event UserEvent
					if err := json.Unmarshal(m.Value, &event); err != nil {
						log.Printf("failed to parse user event: %v", err)
						continue
					}
					processUserEvent(emailSender, tp, event)
				}
			}
		}()
		stopFns = append(stopFns, func() { _ = r.Close() })
	}
	log.Printf("Kafka consumer setup complete, listening for events...")
	return func() {
		for _, f := range stopFns {
			f()
		}
	}
}

func processTaskEvent(authClient *AuthClient, emailSender *EmailSender, eventType string, event TaskEvent) {
	log.Printf("Parsed task event: CreatorID=%d, AssigneeID=%v", event.CreatorID, event.AssigneeID)

	// Send email to creator
	creatorEmailSent := false
	if err := sendEmailToUser(authClient, emailSender, event.CreatorID, eventType, event); err != nil {
		log.Printf("failed to send email to creator %d: %v", event.CreatorID, err)
	} else {
		creatorEmailSent = true
	}

	// Send email to assignee if exists
	assigneeEmailSent := false
	if event.AssigneeID != nil && *event.AssigneeID != event.CreatorID {
		if err := sendEmailToUser(authClient, emailSender, *event.AssigneeID, eventType, event); err != nil {
			log.Printf("failed to send email to assignee %d: %v", *event.AssigneeID, err)
		} else {
			assigneeEmailSent = true
		}
	}

	// Log summary
	log.Printf("Event %s processed: creator email %s, assignee email %s",
		eventType,
		map[bool]string{true: "sent", false: "failed"}[creatorEmailSent],
		map[bool]string{true: "sent", false: "failed"}[assigneeEmailSent])
}

func processUserEvent(emailSender *EmailSender, eventType string, event UserEvent) {
	log.Printf("Parsed user event: UserID=%d", event.UserID)

	// Extract user info from payload
	payload, ok := event.Payload.(map[string]interface{})
	if !ok {
		log.Printf("failed to parse user event payload")
		return
	}

	email, emailOk := payload["email"].(string)
	username, usernameOk := payload["username"].(string)
	if !emailOk || !usernameOk {
		log.Printf("failed to extract email or username from user event")
		return
	}

	// Send welcome email
	subject := "Welcome to Todo App!"
	body := createWelcomeEmailBody(username, event.UserID)

	if err := emailSender.Send(email, subject, body); err != nil {
		log.Printf("failed to send welcome email to %s: %v", email, err)
		return
	}

	log.Printf("User welcome email sent successfully to %s (%s)", email, username)
}

func createWelcomeEmailBody(username string, userID int) string {
	return fmt.Sprintf("Hello %s,\n\nWelcome to Todo App! 🎉\n\nYour account has been successfully created with User ID: %d\n\nWe're excited to have you on board. You can now:\n- Create and manage tasks\n- Join teams and collaborate\n- Track your progress\n\nBest regards,\nTodo App Team", username, userID)
}

func sendEmailToUser(authClient *AuthClient, emailSender *EmailSender, userID int, eventType string, event TaskEvent) error {
	// Get user info from auth service
	user, err := authClient.GetUserByID(userID)
	if err != nil {
		return err
	}

	// Create email subject and body
	subject := "Task Update: " + eventType
	body := createEmailBody(eventType, event, user.Username)

	// Send email
	if err := emailSender.Send(user.Email, subject, body); err != nil {
		return err
	}

	// Log successful email sending
	log.Printf("Email sent successfully to %s (%s) for %s event", user.Email, user.Username, eventType)
	return nil
}

func createEmailBody(eventType string, event TaskEvent, username string) string {
	switch eventType {
	case "task.updated":
		return fmt.Sprintf("Hello %s,\n\nA task has been updated:\n- Task ID: %d\n- Team ID: %d\n- Updated by: User %d\n- Timestamp: %s\n\nBest regards,\nTodo App",
			username, event.TaskID, event.TeamID, event.ActorID, event.Timestamp)
	case "task.completed":
		completed := "completed"
		if payload, ok := event.Payload.(map[string]interface{}); ok {
			if completedVal, exists := payload["completed"]; exists {
				if completedBool, ok := completedVal.(bool); ok && !completedBool {
					completed = "marked as incomplete"
				}
			}
		}
		return fmt.Sprintf("Hello %s,\n\nA task has been %s:\n- Task ID: %d\n- Team ID: %d\n- Action by: User %d\n- Timestamp: %s\n\nBest regards,\nTodo App",
			username, completed, event.TaskID, event.TeamID, event.ActorID, event.Timestamp)
	default:
		return fmt.Sprintf("Hello %s,\n\nA task event occurred:\n- Event: %s\n- Task ID: %d\n- Team ID: %d\n- Actor: User %d\n- Timestamp: %s\n\nBest regards,\nTodo App",
			username, eventType, event.TaskID, event.TeamID, event.ActorID, event.Timestamp)
	}
}
