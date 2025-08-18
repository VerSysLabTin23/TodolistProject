package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type TaskHandlers struct {
	repo       TaskRepository
	teamClient *TeamClient
}

func NewTaskHandlers(r TaskRepository, tc *TeamClient) *TaskHandlers {
	return &TaskHandlers{repo: r, teamClient: tc}
}

// Health check endpoint
func (h *TaskHandlers) HealthCheck(c *gin.Context) {
	c.String(http.StatusOK, "OK")
}

// ListTasksByTeam returns tasks in a specific team
func (h *TaskHandlers) ListTasksByTeam(c *gin.Context) {
	teamID, err := parseID(c.Param("teamId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid team id"))
		return
	}

	// Verify team exists by calling Team Service
	team, err := h.teamClient.GetTeam(teamID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "failed to verify team"))
		return
	}
	if team == nil {
		c.JSON(http.StatusNotFound, errResp("TEAM_NOT_FOUND", "Team not found"))
		return
	}

	var filters TaskFilters
	if err := c.ShouldBindQuery(&filters); err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid query parameters"))
		return
	}

	// TODO: Add team membership check here using teamClient.IsUserInTeam()
	// For now, we'll assume the user has access to the team

	ts, err := h.repo.ListTasksByTeam(teamID, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}

	c.JSON(http.StatusOK, mapTasks(ts))
}

// CreateTaskInTeam creates a new task in a specific team
func (h *TaskHandlers) CreateTaskInTeam(c *gin.Context) {
	teamID, err := parseID(c.Param("teamId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid team id"))
		return
	}

	// Verify team exists by calling Team Service
	team, err := h.teamClient.GetTeam(teamID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", "failed to verify team"))
		return
	}
	if team == nil {
		c.JSON(http.StatusNotFound, errResp("TEAM_NOT_FOUND", "Team not found"))
		return
	}

	var req NewTaskInTeam
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
	if !validatePriority(req.Priority) {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "priority must be one of: low, medium, high"))
		return
	}

	// Parse due date
	due, err := parseDateYYYYMMDD(req.Due)
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "due must be a valid date (YYYY-MM-DD)"))
		return
	}

	// TODO: Get creator ID from authenticated user context
	creatorID := 1 // Placeholder - should come from JWT token

	// TODO: Verify user is member of the team using teamClient.IsUserInTeam()
	// For now, we'll assume the user has access to the team

	t := &Task{
		TeamID:      teamID,
		CreatorID:   creatorID,
		AssigneeID:  req.AssigneeID,
		Title:       req.Title,
		Description: req.Description,
		Completed:   false,
		Priority:    Priority(req.Priority),
		Due:         due,
	}

	if err := h.repo.Create(t); err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}

	c.JSON(http.StatusCreated, mapTask(*t))
}

// ListTasksAcrossTeams returns tasks accessible to the caller across teams
func (h *TaskHandlers) ListTasksAcrossTeams(c *gin.Context) {
	var filters TaskFilters
	if err := c.ShouldBindQuery(&filters); err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid query parameters"))
		return
	}

	// TODO: Add user authentication check here
	// For now, we'll assume the user is authenticated

	ts, err := h.repo.ListTasksAcrossTeams(filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}

	c.JSON(http.StatusOK, mapTasks(ts))
}

// GetTask retrieves a single task
func (h *TaskHandlers) GetTask(c *gin.Context) {
	id, err := parseID(c.Param("id"))
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

	// TODO: Add team membership check here using teamClient.IsUserInTeam()
	// For now, we'll assume the user has access to the task

	c.JSON(http.StatusOK, mapTask(*t))
}

// UpdateTask updates a task (full or partial)
func (h *TaskHandlers) UpdateTask(c *gin.Context) {
	id, err := parseID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid task id"))
		return
	}

	var req UpdateTask
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

	// TODO: Add team membership check here using teamClient.IsUserInTeam()
	// All team members can edit tasks
	// For now, we'll assume the user has access to the task

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
		if !validatePriority(*req.Priority) {
			c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "priority must be one of: low, medium, high"))
			return
		}
		t.Priority = Priority(*req.Priority)
	}
	if req.Due != nil {
		d, err := parseDateYYYYMMDD(*req.Due)
		if err != nil {
			c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "due must be a valid date (YYYY-MM-DD)"))
			return
		}
		t.Due = d
	}
	if req.AssigneeID != nil {
		// TODO: Verify assignee is member of the team
		t.AssigneeID = req.AssigneeID
	}

	if err := h.repo.Update(t); err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}

	c.JSON(http.StatusOK, mapTask(*t))
}

// DeleteTask deletes a task
func (h *TaskHandlers) DeleteTask(c *gin.Context) {
	id, err := parseID(c.Param("id"))
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

	// TODO: Add permission check here - only team owner and admin can delete tasks
	// For now, we'll assume the user has permission to delete

	if err := h.repo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}

	c.Status(http.StatusNoContent)
}

// SetAssignee sets or clears assignee
func (h *TaskHandlers) SetAssignee(c *gin.Context) {
	id, err := parseID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid task id"))
		return
	}

	var req SetAssignee
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("BAD_REQUEST", "invalid request body"))
		return
	}

	// TODO: Add team membership check here using teamClient.IsUserInTeam()
	// All team members can assign tasks
	// For now, we'll assume the user has access to the task

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

	c.JSON(http.StatusOK, mapTask(*t))
}

// UpdateCompletion marks task completed or not
func (h *TaskHandlers) UpdateCompletion(c *gin.Context) {
	id, err := parseID(c.Param("id"))
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

	// TODO: Add team membership check here using teamClient.IsUserInTeam()
	// All team members can update task completion
	// For now, we'll assume the user has access to the task

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

	c.JSON(http.StatusOK, mapTask(*t))
}

// --- error helper ---

type errorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func errResp(code, msg string) errorResponse { return errorResponse{Code: code, Message: msg} }
