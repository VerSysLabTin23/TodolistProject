# Task Service Documentation

## Overview
The **Task Service** handles task management operations including CRUD operations, task assignment, and real-time event publishing.  
It integrates with the **Team Service** for permission validation and publishes events to **Kafka** for real-time updates.

## Architecture
- **Port**: `8081`  
- **Database**: MySQL (`3306`)  
- **Dependencies**: Auth Service (JWT validation), Team Service (permission checks)  
- **Event Publishing**: Kafka for real-time updates  

## Key Features
- Task CRUD operations  
- Team-scoped task management  
- Task assignment and completion tracking  
- Real-time event publishing  
- Cross-service authentication  

## Authentication
All endpoints require **JWT authentication** via:  Authorization: Bearer <token>

## Event Publishing
The service publishes events to **Kafka** for real-time updates:  
- `task.created` — when a task is created  
- `task.updated` — when a task is updated  
- `task.deleted` — when a task is deleted  
- `task.completed` — when task completion status changes  

## Key Files
- **Main Entry**: `task/cmd/task-service/main.go`  
- **Handlers**: `task/internal/handlers/http.go`  
- **Models**: `task/internal/models/models.go`  
- **Repository**: `task/internal/repository/repository.go`  
- **Events**: `task/internal/events/producer.go`  
- **Migrations**: `task/migrations/`  
- **API Spec**: `task/api/task.yml`

\newpage  
