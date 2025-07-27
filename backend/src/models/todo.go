package models

import (
	"time"
)

type Task struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Completed   bool       `json:"completed"`
	AuthorID    uint       `json:"author_id"`
	AssigneeID  *uint      `json:"assignee_id"` // 可为空
	DueDate     *time.Time `json:"due_date"`    // 可为空
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	DeletedAt   *time.Time `gorm:"index" json:"-"`
}
