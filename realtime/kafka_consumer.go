package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/segmentio/kafka-go"
)

// KafkaEvent represents the raw event structure from Kafka
type KafkaEvent struct {
	EventType  string      `json:"eventType"`
	TaskID     int         `json:"taskId,omitempty"`
	TeamID     int         `json:"teamId,omitempty"`
	ActorID    int         `json:"actorId,omitempty"`
	CreatorID  int         `json:"creatorId,omitempty"`
	AssigneeID *int        `json:"assigneeId,omitempty"`
	UserID     int         `json:"userId,omitempty"`
	OwnerID    int         `json:"ownerId,omitempty"`
	Role       string      `json:"role,omitempty"`
	Timestamp  time.Time   `json:"timestamp"`
	Payload    interface{} `json:"payload,omitempty"`
}

// TeamMember represents a team member for resolving recipients
type TeamMember struct {
	UserID int    `json:"userId"`
	TeamID int    `json:"teamId"`
	Role   string `json:"role"`
}

// KafkaConsumer handles consuming events from Kafka and broadcasting to WebSocket clients
type KafkaConsumer struct {
	hub        *Hub
	topics     []string
	teamAPIURL string
}

// NewKafkaConsumer creates a new Kafka consumer
func NewKafkaConsumer(hub *Hub) *KafkaConsumer {
	teamAPIURL := os.Getenv("TEAM_API_URL")
	if teamAPIURL == "" {
		teamAPIURL = "http://team_service:8083"
	}

	return &KafkaConsumer{
		hub:        hub,
		teamAPIURL: teamAPIURL,
		topics: []string{
			"task.created",
			"task.updated",
			"task.deleted",
			"task.completed",
			"team.created",
			"team.updated",
			"team.deleted",
			"team.member_added",
			"team.member_removed",
			"team.member_role_updated",
			"user.created",
		},
	}
}

// Start begins consuming events from Kafka
func (kc *KafkaConsumer) Start(ctx context.Context) {
	brokers := os.Getenv("KAFKA_BROKERS")
	if brokers == "" {
		brokers = "dev_kafka:9092"
	}

	log.Printf("Starting Kafka consumer with brokers: %s, topics: %v", brokers, kc.topics)

	// Create a reader for each topic
	for _, topic := range kc.topics {
		go kc.consumeTopic(ctx, brokers, topic)
	}
}

// consumeTopic consumes events from a specific Kafka topic
func (kc *KafkaConsumer) consumeTopic(ctx context.Context, brokers, topic string) {
	r := kafka.NewReader(kafka.ReaderConfig{
		Brokers:  []string{brokers},
		Topic:    topic,
		GroupID:  "realtime-service",
		MinBytes: 10e3, // 10KB
		MaxBytes: 10e6, // 10MB
		MaxWait:  1 * time.Second,
		// Partition assignment strategy ensures proper load balancing
		// Events are partitioned by team ID, so related events stay together
	})
	defer r.Close()

	log.Printf("Starting consumer for topic: %s", topic)

	for {
		select {
		case <-ctx.Done():
			log.Printf("Context cancelled, stopping consumer for topic: %s", topic)
			return
		default:
			m, err := r.ReadMessage(ctx)
			if err != nil {
				if ctx.Err() != nil {
					return
				}
				log.Printf("Kafka read error on topic %s: %v", topic, err)
				continue
			}

			log.Printf("[kafka] %s key=%s value=%s", topic, string(m.Key), string(m.Value))

			// Parse the event
			var event KafkaEvent
			if err := json.Unmarshal(m.Value, &event); err != nil {
				log.Printf("Failed to parse event from topic %s: %v", topic, err)
				continue
			}

			// Convert to unified event and broadcast to relevant users
			unifiedEvent := kc.convertToUnifiedEvent(event)
			if unifiedEvent != nil {
				targetUsers := kc.resolveTargetUsers(event)
				if len(targetUsers) > 0 {
					kc.hub.BroadcastToUsers(*unifiedEvent, targetUsers)
				}
			}
		}
	}
}

// resolveTargetUsers determines which users should receive a specific event
func (kc *KafkaConsumer) resolveTargetUsers(event KafkaEvent) []int {
	var targetUsers []int

	log.Printf("🎯 Resolving target users for event: %s, TeamID: %d", event.EventType, event.TeamID)

	switch event.EventType {
	case "task.created", "task.updated", "task.deleted", "task.completed":
		// Task events: notify team members + assignee + creator
		if event.TeamID > 0 {
			teamMembers := kc.getTeamMembers(event.TeamID)
			log.Printf("👥 Found %d team members for team %d", len(teamMembers), event.TeamID)
			for _, member := range teamMembers {
				targetUsers = append(targetUsers, member.UserID)
				log.Printf("➕ Adding team member: UserID=%d", member.UserID)
			}
		}

		// Also notify assignee and creator specifically
		if event.AssigneeID != nil && *event.AssigneeID > 0 {
			targetUsers = append(targetUsers, *event.AssigneeID)
			log.Printf("➕ Adding assignee: UserID=%d", *event.AssigneeID)
		}
		if event.CreatorID > 0 {
			targetUsers = append(targetUsers, event.CreatorID)
			log.Printf("➕ Adding creator: UserID=%d", event.CreatorID)
		}

	case "team.created", "team.updated", "team.deleted":
		// Team events: notify team members + owner
		if event.TeamID > 0 {
			teamMembers := kc.getTeamMembers(event.TeamID)
			log.Printf("👥 Found %d team members for team %d", len(teamMembers), event.TeamID)
			for _, member := range teamMembers {
				targetUsers = append(targetUsers, member.UserID)
				log.Printf("➕ Adding team member: UserID=%d", member.UserID)
			}
		}
		if event.OwnerID > 0 {
			targetUsers = append(targetUsers, event.OwnerID)
			log.Printf("➕ Adding owner: UserID=%d", event.OwnerID)
		}

	case "team.member_added", "team.member_removed", "team.member_role_updated":
		// Team member events: notify team members + affected user
		if event.TeamID > 0 {
			teamMembers := kc.getTeamMembers(event.TeamID)
			for _, member := range teamMembers {
				targetUsers = append(targetUsers, member.UserID)
			}
		}
		if event.UserID > 0 {
			targetUsers = append(targetUsers, event.UserID)
		}

	case "user.created":
		// User events: notify the user themselves
		if event.UserID > 0 {
			targetUsers = append(targetUsers, event.UserID)
		}
	}

	// Remove duplicates
	result := removeDuplicateInts(targetUsers)
	log.Printf("🎯 Final target users after deduplication: %v", result)
	return result
}

// getTeamMembers retrieves team members from the team service
func (kc *KafkaConsumer) getTeamMembers(teamID int) []TeamMember {
	url := fmt.Sprintf("%s/internal/teams/%d/members", kc.teamAPIURL, teamID)

	log.Printf("🔍 Fetching team members from: %s", url)

	resp, err := http.Get(url)
	if err != nil {
		log.Printf("❌ Failed to get team members for team %d: %v", teamID, err)
		return []TeamMember{}
	}
	defer resp.Body.Close()

	log.Printf("📡 Team service response status: %d for team %d", resp.StatusCode, teamID)

	if resp.StatusCode != http.StatusOK {
		log.Printf("⚠️ Team service returned status %d for team %d", resp.StatusCode, teamID)
		// 读取响应body以便调试
		body, _ := io.ReadAll(resp.Body)
		log.Printf("📄 Response body: %s", string(body))
		return []TeamMember{}
	}

	var members []TeamMember
	if err := json.NewDecoder(resp.Body).Decode(&members); err != nil {
		log.Printf("❌ Failed to decode team members response for team %d: %v", teamID, err)
		return []TeamMember{}
	}

	log.Printf("✅ Successfully retrieved %d members for team %d: %+v", len(members), teamID, members)
	return members
}

// removeDuplicateInts removes duplicate integers from a slice
func removeDuplicateInts(slice []int) []int {
	keys := make(map[int]bool)
	result := []int{}

	for _, item := range slice {
		if !keys[item] {
			keys[item] = true
			result = append(result, item)
		}
	}

	return result
}

// convertToUnifiedEvent converts a Kafka event to a unified WebSocket event
func (kc *KafkaConsumer) convertToUnifiedEvent(event KafkaEvent) *UnifiedEvent {
	switch event.EventType {
	case "task.created", "task.updated", "task.deleted", "task.completed":
		return kc.convertTaskEvent(event)
	case "team.created", "team.updated", "team.deleted":
		return kc.convertTeamEvent(event)
	case "team.member_added", "team.member_removed", "team.member_role_updated":
		return kc.convertTeamMemberEvent(event)
	case "user.created":
		return kc.convertUserEvent(event)
	default:
		log.Printf("Unknown event type: %s", event.EventType)
		return nil
	}
}

// convertTaskEvent converts a task event to unified format
func (kc *KafkaConsumer) convertTaskEvent(event KafkaEvent) *UnifiedEvent {
	var taskData TaskEventData
	taskData.TaskID = event.TaskID
	taskData.CreatorID = event.CreatorID
	taskData.AssigneeID = event.AssigneeID

	// Extract data from payload
	if payload, ok := event.Payload.(map[string]interface{}); ok {
		if title, exists := payload["title"].(string); exists {
			taskData.Title = title
		}
		if desc, exists := payload["description"]; exists {
			if descStr, ok := desc.(string); ok {
				taskData.Description = &descStr
			}
		}
		if completed, exists := payload["completed"].(bool); exists {
			taskData.Completed = &completed
		}
		if priority, exists := payload["priority"].(string); exists {
			taskData.Priority = priority
		}
		if due, exists := payload["due"].(string); exists {
			taskData.Due = due
		}
	}

	return &UnifiedEvent{
		EventID:   generateEventID(),
		Type:      event.EventType,
		TeamID:    event.TeamID,
		ActorID:   event.ActorID,
		Timestamp: event.Timestamp,
		Data:      taskData,
	}
}

// convertTeamEvent converts a team event to unified format
func (kc *KafkaConsumer) convertTeamEvent(event KafkaEvent) *UnifiedEvent {
	var teamData TeamEventData
	teamData.TeamID = event.TeamID
	teamData.OwnerID = event.OwnerID

	// Extract data from payload
	if payload, ok := event.Payload.(map[string]interface{}); ok {
		if name, exists := payload["name"].(string); exists {
			teamData.Name = name
		}
		if desc, exists := payload["description"]; exists {
			if descStr, ok := desc.(string); ok {
				teamData.Description = &descStr
			}
		}
	}

	return &UnifiedEvent{
		EventID:   generateEventID(),
		Type:      event.EventType,
		TeamID:    event.TeamID,
		ActorID:   event.ActorID,
		Timestamp: event.Timestamp,
		Data:      teamData,
	}
}

// convertTeamMemberEvent converts a team member event to unified format
func (kc *KafkaConsumer) convertTeamMemberEvent(event KafkaEvent) *UnifiedEvent {
	var memberData TeamMemberEventData
	memberData.TeamID = event.TeamID
	memberData.UserID = event.UserID
	memberData.Role = event.Role

	return &UnifiedEvent{
		EventID:   generateEventID(),
		Type:      event.EventType,
		TeamID:    event.TeamID,
		ActorID:   event.ActorID,
		Timestamp: event.Timestamp,
		Data:      memberData,
	}
}

// convertUserEvent converts a user event to unified format
func (kc *KafkaConsumer) convertUserEvent(event KafkaEvent) *UnifiedEvent {
	var userData UserEventData
	userData.UserID = event.UserID

	// Extract data from payload
	if payload, ok := event.Payload.(map[string]interface{}); ok {
		if email, exists := payload["email"].(string); exists {
			userData.Email = email
		}
		if username, exists := payload["username"].(string); exists {
			userData.Username = username
		}
	}

	// User events don't have a specific team, so we broadcast to team 0 (global)
	// In practice, you might want to handle this differently
	return &UnifiedEvent{
		EventID:   generateEventID(),
		Type:      event.EventType,
		TeamID:    0, // Global events
		ActorID:   event.UserID,
		Timestamp: event.Timestamp,
		Data:      userData,
	}
}
