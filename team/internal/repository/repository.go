package repository

import (
	"errors"

	"gorm.io/gorm"

	"github.com/VerSysLabTin23/TodolistProject/team/internal/models"
)

type TeamRepository interface {
	ListTeams(filters models.TeamFilters) ([]models.Team, error)
	GetByID(id int) (*models.Team, error)
	Create(t *models.Team) error
	Update(t *models.Team) error
	Delete(id int) error
	GetTeamMembers(teamID int) ([]models.TeamMember, error)
	AddMember(teamID int, userID int, role models.Role) error
	RemoveMember(teamID int, userID int) error
	GetUserTeams(userID int) ([]models.Team, error)
	IsUserInTeam(userID int, teamID int) (bool, error)
	GetUserRoleInTeam(userID int, teamID int) (*models.Role, error)
}

type teamRepo struct{ db *gorm.DB }

func NewTeamRepository(db *gorm.DB) TeamRepository { return &teamRepo{db: db} }

func (r *teamRepo) ListTeams(filters models.TeamFilters) ([]models.Team, error) {
	var ts []models.Team
	query := r.db

	// Apply search filter
	if filters.Query != nil && *filters.Query != "" {
		query = query.Where("name LIKE ? OR description LIKE ?",
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

	// Sort by creation date (newest first)
	err := query.Order("created_at DESC").Find(&ts).Error
	return ts, err
}

func (r *teamRepo) GetByID(id int) (*models.Team, error) {
	var t models.Team
	if err := r.db.First(&t, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &t, nil
}

func (r *teamRepo) Create(t *models.Team) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Create the team
		if err := tx.Create(t).Error; err != nil {
			return err
		}

		// Add the owner as a member with owner role
		member := &models.TeamMember{
			UserID: t.OwnerID,
			TeamID: t.ID,
			Role:   models.RoleOwner,
		}

		return tx.Create(member).Error
	})
}

func (r *teamRepo) Update(t *models.Team) error { return r.db.Save(t).Error }
func (r *teamRepo) Delete(id int) error         { return r.db.Delete(&models.Team{}, id).Error }

func (r *teamRepo) GetTeamMembers(teamID int) ([]models.TeamMember, error) {
	var members []models.TeamMember
	err := r.db.Where("team_id = ?", teamID).Find(&members).Error
	return members, err
}

func (r *teamRepo) AddMember(teamID int, userID int, role models.Role) error {
	member := &models.TeamMember{
		UserID: userID,
		TeamID: teamID,
		Role:   role,
	}
	return r.db.Create(member).Error
}

func (r *teamRepo) RemoveMember(teamID int, userID int) error {
	return r.db.Where("team_id = ? AND user_id = ?", teamID, userID).Delete(&models.TeamMember{}).Error
}

func (r *teamRepo) GetUserTeams(userID int) ([]models.Team, error) {
	var teams []models.Team
	err := r.db.Joins("JOIN team_members ON teams.id = team_members.team_id").
		Where("team_members.user_id = ?", userID).
		Find(&teams).Error
	return teams, err
}

func (r *teamRepo) IsUserInTeam(userID int, teamID int) (bool, error) {
	var count int64
	err := r.db.Model(&models.TeamMember{}).
		Where("user_id = ? AND team_id = ?", userID, teamID).
		Count(&count).Error
	return count > 0, err
}

func (r *teamRepo) GetUserRoleInTeam(userID int, teamID int) (*models.Role, error) {
	var member models.TeamMember
	err := r.db.Where("user_id = ? AND team_id = ?", userID, teamID).First(&member).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &member.Role, nil
}
