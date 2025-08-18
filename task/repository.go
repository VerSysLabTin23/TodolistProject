package main

import (
	"errors"

	"gorm.io/gorm"
)

type TaskRepository interface {
	ListTasksByTeam(teamID int, filters TaskFilters) ([]Task, error)
	ListTasksAcrossTeams(filters TaskFilters) ([]Task, error)
	GetByID(id int) (*Task, error)
	Create(t *Task) error
	Update(t *Task) error
	Delete(id int) error
	UpdateAssignee(id int, assigneeID *int) error
	UpdateCompletion(id int, completed bool) error
}

type taskRepo struct{ db *gorm.DB }

func NewTaskRepository(db *gorm.DB) TaskRepository { return &taskRepo{db: db} }

// ListTasksByTeam returns tasks in a specific team, sorted by priority then due date
func (r *taskRepo) ListTasksByTeam(teamID int, filters TaskFilters) ([]Task, error) {
	var ts []Task
	query := r.db.Where("team_id = ?", teamID)

	// Apply filters
	if filters.Completed != nil {
		query = query.Where("completed = ?", *filters.Completed)
	}
	if filters.Priority != nil {
		query = query.Where("priority = ?", *filters.Priority)
	}
	if filters.AssigneeID != nil {
		query = query.Where("assignee_id = ?", *filters.AssigneeID)
	}
	if filters.Query != nil && *filters.Query != "" {
		query = query.Where("(title LIKE ? OR description LIKE ?)",
			"%"+*filters.Query+"%", "%"+*filters.Query+"%")
	}

	// Apply pagination
	limit := 50 // default
	if filters.Limit != nil {
		if *filters.Limit > 0 && *filters.Limit <= 200 {
			limit = *filters.Limit
		}
	}
	query = query.Limit(limit)

	if filters.Offset != nil && *filters.Offset > 0 {
		query = query.Offset(*filters.Offset)
	}

	// Sort by priority (high→medium→low), then by due date (earliest first)
	err := query.
		Order("FIELD(priority,'high','medium','low')").
		Order("due ASC").
		Find(&ts).Error
	return ts, err
}

// ListTasksAcrossTeams returns tasks accessible to the caller across teams
func (r *taskRepo) ListTasksAcrossTeams(filters TaskFilters) ([]Task, error) {
	var ts []Task
	query := r.db

	// Apply filters
	if filters.TeamID != nil {
		query = query.Where("team_id = ?", *filters.TeamID)
	}
	if filters.Completed != nil {
		query = query.Where("completed = ?", *filters.Completed)
	}
	if filters.Priority != nil {
		query = query.Where("priority = ?", *filters.Priority)
	}
	if filters.AssigneeID != nil {
		query = query.Where("assignee_id = ?", *filters.AssigneeID)
	}
	if filters.Query != nil && *filters.Query != "" {
		query = query.Where("(title LIKE ? OR description LIKE ?)",
			"%"+*filters.Query+"%", "%"+*filters.Query+"%")
	}

	// Apply pagination
	limit := 50 // default
	if filters.Limit != nil {
		if *filters.Limit > 0 && *filters.Limit <= 200 {
			limit = *filters.Limit
		}
	}
	query = query.Limit(limit)

	if filters.Offset != nil && *filters.Offset > 0 {
		query = query.Offset(*filters.Offset)
	}

	// Sort by priority (high→medium→low), then by due date (earliest first)
	err := query.
		Order("FIELD(priority,'high','medium','low')").
		Order("due ASC").
		Find(&ts).Error
	return ts, err
}

func (r *taskRepo) GetByID(id int) (*Task, error) {
	var t Task
	if err := r.db.First(&t, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &t, nil
}

func (r *taskRepo) Create(t *Task) error { return r.db.Create(t).Error }
func (r *taskRepo) Update(t *Task) error { return r.db.Save(t).Error }
func (r *taskRepo) Delete(id int) error  { return r.db.Delete(&Task{}, id).Error }

func (r *taskRepo) UpdateAssignee(id int, assigneeID *int) error {
	return r.db.Model(&Task{}).Where("id = ?", id).Update("assignee_id", assigneeID).Error
}

func (r *taskRepo) UpdateCompletion(id int, completed bool) error {
	return r.db.Model(&Task{}).Where("id = ?", id).Update("completed", completed).Error
}
