package main

import (
	"errors"

	"gorm.io/gorm"
)

type TaskRepository interface {
	ListSorted() ([]Task, error)
	GetByID(id int) (*Task, error)
	Create(t *Task) error
	Update(t *Task) error
	Delete(id int) error
}

type taskRepo struct{ db *gorm.DB }

func NewTaskRepository(db *gorm.DB) TaskRepository { return &taskRepo{db: db} }

// priority: high→medium→low，然后 due 升序
func (r *taskRepo) ListSorted() ([]Task, error) {
	var ts []Task
	err := r.db.
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
