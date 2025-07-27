package routes

import (
	"github.com/VerSysLabTin23/TodolistProject/src/controllers"
	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	r := gin.Default()

	r.POST("/tasks", controllers.CreateTask)
	r.GET("/tasks", controllers.GetAllTasks)
	r.PUT("/tasks/:id", controllers.UpdateTask)
	r.DELETE("/tasks/:id", controllers.DeleteTask)

	return r
}
