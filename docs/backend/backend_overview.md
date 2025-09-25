# Backend Overview

- [Reflection](reflection.md) - Project challenges, learnings, and improvements

## Architecture

The backend consists of 5 microservices communicating through REST APIs and Kafka events:

- **Auth Service** - User authentication and JWT management
- **Task Service** - Task CRUD operations and event publishing  
- **Team Service** - Team management and member permissions
- **Realtime Service** - WebSocket connections and event broadcasting
- **Notification Service** - Email notifications via Kafka events

## Infrastructure Components

- **Kafka** - Message broker and event streaming platform
- **Nginx Gateway** - API gateway, load balancer, and WebSocket proxy
- **MySQL Databases** - One database per service for data isolation

## Communication Patterns

- **Synchronous**: REST APIs for request-response operations
- **Asynchronous**: Kafka events for real-time updates and notifications
- **Real-time**: WebSocket connections for live collaboration

## Key Technologies

- **Language**: Go 1.21+ with Gin framework
- **Database**: MySQL (one per service)
- **Message Broker**: Apache Kafka
- **Authentication**: JWT tokens
- **Containerization**: Docker


## Documentation

- [API Endpoints](api_endpoints.md) - Complete API reference
- [Auth Service](auth_service.md) - Authentication and user management
- [Task Service](task_service.md) - Task operations and events
- [Team Service](team_service.md) - Team management and permissions
- [Realtime Service](realtime_service.md) - WebSocket and real-time updates
- [Notification Service](notification_service.md) - Email notifications
- [Kafka](kafka.md) - Event streaming and partitioning strategy
- [Nginx Gateway](nginx.md) - API gateway and load balancing

## Key Features

- **Event-Driven Architecture**: Services communicate via Kafka events
- **Real-time Collaboration**: WebSocket-based live updates
- **Team-based Partitioning**: Kafka events partitioned by team ID for ordering
- **Horizontal Scaling**: Services designed for multiple instances
- **JWT Authentication**: Stateless authentication across services

\newpage
