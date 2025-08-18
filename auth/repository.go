package main

import (
	"gorm.io/gorm"
)

// UserRepository defines the interface for user data operations
type UserRepository interface {
	Create(user *User) error
	GetByID(id int) (*User, error)
	GetByUsername(username string) (*User, error)
	GetByEmail(email string) (*User, error)
	Update(user *User) error
	Delete(id int) error
	List(filters UserFilters) ([]User, int64, error)
	ExistsByUsername(username string) (bool, error)
	ExistsByEmail(email string) (bool, error)
}

// GormUserRepository implements UserRepository using GORM
type GormUserRepository struct {
	db *gorm.DB
}

// NewUserRepository creates a new GORM-based user repository
func NewUserRepository(db *gorm.DB) UserRepository {
	return &GormUserRepository{db: db}
}

// Create creates a new user
func (r *GormUserRepository) Create(user *User) error {
	return r.db.Create(user).Error
}

// GetByID retrieves a user by ID
func (r *GormUserRepository) GetByID(id int) (*User, error) {
	var user User
	err := r.db.Where("id = ?", id).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetByUsername retrieves a user by username
func (r *GormUserRepository) GetByUsername(username string) (*User, error) {
	var user User
	err := r.db.Where("username = ?", username).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetByEmail retrieves a user by email
func (r *GormUserRepository) GetByEmail(email string) (*User, error) {
	var user User
	err := r.db.Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// Update updates an existing user
func (r *GormUserRepository) Update(user *User) error {
	return r.db.Save(user).Error
}

// Delete deletes a user by ID
func (r *GormUserRepository) Delete(id int) error {
	return r.db.Delete(&User{}, id).Error
}

// List retrieves a list of users with filters and pagination
func (r *GormUserRepository) List(filters UserFilters) ([]User, int64, error) {
	var users []User
	var total int64

	query := r.db.Model(&User{})

	// Apply search filter
	if filters.Query != "" {
		query = query.Where("username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?",
			"%"+filters.Query+"%", "%"+filters.Query+"%", "%"+filters.Query+"%", "%"+filters.Query+"%")
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply pagination
	if filters.Limit > 0 {
		query = query.Limit(filters.Limit)
	}
	if filters.Offset > 0 {
		query = query.Offset(filters.Offset)
	}

	// Execute query
	err := query.Order("created_at DESC").Find(&users).Error
	return users, total, err
}

// ExistsByUsername checks if a user with the given username exists
func (r *GormUserRepository) ExistsByUsername(username string) (bool, error) {
	var count int64
	err := r.db.Model(&User{}).Where("username = ?", username).Count(&count).Error
	return count > 0, err
}

// ExistsByEmail checks if a user with the given email exists
func (r *GormUserRepository) ExistsByEmail(email string) (bool, error) {
	var count int64
	err := r.db.Model(&User{}).Where("email = ?", email).Count(&count).Error
	return count > 0, err
}
