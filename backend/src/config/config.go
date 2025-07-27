package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// ConnectDB connects go to mysql database
func ConnectDB() *gorm.DB {
	// 加载 .env 文件
	if err := godotenv.Load(); err != nil {
		panic("❌ Failed to load .env file")
	}

	// 获取环境变量
	user := os.Getenv("DB_USER")
	pass := os.Getenv("DB_PASS")
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	name := os.Getenv("DB_NAME")

	// 构造 DSN
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=true&loc=Local",
		user, pass, host, port, name,
	)

	fmt.Println("🔍 Trying to connect with DSN:", dsn)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		panic(fmt.Sprintf("❌ Failed to connect mysql database: %v", err))
	}

	fmt.Println("✅ Successfully connected to MySQL database")
	return db
}

// DisconnectDB is stopping your connection to mysql database
func DisconnectDB(db *gorm.DB) {
	sqlDB, err := db.DB()
	if err != nil {
		panic("Failed to get database instance")
	}
	sqlDB.Close()
	fmt.Println("Disconnected from MySQL database")
}
