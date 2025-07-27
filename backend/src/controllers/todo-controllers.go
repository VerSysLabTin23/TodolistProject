package controllers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/VerSysLabTin23/TodolistProject/src/config"
	"github.com/VerSysLabTin23/TodolistProject/src/models"
)

// 全局数据库实例
var db *gorm.DB = config.ConnectDB()

// 创建任务请求体结构
type createTaskRequest struct {
	Title       string     `json:"title" binding:"required"`
	Description string     `json:"description"`
	AuthorID    uint       `json:"author_id" binding:"required"`
	AssigneeID  *uint      `json:"assignee_id"`
	DueDate     *time.Time `json:"due_date"`
}

// 任务响应体结构（可选）
type taskResponse struct {
	ID          uint       `json:"id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Completed   bool       `json:"completed"`
	AuthorID    uint       `json:"author_id"`
	AssigneeID  *uint      `json:"assignee_id"`
	DueDate     *time.Time `json:"due_date"`
	CreatedAt   time.Time  `json:"created_at"`
}

// 创建任务
func CreateTask(ctx *gin.Context) {
	var req createTaskRequest

	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	task := models.Task{
		Title:       req.Title,
		Description: req.Description,
		AuthorID:    req.AuthorID,
		AssigneeID:  req.AssigneeID,
		DueDate:     req.DueDate,
		Completed:   false,
	}

	if err := db.Create(&task).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "创建任务失败"})
		return
	}

	ctx.JSON(http.StatusCreated, task)
}

// 获取所有任务
func GetAllTasks(ctx *gin.Context) {
	var tasks []models.Task

	if err := db.Find(&tasks).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "获取任务失败"})
		return
	}

	ctx.JSON(http.StatusOK, tasks)
}

// 更新任务
func UpdateTask(ctx *gin.Context) {
	idStr := ctx.Param("id")
	idUint64, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "无效的任务 ID"})
		return
	}
	id := uint(idUint64)

	var task models.Task
	if err := db.First(&task, id).Error; err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "任务未找到"})
		return
	}

	var req createTaskRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	task.Title = req.Title
	task.Description = req.Description
	task.AssigneeID = req.AssigneeID
	task.DueDate = req.DueDate

	if err := db.Save(&task).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "更新失败"})
		return
	}

	ctx.JSON(http.StatusOK, task)
}

// 删除任务
func DeleteTask(ctx *gin.Context) {
	idStr := ctx.Param("id")
	idUint64, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "无效的任务 ID"})
		return
	}
	id := uint(idUint64)

	if err := db.Unscoped().Delete(&models.Task{}, id).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"status":  "200",
		"message": "删除成功",
		"data":    id,
	})
}
