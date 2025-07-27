package main

import (
	"github.com/VerSysLabTin23/TodolistProject/src/config"
	"github.com/VerSysLabTin23/TodolistProject/src/models"
	"github.com/VerSysLabTin23/TodolistProject/src/routes"
)

func main() {
	// 初始化数据库
	db := config.ConnectDB()
	defer config.DisconnectDB(db)

	// 自动建表
	db.AutoMigrate(&models.Task{})

	// 设置路由
	r := routes.SetupRouter()

	// 启动服务
	r.Run(":8080")
}
