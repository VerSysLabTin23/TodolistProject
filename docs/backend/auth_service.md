# Auth Service Documentation

## Overview
The **Auth Service** handles user authentication, JWT token management, and user profile operations.  
It provides JWT validation for other services and manages user data with secure password hashing.

## Architecture
- **Port**: `8084`  
- **Database**: MySQL (`3309`)  
- **Dependencies**: None (standalone service)  
- **Event Publishing**: Kafka for user events  

## Key Features
- User registration and authentication  
- JWT token generation and validation  
- User profile management  
- Password management with **SHA-256 hashing**  
- Role-based access control (user/admin)  
- Internal API for token validation  

## Authentication
- Uses **JWT tokens** for authentication.  
- Provides `/validate` endpoint for other services to verify tokens.  

## Event Publishing
The service publishes events to **Kafka** for real-time updates:  
- `user.created` — when a user is created  

## Key Files
- **Main Entry**: `auth/cmd/auth-service/main.go`  
- **Handlers**: `auth/internal/handlers/http.go`  
- **Models**: `auth/internal/models/models.go`  
- **Repository**: `auth/internal/repository/repository.go`  
- **Service**: `auth/internal/service/auth_service.go`  
- **Middleware**: `auth/internal/middleware/jwt.go`  
- **Events**: `auth/internal/events/producer.go`  
- **Migrations**: `auth/migrations/`  
- **API Spec**: `auth/api/auth.yml`  
