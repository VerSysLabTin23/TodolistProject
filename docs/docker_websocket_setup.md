# Docker WebSocket Setup

## Overview

The WebSocket (realtime) service has been added to the Docker Compose configuration to enable real-time updates for the Todo application.

## Services and Ports

### Core Services
- **Auth Service**: `localhost:8084` (Authentication)
- **Task Service**: `localhost:8081` (Task management)
- **Team Service**: `localhost:8083` (Team management)
- **Realtime Service**: `localhost:8086` (WebSocket for real-time updates)
- **Notification Service**: `localhost:8090` (Email notifications)

### Supporting Services
- **Nginx Gateway**: `localhost:80` (Reverse proxy)
- **Kafka**: `localhost:9092` (Event streaming)
- **Mailpit**: `localhost:8025` (Email testing UI)

### Databases
- **Task DB**: `localhost:3306` (MySQL for tasks)
- **Team DB**: `localhost:3307` (MySQL for teams)
- **Auth DB**: `localhost:3309` (MySQL for authentication)

### Database Management
- **Task phpMyAdmin**: `localhost:8082`
- **Auth phpMyAdmin**: `localhost:8085`

## WebSocket Access

### Direct Connection
```
ws://localhost:8086/ws?teamId=1&userId=123
```

### Through Nginx Gateway
```
ws://localhost:80/ws?teamId=1&userId=123
```

## API Endpoints via Nginx

### Authentication
- `http://localhost/auth/register`
- `http://localhost/auth/login`
- `http://localhost/auth/logout`

### Tasks
- `http://localhost/api/tasks/`
- `http://localhost/api/tasks/{id}`
- `http://localhost/api/tasks/{id}/complete`

### Teams
- `http://localhost/api/teams/`
- `http://localhost/api/teams/{id}`
- `http://localhost/api/teams/{id}/members`

### WebSocket
- `ws://localhost/ws?teamId={teamId}&userId={userId}`

## Starting the Stack

### Full Stack
```bash
docker-compose up -d
```

### Individual Services
```bash
# Start infrastructure only
docker-compose up -d kafka task-db team-db auth-db

# Start specific services
docker-compose up -d auth-service
docker-compose up -d team-service  
docker-compose up -d task-service
docker-compose up -d realtime
docker-compose up -d nginx
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f realtime
docker-compose logs -f kafka
```

## WebSocket Event Flow

1. **User Action** → API Service (Task/Team/Auth)
2. **API Service** → Publishes Kafka Event
3. **Kafka** → Broadcasts to Consumers
4. **Realtime Service** → Consumes Events
5. **WebSocket** → Broadcasts to Connected Clients
6. **Frontend** → Receives Real-time Updates

## Event Types

### Task Events
- `task.created` - New task created
- `task.updated` - Task modified
- `task.deleted` - Task removed
- `task.completed` - Task completion status changed

### Team Events
- `team.created` - New team created
- `team.updated` - Team information modified
- `team.deleted` - Team removed
- `team.member_added` - User added to team
- `team.member_removed` - User removed from team
- `team.member_role_updated` - User role changed

### User Events
- `user.created` - New user registered

## Testing WebSocket Connection

### Using Browser JavaScript
```javascript
const ws = new WebSocket('ws://localhost/ws?teamId=1&userId=123');

ws.onopen = function() {
    console.log('Connected to WebSocket');
};

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log('Received:', data);
};

ws.onclose = function() {
    console.log('WebSocket connection closed');
};
```

### Using wscat (CLI)
```bash
# Install wscat
npm install -g wscat

# Connect to WebSocket
wscat -c "ws://localhost/ws?teamId=1&userId=123"
```

### Testing Event Generation
```bash
# Create a task (should trigger WebSocket event)
curl -X POST http://localhost/api/tasks/teams/1/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Test WebSocket",
    "description": "Testing real-time updates",
    "priority": "medium",
    "due": "2025-01-15"
  }'
```

## Troubleshooting

### Check Service Health
```bash
# Check all containers
docker-compose ps

# Check specific service logs
docker-compose logs realtime
docker-compose logs kafka
docker-compose logs nginx
```

### Verify Kafka Topics
```bash
# Enter Kafka container
docker exec -it dev_kafka bash

# List topics
kafka-topics.sh --bootstrap-server localhost:9092 --list

# View messages in topic
kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic task.created --from-beginning
```

### Test WebSocket Connectivity
```bash
# Test direct connection
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: test" \
  -H "Sec-WebSocket-Version: 13" \
  http://localhost:8086/ws?teamId=1&userId=123

# Test through nginx
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: test" \
  -H "Sec-WebSocket-Version: 13" \
  http://localhost/ws?teamId=1&userId=123
```

## Environment Variables

### Realtime Service
- `KAFKA_BROKERS=dev_kafka:9092`
- `PORT=8086`

### All Services
- `KAFKA_BROKERS=dev_kafka:9092` (for event publishing/consuming)

## Next Steps

1. **Frontend Integration**: Connect your frontend application to `ws://localhost/ws`
2. **Authentication**: Implement JWT token validation in WebSocket connections
3. **Scaling**: Add multiple realtime service instances with load balancing
4. **Monitoring**: Add metrics and health checks for WebSocket connections
5. **SSL/TLS**: Configure HTTPS and WSS for production deployment
