package main

import (
	"crypto/rand"
	"fmt"
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
// generateEventID returns a UUIDv4 string without external dependencies
func generateEventID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		// Fallback to timestamp when RNG fails (very unlikely)
		return time.Now().UTC().Format("20060102T150405.000000000Z07:00")
	}
	// Set version (4) and variant (RFC 4122)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		uint32(b[0])<<24|uint32(b[1])<<16|uint32(b[2])<<8|uint32(b[3]),
		uint16(b[4])<<8|uint16(b[5]),
		uint16(b[6])<<8|uint16(b[7]),
		uint16(b[8])<<8|uint16(b[9]),
		uint64(b[10])<<40|uint64(b[11])<<32|uint64(b[12])<<24|uint64(b[13])<<16|uint64(b[14])<<8|uint64(b[15]),
	)
}
