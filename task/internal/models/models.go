package models

import (
	"errors"
	"strconv"
	"time"
)

// --- DB model ---

type Priority string

const (
	PriorityLow    Priority = "low"
	PriorityMedium Priority = "medium"
	PriorityHigh   Priority = "high"
)

type Task struct {
	ID          int       `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	TeamID      int       `gorm:"column:team_id;not null" json:"teamId"`
	CreatorID   int       `gorm:"column:creator_id;not null" json:"creatorId"`
	AssigneeID  *int      `gorm:"column:assignee_id" json:"assigneeId"`
	Title       string    `gorm:"column:title;type:varchar(255);not null" json:"title"`
	Description *string   `gorm:"column:description;type:text" json:"description,omitempty"`
	Completed   bool      `gorm:"column:completed;type:boolean;not null;default:false" json:"completed"`
	Priority    Priority  `gorm:"column:priority;type:enum('low','medium','high');not null" json:"priority"`
	Due         time.Time `gorm:"column:due;type:date;not null" json:"-"`
	CreatedAt   time.Time `gorm:"column:created_at;autoCreateTime" json:"-"`
	UpdatedAt   time.Time `gorm:"column:updated_at;autoUpdateTime" json:"-"`
}

// --- DTOs (与 OpenAPI 对齐) ---

type TaskResponse struct {
	ID          int     `json:"id"`
	TeamID      int     `json:"teamId"`
	CreatorID   int     `json:"creatorId"`
	AssigneeID  *int    `json:"assigneeId"`
	Title       string  `json:"title"`
	Description *string `json:"description,omitempty"`
	Completed   bool    `json:"completed"`
	Priority    string  `json:"priority"`
	Due         string  `json:"due"`       // YYYY-MM-DD
	CreatedAt   string  `json:"createdAt"` // RFC3339
	UpdatedAt   string  `json:"updatedAt"` // RFC3339
}

type NewTaskInTeam struct {
	Title       string  `json:"title"`
	Description *string `json:"description"`
	Priority    string  `json:"priority"`
	Due         string  `json:"due"` // YYYY-MM-DD
	AssigneeID  *int    `json:"assigneeId"`
}

type UpdateTask struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Completed   *bool   `json:"completed"`
	Priority    *string `json:"priority"`
	Due         *string `json:"due"`
	AssigneeID  *int    `json:"assigneeId"`
}

type SetAssignee struct {
	AssigneeID *int `json:"assigneeId"`
}

type TaskFilters struct {
	TeamID     *int    `form:"teamId"`
	Completed  *bool   `form:"completed"`
	Priority   *string `form:"priority"`
	AssigneeID *int    `form:"assigneeId"`
	Query      *string `form:"q"`
	Limit      *int    `form:"limit"`
	Offset     *int    `form:"offset"`
}

// --- helpers ---

func MapTask(t Task) TaskResponse {
	return TaskResponse{
		ID:          t.ID,
		TeamID:      t.TeamID,
		CreatorID:   t.CreatorID,
		AssigneeID:  t.AssigneeID,
		Title:       t.Title,
		Description: t.Description,
		Completed:   t.Completed,
		Priority:    string(t.Priority),
		Due:         t.Due.Format("2006-01-02"),
		CreatedAt:   t.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:   t.UpdatedAt.UTC().Format(time.RFC3339),
	}
}

func MapTasks(ts []Task) []TaskResponse {
	out := make([]TaskResponse, 0, len(ts))
	for _, t := range ts {
		out = append(out, MapTask(t))
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

func ParseDateYYYYMMDD(s string) (time.Time, error) {
	return time.Parse("2006-01-02", s)
}

func ValidatePriority(priority string) bool {
	return priority == "low" || priority == "medium" || priority == "high"
}
