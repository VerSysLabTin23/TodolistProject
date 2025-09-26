# Team Service Documentation

## Overview
The **Team Service** handles team management operations including team CRUD, member management, and permission control.  
It provides internal APIs for other services to validate team access and publishes team-related events to **Kafka**.

- Team service API doc: [Team API](../../team/api/team.yml)

## Architecture
- **Port**: `8083`  
- **Database**: MySQL (`3307`)  
- **Dependencies**: Auth Service (JWT validation)  
- **Event Publishing**: Kafka for real-time updates  

## Key Features
- Team CRUD operations  
- Team member management  
- Permission control (owner, admin, member roles)  
- Internal API for team access validation  
- Real-time event publishing  

## Authentication
- Most endpoints require **JWT authentication**.  
- Internal endpoints use **internal token authentication**.  

## Event Publishing
The service publishes events to **Kafka** for real-time updates:  
- `team.created` — when a team is created  
- `team.updated` — when a team is updated  
- `team.deleted` — when a team is deleted  
- `team.member_added` — when a member is added  
- `team.member_removed` — when a member is removed  
- `team.member_role_updated` — when a member’s role changes  

## Key Files
- **Main Entry**: `team/cmd/team-service/main.go`  
- **Handlers**: `team/internal/handlers/handlers.go`  
- **Models**: `team/internal/models/models.go`  
- **Repository**: `team/internal/repository/repository.go`  
- **Events**: `team/internal/events/events.go`  
- **Migrations**: `team/migrations/`  
- **API Spec**: `team/api/team.yml`

\newpage  
