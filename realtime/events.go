package main

import (
	"time"
)

// UnifiedEvent represents a common event structure for all WebSocket messages
type UnifiedEvent struct {
	EventID   string      `json:"eventId"`
	Type      string      `json:"type"`
	TeamID    int         `json:"teamId"`
	ActorID   int         `json:"actorId"`
	Timestamp time.Time   `json:"timestamp"`
	Data      interface{} `json:"data"`
}

// TaskEventData represents task-specific event data
type TaskEventData struct {
	TaskID      int     `json:"taskId"`
	CreatorID   int     `json:"creatorId"`
	AssigneeID  *int    `json:"assigneeId,omitempty"`
	Title       string  `json:"title,omitempty"`
	Description *string `json:"description,omitempty"`
	Completed   *bool   `json:"completed,omitempty"`
	Priority    string  `json:"priority,omitempty"`
	Due         string  `json:"due,omitempty"`
}

// TeamEventData represents team-specific event data
type TeamEventData struct {
	TeamID      int     `json:"teamId"`
	Name        string  `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
	OwnerID     int     `json:"ownerId"`
}

// TeamMemberEventData represents team membership event data
type TeamMemberEventData struct {
	TeamID int    `json:"teamId"`
	UserID int    `json:"userId"`
	Role   string `json:"role,omitempty"`
}

// UserEventData represents user-specific event data
type UserEventData struct {
	UserID   int    `json:"userId"`
	Email    string `json:"email,omitempty"`
	Username string `json:"username,omitempty"`
}

// Event type constants
const (
	// Task events
	EventTaskCreated   = "task.created"
	EventTaskUpdated   = "task.updated"
	EventTaskDeleted   = "task.deleted"
	EventTaskCompleted = "task.completed"

	// Team events
	EventTeamCreated           = "team.created"
	EventTeamUpdated           = "team.updated"
	EventTeamDeleted           = "team.deleted"
	EventTeamMemberAdded       = "team.member_added"
	EventTeamMemberRemoved     = "team.member_removed"
	EventTeamMemberRoleUpdated = "team.member_role_updated"

	// User events
	EventUserCreated = "user.created"
)

// CreateUnifiedEvent creates a unified event from various event types
func CreateUnifiedEvent(eventType string, teamID, actorID int, data interface{}) UnifiedEvent {
	return UnifiedEvent{
		EventID:   generateEventID(),
		Type:      eventType,
		TeamID:    teamID,
		ActorID:   actorID,
		Timestamp: time.Now(),
		Data:      data,
	}
}

// generateEventID generates a unique event ID
func generateEventID() string {
	// Simple timestamp-based ID for now
	// In production, consider using UUID
	return time.Now().Format("20060102150405") + "-" + itoa(int(time.Now().UnixNano()%10000))
}

// small itoa to avoid fmt import
func itoa(i int) string {
	if i == 0 {
		return "0"
	}
	neg := false
	if i < 0 {
		neg = true
		i = -i
	}
	var buf [20]byte
	pos := len(buf)
	for i > 0 {
		pos--
		buf[pos] = byte('0' + i%10)
		i /= 10
	}
	if neg {
		pos--
		buf[pos] = '-'
	}
	return string(buf[pos:])
}
