package models

import (
	"errors"
	"strconv"
	"time"
)

// Role represents the role of a user in a team
type Role string

const (
	RoleOwner  Role = "owner"
	RoleAdmin  Role = "admin"
	RoleMember Role = "member"
)

// Team represents a team entity
type Team struct {
	ID          int       `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	Name        string    `gorm:"column:name;type:varchar(255);not null" json:"name"`
	Description *string   `gorm:"column:description;type:text" json:"description,omitempty"`
	OwnerID     int       `gorm:"column:owner_id;not null" json:"ownerId"`
	CreatedAt   time.Time `gorm:"column:created_at;autoCreateTime" json:"-"`
	UpdatedAt   time.Time `gorm:"column:updated_at;autoUpdateTime" json:"-"`
}

// TeamMember represents a user's membership in a team
type TeamMember struct {
	UserID   int       `gorm:"column:user_id;primaryKey" json:"userId"`
	TeamID   int       `gorm:"column:team_id;primaryKey" json:"teamId"`
	Role     Role      `gorm:"column:role;type:enum('owner','admin','member');not null" json:"role"`
	JoinedAt time.Time `gorm:"column:joined_at;autoCreateTime" json:"joinedAt"`
}

// DTOs for API requests/responses

type TeamResponse struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	OwnerID     int     `json:"ownerId"`
	CreatedAt   string  `json:"createdAt"`
	UpdatedAt   string  `json:"updatedAt"`
}

type NewTeam struct {
	Name        string  `json:"name"`
	Description *string `json:"description"`
}

type UpdateTeam struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
}

type TeamMemberResponse struct {
	UserID   int    `json:"userId"`
	TeamID   int    `json:"teamId"`
	Role     string `json:"role"`
	JoinedAt string `json:"joinedAt"`
}

type AddMember struct {
	UserID int  `json:"userId"`
	Role   Role `json:"role"`
}

type TeamFilters struct {
	Query  *string `form:"q"`
	Limit  *int    `form:"limit"`
	Offset *int    `form:"offset"`
}

// Helper functions

func MapTeam(t Team) TeamResponse {
	return TeamResponse{
		ID:          t.ID,
		Name:        t.Name,
		Description: t.Description,
		OwnerID:     t.OwnerID,
		CreatedAt:   t.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:   t.UpdatedAt.UTC().Format(time.RFC3339),
	}
}

func MapTeams(ts []Team) []TeamResponse {
	out := make([]TeamResponse, 0, len(ts))
	for _, t := range ts {
		out = append(out, MapTeam(t))
	}
	return out
}

func MapTeamMember(tm TeamMember) TeamMemberResponse {
	return TeamMemberResponse{
		UserID:   tm.UserID,
		TeamID:   tm.TeamID,
		Role:     string(tm.Role),
		JoinedAt: tm.JoinedAt.UTC().Format(time.RFC3339),
	}
}

func MapTeamMembers(tms []TeamMember) []TeamMemberResponse {
	out := make([]TeamMemberResponse, 0, len(tms))
	for _, tm := range tms {
		out = append(out, MapTeamMember(tm))
	}
	return out
}

func ParseID(s string) (int, error) {
	id, err := strconv.Atoi(s)
	if err != nil || id < 1 {
		return 0, errors.New("invalid id")
	}
	return id, nil
}

func ValidateRole(role string) bool {
	return role == "owner" || role == "admin" || role == "member"
}
