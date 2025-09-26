# Nginx Gateway Documentation

## Overview
The **Nginx Gateway** serves as the API gateway and reverse proxy for the entire application.  
It handles load balancing, WebSocket proxying, static file serving, and request routing to appropriate microservices.

## Architecture
- **Port**: `80`  
- **Role**: API Gateway, Load Balancer, WebSocket Proxy  
- **Dependencies**: All backend services  
- **Static Files**: Frontend React application  

## Key Features
- Request routing to microservices  
- Load balancing across service instances  
- WebSocket proxy and upgrade handling  
- Static file serving for frontend  
- CORS configuration  
- Health check integration  

## Service Routing
- **Frontend**: Serves React SPA from `/`  
- **Auth Service**: Routes `/api/auth/*` → `auth-service:8084`  
- **Task Service**: Routes `/api/tasks/*` → `task-service:8081`  
- **Team Service**: Routes `/api/teams/*` → `team-service:8083`  
- **WebSocket**: Routes `/ws` → realtime service with load balancing  

## WebSocket Configuration
- Supports WebSocket upgrade and connection management  
- Load balances WebSocket connections across multiple realtime service instances  
- Handles `Sec-WebSocket-Protocol` headers for JWT authentication  
- Maintains connection state and heartbeat  

## Load Balancing
- **Realtime Service**: Dynamic DNS resolution for horizontal scaling  
- **Other Services**: Direct service routing  
- **Health Checks**: Integrated with Docker health checks  

## Key Files
- **Configuration**: `nginx.conf`
- **Docker Config**: `docker-compose.yml` (nginx service)  

\newpage  
