package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/VerSysLabTin23/TodolistProject/task/internal/clients"
	"github.com/VerSysLabTin23/TodolistProject/task/internal/middleware"
	"github.com/VerSysLabTin23/TodolistProject/task/internal/models"
	"github.com/VerSysLabTin23/TodolistProject/task/internal/repository"
)

type TaskHandlers struct {
	repo       repository.TaskRepository
	teamClient *clients.TeamClient
}

func NewTaskHandlers(r repository.TaskRepository, tc *clients.TeamClient) *TaskHandlers {
	return &TaskHandlers{repo: r, teamClient: tc}
}

// Health check endpoint
func (h *TaskHandlers) HealthCheck(c *gin.Context) {
	c.String(http.StatusOK, "OK")
}

// ListTasksByTeam returns tasks in a specific team
func (h *TaskHandlers) ListTasksByTeam(c *gin.Context) {
	teamID, err := models.ParseID(c.Param("teamId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid team id"))
		return
	}

	// Bearer token from middleware
	bt, _ := c.Get("authToken")
	token, _ := bt.(string)

	// Verify team exists by calling Team Service
	team, err := h.teamClient.GetTeam(teamID, token)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "failed to verify team"))
		return
	}
	if team == nil {
		c.JSON(http.StatusNotFound, errResp("TEAM_NOT_FOUND", "Team not found"))
		return
	}

	var filters models.TaskFilters
	if err := c.ShouldBindQuery(&filters); err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid query parameters"))
		return
	}

	// Get user ID from JWT context
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "user ID not found in context"))
		return
	}

	// Verify user is member of the team
	isMember, err := h.teamClient.IsUserInTeam(userID, teamID, token)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "failed to verify team membership"))
		return
	}
	if !isMember {
		c.JSON(http.StatusForbidden, errResp("FORBIDDEN", "user is not a member of this team"))
		return
	}

	ts, err := h.repo.ListTasksByTeam(teamID, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}

	c.JSON(http.StatusOK, models.MapTasks(ts))
}

// CreateTaskInTeam creates a new task in a specific team
func (h *TaskHandlers) CreateTaskInTeam(c *gin.Context) {
	teamID, err := models.ParseID(c.Param("teamId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid team id"))
		return
	}

	// Bearer token from middleware
	bt, _ := c.Get("authToken")
	token, _ := bt.(string)

	// Verify team exists by calling Team Service
	team, err := h.teamClient.GetTeam(teamID, token)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "failed to verify team"))
		return
	}
	if team == nil {
		c.JSON(http.StatusNotFound, errResp("TEAM_NOT_FOUND", "Team not found"))
		return
	}

	var req models.NewTaskInTeam
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid request body"))
		return
	}

	// Validate required fields
	if req.Title == "" || req.Priority == "" || req.Due == "" {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "title, priority, and due are required"))
		return
	}

	// Validate priority
	if !models.ValidatePriority(req.Priority) {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "priority must be one of: low, medium, high"))
		return
	}

	// Parse due date
	due, err := models.ParseDateYYYYMMDD(req.Due)
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "due must be a valid date (YYYY-MM-DD)"))
		return
	}

	// Get creator ID from JWT context
	creatorID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "user ID not found in context"))
		return
	}

	// Verify user is member of the team
	isMember, err := h.teamClient.IsUserInTeam(creatorID, teamID, token)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "failed to verify team membership"))
		return
	}
	if !isMember {
		c.JSON(http.StatusForbidden, errResp("FORBIDDEN", "user is not a member of this team"))
		return
	}

	t := &models.Task{
		TeamID:      teamID,
		CreatorID:   creatorID,
		AssigneeID:  req.AssigneeID,
		Title:       req.Title,
		Description: req.Description,
		Completed:   false,
		Priority:    models.Priority(req.Priority),
		Due:         due,
	}

	if err := h.repo.Create(t); err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}

	c.JSON(http.StatusCreated, models.MapTask(*t))
}

// ListTasksAcrossTeams returns tasks restricted to teams of the current user
func (h *TaskHandlers) ListTasksAcrossTeams(c *gin.Context) {
	var filters models.TaskFilters
	if err := c.ShouldBindQuery(&filters); err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid query parameters"))
		return
	}

	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "user ID not found in context"))
		return
	}

	// Bearer token from middleware
	bt, _ := c.Get("authToken")
	token, _ := bt.(string)

	teams, err := h.teamClient.GetUserTeams(userID, token)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "failed to fetch user teams"))
		return
	}
	if len(teams) == 0 {
		c.JSON(http.StatusOK, []models.TaskResponse{})
		return
	}

	teamIDs := make([]int, 0, len(teams))
	for _, t := range teams {
		teamIDs = append(teamIDs, t.ID)
	}

	ts, err := h.repo.ListTasksByTeams(teamIDs, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}

	c.JSON(http.StatusOK, models.MapTasks(ts))
}

// GetTask retrieves a single task
func (h *TaskHandlers) GetTask(c *gin.Context) {
	id, err := models.ParseID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid task id"))
		return
	}

	t, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}
	if t == nil {
		c.JSON(http.StatusNotFound, errResp("NOT_FOUND", "Task not found"))
		return
	}

	// Get user ID from JWT context
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "user ID not found in context"))
		return
	}

	// Bearer token from middleware
	bt, _ := c.Get("authToken")
	token, _ := bt.(string)

	// Verify user is member of the team
	isMember, err := h.teamClient.IsUserInTeam(userID, t.TeamID, token)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "failed to verify team membership"))
		return
	}
	if !isMember {
		c.JSON(http.StatusForbidden, errResp("FORBIDDEN", "user is not a member of this team"))
		return
	}

	c.JSON(http.StatusOK, models.MapTask(*t))
}

// UpdateTask updates a task (full or partial)
func (h *TaskHandlers) UpdateTask(c *gin.Context) {
	id, err := models.ParseID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid task id"))
		return
	}

	var req models.UpdateTask
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid request body"))
		return
	}

	t, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}
	if t == nil {
		c.JSON(http.StatusNotFound, errResp("NOT_FOUND", "Task not found"))
		return
	}

	// Get user ID from JWT context
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "user ID not found in context"))
		return
	}

	// Bearer token from middleware
	bt, _ := c.Get("authToken")
	token, _ := bt.(string)

	// Verify user is member of the team
	isMember, err := h.teamClient.IsUserInTeam(userID, t.TeamID, token)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "failed to verify team membership"))
		return
	}
	if !isMember {
		c.JSON(http.StatusForbidden, errResp("FORBIDDEN", "user is not a member of this team"))
		return
	}

	// Update fields if provided
	if req.Title != nil {
		t.Title = *req.Title
	}
	if req.Description != nil {
		t.Description = req.Description
	}
	if req.Completed != nil {
		t.Completed = *req.Completed
	}
	if req.Priority != nil {
		if !models.ValidatePriority(*req.Priority) {
			c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "priority must be one of: low, medium, high"))
			return
		}
		t.Priority = models.Priority(*req.Priority)
	}
	if req.Due != nil {
		d, err := models.ParseDateYYYYMMDD(*req.Due)
		if err != nil {
			c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "due must be a valid date (YYYY-MM-DD)"))
			return
		}
		t.Due = d
	}
	if req.AssigneeID != nil {
		// Verify assignee is member of the team
		if *req.AssigneeID != 0 {
			if ok, err := h.teamClient.IsUserInTeam(*req.AssigneeID, t.TeamID, token); err != nil {
				c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "failed to verify assignee team membership"))
				return
			} else if !ok {
				c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "assignee must be a member of the team"))
				return
			}
		}
		t.AssigneeID = req.AssigneeID
	}

	if err := h.repo.Update(t); err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}

	c.JSON(http.StatusOK, models.MapTask(*t))
}

// DeleteTask deletes a task
func (h *TaskHandlers) DeleteTask(c *gin.Context) {
	id, err := models.ParseID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid task id"))
		return
	}

	t, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}
	if t == nil {
		c.JSON(http.StatusNotFound, errResp("NOT_FOUND", "Task not found"))
		return
	}

	// Get user ID from JWT context
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "user ID not found in context"))
		return
	}

	// Bearer token from middleware
	bt, _ := c.Get("authToken")
	token, _ := bt.(string)

	// Verify user is member of the team
	isMember, err := h.teamClient.IsUserInTeam(userID, t.TeamID, token)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "failed to verify team membership"))
		return
	}
	if !isMember {
		c.JSON(http.StatusForbidden, errResp("FORBIDDEN", "user is not a member of this team"))
		return
	}

	// TODO: Add additional permission check - only team owner and admin can delete tasks
	// For now, all team members can delete tasks

	if err := h.repo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}

	c.Status(http.StatusNoContent)
}

// SetAssignee sets or clears assignee
func (h *TaskHandlers) SetAssignee(c *gin.Context) {
	id, err := models.ParseID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid task id"))
		return
	}

	var req models.SetAssignee
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid request body"))
		return
	}

	// Get user ID from JWT context
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "user ID not found in context"))
		return
	}

	// Get task to verify team membership
	task, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}
	if task == nil {
		c.JSON(http.StatusNotFound, errResp("NOT_FOUND", "Task not found"))
		return
	}

	// Bearer token from middleware
	bt, _ := c.Get("authToken")
	token, _ := bt.(string)

	// Verify user is member of the team
	isMember, err := h.teamClient.IsUserInTeam(userID, task.TeamID, token)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "failed to verify team membership"))
		return
	}
	if !isMember {
		c.JSON(http.StatusForbidden, errResp("FORBIDDEN", "user is not a member of this team"))
		return
	}

	if err := h.repo.UpdateAssignee(id, req.AssigneeID); err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}

	// Get updated task to return
	t, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}
	if t == nil {
		c.JSON(http.StatusNotFound, errResp("NOT_FOUND", "Task not found"))
		return
	}

	c.JSON(http.StatusOK, models.MapTask(*t))
}

// UpdateCompletion marks task completed or not
func (h *TaskHandlers) UpdateCompletion(c *gin.Context) {
	id, err := models.ParseID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid task id"))
		return
	}

	var req struct {
		Completed bool `json:"completed"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid request body"))
		return
	}

	// Get user ID from JWT context
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "user ID not found in context"))
		return
	}

	// Get task to verify team membership
	task, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}
	if task == nil {
		c.JSON(http.StatusNotFound, errResp("NOT_FOUND", "Task not found"))
		return
	}

	// Bearer token from middleware
	bt, _ := c.Get("authToken")
	token, _ := bt.(string)

	// Verify user is member of the team
	isMember, err := h.teamClient.IsUserInTeam(userID, task.TeamID, token)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "failed to verify team membership"))
		return
	}
	if !isMember {
		c.JSON(http.StatusForbidden, errResp("FORBIDDEN", "user is not a member of this team"))
		return
	}

	if err := h.repo.UpdateCompletion(id, req.Completed); err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}

	// Get updated task to return
	t, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}
	if t == nil {
		c.JSON(http.StatusNotFound, errResp("NOT_FOUND", "Task not found"))
		return
	}

	c.JSON(http.StatusOK, models.MapTask(*t))
}

// --- error helper ---

type errorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func errResp(code, msg string) errorResponse { return errorResponse{Code: code, Message: msg} }
