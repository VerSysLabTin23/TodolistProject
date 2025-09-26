# Project Documentation Overview

**Distributed Systems Lab Project**

**Team Members**: Ziyi Hong, Danylo Tulainov. 
**Roles**: Frontend developer(Danylo), Backend developer(Ziyi)

**GitHub Repository**: [TodolistProject](https://github.com/VerSysLabTin23/TodolistProject)  

All documentation is available in the `docs/` folder of the repository.  
Cheeck the documentation in github pages <https://versyslabtin23.github.io/TodolistProject/>

---

## Project Summary

This project implements a distributed, real-time collaborative Todo application using microservices architecture. The system features team-based task management, real-time updates via WebSocket, and event-driven communication using Apache Kafka.

## Documentation Structure

### Getting Started
- [Setup Guide](setup.md) - Quick start and installation instructions

### Architecture & Design
- [Architecture Implementation](architecture_implementation.md) - Comprehensive architecture documentation

### Project Reflection
- [Backend Reflection](backend/reflection.md) - Project challenges, learnings, and improvements


### Backend Services
- [Backend Overview](backend/backend_overview.md) - Backend services and components
    - [Auth Service](backend/auth_service.md) - Authentication and user management
    - [Task Service](backend/task_service.md) - Task operations and event publishing
    - [Team Service](backend/team_service.md) - Team management and permissions
    - [Realtime Service](backend/realtime_service.md) - WebSocket and real-time updates
    - [Notification Service](backend/notification_service.md) - Email notifications
    - [Kafka Integration](backend/kafka.md) - Event streaming and partitioning
    - [Nginx Gateway](backend/nginx.md) - API gateway and load balancing

### Frontend
- [Frontend Overview](frontend/frontend_overview.md) - React application architecture



## Key Features

- **Microservices Architecture**: Independent services for scalability
- **Event-Driven Communication**: Kafka-based asynchronous messaging
- **Real-time Collaboration**: WebSocket-powered live updates
- **Team-based Organization**: Multi-user task management
- **Horizontal Scaling**: Load-balanced service deployment
- **Containerized Deployment**: Docker-based infrastructure

## Technology Stack

**Backend:**
- Go 1.21+ with Gin framework
- MySQL 8.0 (database per service)
- Apache Kafka for event streaming
- JWT authentication

**Frontend:**
- React 18 with TypeScript
- WebSocket for real-time updates
- Vite build tool

**Infrastructure:**
- Docker & Docker Compose
- Nginx reverse proxy
- Mailpit for email testing

## Quick Links

- **Start Here**: [Setup Guide](setup.md)
- **API Reference**: [API Endpoints](backend/api_endpoints.md)
- **Architecture**: [Architecture Implementation](architecture_implementation.md)
- **Backend Services**: [Backend Overview](backend/backend_overview.md)
- **Project Reflection**: [Backend Reflection](backend/reflection.md)
- **Development_related**: [Branching Strategy](branching.md)
- **Frontend**: [Frontend Overview](frontend/frontend_overview.md)

\newpage