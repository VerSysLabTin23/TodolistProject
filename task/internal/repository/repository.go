// Data Access Layer for task
package repository

import (
	"errors"

	"gorm.io/gorm"

	"github.com/VerSysLabTin23/TodolistProject/task/internal/models"
)

type TaskRepository interface {
	ListTasksByTeam(teamID int, filters models.TaskFilters) ([]models.Task, error)
	ListTasksAcrossTeams(filters models.TaskFilters) ([]models.Task, error)
	ListTasksByTeams(teamIDs []int, filters models.TaskFilters) ([]models.Task, error)
	GetByID(id int) (*models.Task, error)
	Create(t *models.Task) error
	Update(t *models.Task) error
	Delete(id int) error
	UpdateAssignee(id int, assigneeID *int) error
	UpdateCompletion(id int, completed bool) error
}

type taskRepo struct{ db *gorm.DB }

func NewTaskRepository(db *gorm.DB) TaskRepository { return &taskRepo{db: db} }

// ListTasksByTeam returns tasks in a specific team, sorted by priority then due date
func (r *taskRepo) ListTasksByTeam(teamID int, filters models.TaskFilters) ([]models.Task, error) {
	var ts []models.Task
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
			"%"+*filters.Query+"%", "%"+*filters.Query+"%") // WHERE title LIKE '%keyword%' OR description LIKE '%keyword%'
	}

	// Apply pagination
	limit := 20 // default
	if filters.Limit != nil {
		if *filters.Limit > 0 && *filters.Limit <= 50 {
			limit = *filters.Limit
		}
	}
	query = query.Limit(limit)

	if filters.Offset != nil && *filters.Offset > 0 {
		query = query.Offset(*filters.Offset)
	} // LIMIT 20 OFFSET 10

	// Sort by priority (high→medium→low), then by due date (earliest first)
	err := query.
		Order("FIELD(priority,'high','medium','low')").
		Order("due ASC").
		Find(&ts).Error
	return ts, err
}

// ListTasksAcrossTeams returns tasks accessible to the caller across teams
func (r *taskRepo) ListTasksAcrossTeams(filters models.TaskFilters) ([]models.Task, error) {
	var ts []models.Task
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
	limit := 20 // default
	if filters.Limit != nil {
		if *filters.Limit > 0 && *filters.Limit <= 50 {
			limit = *filters.Limit
		}
	}
	query = query.Limit(limit)

	if filters.Offset != nil && *filters.Offset > 0 {
		query = query.Offset(*filters.Offset)
	} // eg: LIMIT 20 OFFSET 10 => 11-30

	// Same as ListTasksByTeam
	err := query.
		Order("FIELD(priority,'high','medium','low')").
		Order("due ASC").
		Find(&ts).Error
	return ts, err
}

// ListTasksByTeams returns tasks limited to provided team IDs
func (r *taskRepo) ListTasksByTeams(teamIDs []int, filters models.TaskFilters) ([]models.Task, error) {
	var ts []models.Task
	if len(teamIDs) == 0 {
		return ts, nil
	}

	query := r.db.Where("team_id IN ?", teamIDs)

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
		query = query.Where("(title LIKE ? OR description LIKE ?)", "%"+*filters.Query+"%", "%"+*filters.Query+"%")
	}

	limit := 20
	if filters.Limit != nil {
		if *filters.Limit > 0 && *filters.Limit <= 50 {
			limit = *filters.Limit
		}
	}
	query = query.Limit(limit)
	if filters.Offset != nil && *filters.Offset > 0 {
		query = query.Offset(*filters.Offset)
	}

	err := query.Order("FIELD(priority,'high','medium','low')").Order("due ASC").Find(&ts).Error
	return ts, err
}

func (r *taskRepo) GetByID(id int) (*models.Task, error) {
	var t models.Task
	if err := r.db.First(&t, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // task not found
		}
		return nil, err // error occurred
	}
	return &t, nil
}

func (r *taskRepo) Create(t *models.Task) error { return r.db.Create(t).Error }
func (r *taskRepo) Update(t *models.Task) error { return r.db.Save(t).Error }
func (r *taskRepo) Delete(id int) error         { return r.db.Delete(&models.Task{}, id).Error }

func (r *taskRepo) UpdateAssignee(id int, assigneeID *int) error {
	return r.db.Model(&models.Task{}).Where("id = ?", id).Update("assignee_id", assigneeID).Error
}

func (r *taskRepo) UpdateCompletion(id int, completed bool) error {
	return r.db.Model(&models.Task{}).Where("id = ?", id).Update("completed", completed).Error
}
