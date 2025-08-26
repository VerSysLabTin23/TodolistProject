package handlers

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/VerSysLabTin23/TodolistProject/team/internal/events"
	"github.com/VerSysLabTin23/TodolistProject/team/internal/models"
	"github.com/VerSysLabTin23/TodolistProject/team/internal/repository"
)

type TeamHandlers struct {
	repo     repository.TeamRepository
	producer *events.KafkaProducer
}

func NewTeamHandlers(r repository.TeamRepository) *TeamHandlers { return &TeamHandlers{repo: r} }

// SetProducer attaches a Kafka producer (optional)
func (h *TeamHandlers) SetProducer(p *events.KafkaProducer) { h.producer = p }

// Health check endpoint
func (h *TeamHandlers) HealthCheck(c *gin.Context) {
	c.String(http.StatusOK, "OK")
}

// ListTeams returns all teams with optional filtering
func (h *TeamHandlers) ListTeams(c *gin.Context) {
	var filters models.TeamFilters
	if err := c.ShouldBindQuery(&filters); err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid query parameters"))
		return
	}

	teams, err := h.repo.ListTeams(filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}

	c.JSON(http.StatusOK, models.MapTeams(teams))
}

// CreateTeam creates a new team
func (h *TeamHandlers) CreateTeam(c *gin.Context) {
	var req models.NewTeam
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid request body"))
		return
	}

	// Validate required fields
	if req.Name == "" {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "team name is required"))
		return
	}

	// TODO: Get owner ID from authenticated user context
	ownerID := 1 // Placeholder - should come from JWT token

	team := &models.Team{
		Name:        req.Name,
		Description: req.Description,
		OwnerID:     ownerID,
	}

	if err := h.repo.Create(team); err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}

	c.JSON(http.StatusCreated, models.MapTeam(*team))

	// Emit team.created event (best-effort)
	if h.producer != nil {
		_ = h.producer.TeamCreated(context.Background(), team.ID, ownerID, team.OwnerID, map[string]any{
			"name":        team.Name,
			"description": team.Description,
		})
	}
}

// GetTeam retrieves a single team
func (h *TeamHandlers) GetTeam(c *gin.Context) {
	id, err := models.ParseID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid team id"))
		return
	}

	team, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}
	if team == nil {
		c.JSON(http.StatusNotFound, errResp("NOT_FOUND", "Team not found"))
		return
	}

	// TODO: Add team membership check here
	// For now, we'll assume the user has access to the team

	c.JSON(http.StatusOK, models.MapTeam(*team))
}

// UpdateTeam updates a team
func (h *TeamHandlers) UpdateTeam(c *gin.Context) {
	id, err := models.ParseID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid team id"))
		return
	}

	var req models.UpdateTeam
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid request body"))
		return
	}

	team, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}
	if team == nil {
		c.JSON(http.StatusNotFound, errResp("NOT_FOUND", "Team not found"))
		return
	}

	// TODO: Add ownership check here - only owner can update team
	// For now, we'll assume the user has permission to update

	// Update fields if provided
	if req.Name != nil {
		team.Name = *req.Name
	}
	if req.Description != nil {
		team.Description = req.Description
	}

	if err := h.repo.Update(team); err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}

	c.JSON(http.StatusOK, models.MapTeam(*team))

	// Emit team.updated event (best-effort)
	if h.producer != nil {
		_ = h.producer.TeamUpdated(context.Background(), team.ID, 1, team.OwnerID, map[string]any{
			"name":        team.Name,
			"description": team.Description,
		})
	}
}

// DeleteTeam deletes a team
func (h *TeamHandlers) DeleteTeam(c *gin.Context) {
	id, err := models.ParseID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid team id"))
		return
	}

	// Get team info before deletion for event
	team, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}
	if team == nil {
		c.JSON(http.StatusNotFound, errResp("NOT_FOUND", "Team not found"))
		return
	}

	// TODO: Add ownership check here - only owner can delete team
	// For now, we'll assume the user has permission to delete

	if err := h.repo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}

	c.Status(http.StatusNoContent)

	// Emit team.deleted event (best-effort)
	if h.producer != nil {
		_ = h.producer.TeamDeleted(context.Background(), team.ID, 1, team.OwnerID, map[string]any{
			"name": team.Name,
		})
	}
}

// GetTeamMembers returns all members of a team
func (h *TeamHandlers) GetTeamMembers(c *gin.Context) {
	teamID, err := models.ParseID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid team id"))
		return
	}

	// TODO: Add team membership check here
	// For now, we'll assume the user has access to the team

	members, err := h.repo.GetTeamMembers(teamID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}

	c.JSON(http.StatusOK, models.MapTeamMembers(members))
}

// AddMember adds a user to a team
func (h *TeamHandlers) AddMember(c *gin.Context) {
	teamID, err := models.ParseID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid team id"))
		return
	}

	var req models.AddMember
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid request body"))
		return
	}

	// Validate role
	if !models.ValidateRole(string(req.Role)) {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid role"))
		return
	}

	// TODO: Add permission check here - only owner and admin can add members
	// For now, we'll assume the user has permission to add members

	if err := h.repo.AddMember(teamID, req.UserID, req.Role); err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}

	// Get the added member to return
	members, err := h.repo.GetTeamMembers(teamID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}

	// Find the newly added member
	for _, member := range members {
		if member.UserID == req.UserID && member.TeamID == teamID {
			c.JSON(http.StatusCreated, models.MapTeamMember(member))

			// Emit team.member_added event (best-effort)
			if h.producer != nil {
				_ = h.producer.MemberAdded(context.Background(), teamID, req.UserID, 1, string(req.Role), map[string]any{
					"role": string(req.Role),
				})
			}
			return
		}
	}

	c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "failed to retrieve added member"))
}

// RemoveMember removes a user from a team
func (h *TeamHandlers) RemoveMember(c *gin.Context) {
	teamID, err := models.ParseID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid team id"))
		return
	}

	userID, err := models.ParseID(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid user id"))
		return
	}

	// TODO: Add permission check here - only owner and admin can remove members
	// For now, we'll assume the user has permission to remove members

	if err := h.repo.RemoveMember(teamID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}

	c.Status(http.StatusNoContent)

	// Emit team.member_removed event (best-effort)
	if h.producer != nil {
		_ = h.producer.MemberRemoved(context.Background(), teamID, userID, 1, map[string]any{
			"userID": userID,
		})
	}
}

// GetUserTeams returns all teams that a user belongs to
func (h *TeamHandlers) GetUserTeams(c *gin.Context) {
	userID, err := models.ParseID(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid user id"))
		return
	}

	// TODO: Add user authentication check here
	// For now, we'll assume the user is authenticated

	teams, err := h.repo.GetUserTeams(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}

	c.JSON(http.StatusOK, models.MapTeams(teams))
}

// Error helper
type errorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func errResp(code, msg string) errorResponse { return errorResponse{Code: code, Message: msg} }
