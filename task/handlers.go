package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type TaskHandlers struct {
	repo TaskRepository
}

func NewTaskHandlers(r TaskRepository) *TaskHandlers { return &TaskHandlers{repo: r} }

func (h *TaskHandlers) ListTasks(c *gin.Context) {
	ts, err := h.repo.ListSorted()
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}
	c.JSON(http.StatusOK, mapTasks(ts))
}

func (h *TaskHandlers) GetTask(c *gin.Context) {
	id, err := parseID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("VALIDATION_ERROR", "invalid id"))
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
	c.JSON(http.StatusOK, mapTask(*t))
}

func (h *TaskHandlers) CreateTask(c *gin.Context) {
	var req NewTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("VALIDATION_ERROR", "invalid request body"))
		return
	}
	// 基础校验（MVP）
	if req.Title == "" || req.Priority == "" || req.Due == "" {
		c.JSON(http.StatusBadRequest, errResp("VALIDATION_ERROR", "title, priority, due are required"))
		return
	}
	if req.Priority != "low" && req.Priority != "medium" && req.Priority != "high" {
		c.JSON(http.StatusBadRequest, errResp("VALIDATION_ERROR", "priority must be one of: low, medium, high"))
		return
	}
	due, err := parseDateYYYYMMDD(req.Due)
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("VALIDATION_ERROR", "due must be YYYY-MM-DD"))
		return
	}
	t := &Task{
		Title:       req.Title,
		Description: req.Description,
		Completed:   false,
		Priority:    Priority(req.Priority),
		Due:         due,
	}
	if req.Completed != nil {
		t.Completed = *req.Completed
	}
	if err := h.repo.Create(t); err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}
	c.JSON(http.StatusCreated, mapTask(*t))
}

func (h *TaskHandlers) UpdateTask(c *gin.Context) {
	id, err := parseID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("VALIDATION_ERROR", "invalid id"))
		return
	}
	var req UpdateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("VALIDATION_ERROR", "invalid request body"))
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
		if *req.Priority != "low" && *req.Priority != "medium" && *req.Priority != "high" {
			c.JSON(http.StatusBadRequest, errResp("VALIDATION_ERROR", "priority must be one of: low, medium, high"))
			return
		}
		t.Priority = Priority(*req.Priority)
	}
	if req.Due != nil {
		d, err := parseDateYYYYMMDD(*req.Due)
		if err != nil {
			c.JSON(http.StatusBadRequest, errResp("VALIDATION_ERROR", "due must be YYYY-MM-DD"))
			return
		}
		t.Due = d
	}
	if err := h.repo.Update(t); err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}
	c.JSON(http.StatusOK, mapTask(*t))
}

func (h *TaskHandlers) DeleteTask(c *gin.Context) {
	id, err := parseID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errResp("VALIDATION_ERROR", "invalid id"))
		return
	}
	if err := h.repo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, errResp("INTERNAL_ERROR", err.Error()))
		return
	}
	c.Status(http.StatusNoContent)
}

// --- error helper ---

type errorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func errResp(code, msg string) errorResponse { return errorResponse{Code: code, Message: msg} }
