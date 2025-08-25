# Notification Service Documentation

## Overview

The Notification Service is a microservice responsible for handling asynchronous event notifications via email. It acts as a consumer of Kafka events and sends appropriate emails to users based on business events occurring in the system.

## Architecture

```
┌─────────────┐    Kafka Events     ┌─────────────────┐    HTTP Calls     ┌─────────────┐
│ Auth/Task   │ ──────────────────► │ Notification    │ ───────────────► │ Auth        │
│ Services    │                     │ Service         │                   │ Service     │
└─────────────┘                     └─────────────────┘                   └─────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │ Mailpit (SMTP)  │
                                    │ (Development)   │
                                    └─────────────────┘
```

## Features

### Event-Driven Email Notifications
- **Task Updates**: Sends emails when tasks are updated or completed
- **User Welcome**: Sends welcome emails to newly registered users
- **Template-based**: Uses customizable email templates for different event types

### Multi-Service Integration
- **Auth Service Integration**: Fetches user details for email personalization
- **Task Service Integration**: Processes task-related events
- **Kafka Integration**: Consumes events from multiple topics

## Event Types

### 1. Task Events

#### `task.updated`
- **Trigger**: When a task is modified (title, description, assignee, etc.)
- **Recipients**: Task creator and assignee
- **Email Template**: Task update notification with task details

#### `task.completed`
- **Trigger**: When a task is marked as completed or incomplete
- **Recipients**: Task creator and assignee
- **Email Template**: Task completion status notification

### 2. User Events

#### `user.created`
- **Trigger**: When a new user registers
- **Recipients**: Newly created user
- **Email Template**: Welcome email with account details

## Event Processing Flow

### 1. Event Consumption
```go
topics := []string{"task.updated", "task.completed", "user.created"}
```
- Listens to multiple Kafka topics simultaneously
- Uses consumer group `notification-service` for load balancing
- Processes events asynchronously in separate goroutines

### 2. Event Parsing
```go
switch tp {
case "task.updated", "task.completed":
    var event TaskEvent
    json.Unmarshal(m.Value, &event)
    processTaskEvent(authClient, emailSender, tp, event)
    
case "user.created":
    var event UserEvent
    json.Unmarshal(m.Value, &event)
    processUserEvent(emailSender, tp, event)
}
```

### 3. Email Processing
- **Task Events**: Fetches user details from Auth Service, sends to creator + assignee
- **User Events**: Extracts email/username from event payload, sends welcome email

## Email Templates

### Task Update Template
```
Hello {username},

A task has been updated:
- Task ID: {taskId}
- Team ID: {teamId}
- Updated by: User {actorId}
- Timestamp: {timestamp}

Best regards,
Todo App
```

### Task Completion Template
```
Hello {username},

A task has been {completed/marked as incomplete}:
- Task ID: {taskId}
- Team ID: {teamId}
- Action by: User {actorId}
- Timestamp: {timestamp}

Best regards,
Todo App
```

### Welcome Email Template
```
Hello {username},

Welcome to Todo App! 🎉

Your account has been successfully created with User ID: {userId}

We're excited to have you on board. You can now:
- Create and manage tasks
- Join teams and collaborate
- Track your progress

Best regards,
Todo App Team
```


## API Endpoints

### Health Check
```http
GET /ping
```
**Response:**
```json
{
  "message": "pong from notification service"
}
```

## Error Handling

### Graceful Degradation
- **Kafka Connection Failures**: Logs errors, continues operation
- **Auth Service Unavailable**: Logs errors, skips email sending
- **SMTP Failures**: Logs errors, continues processing other events

### Logging
- **Event Reception**: Logs all received Kafka events
- **Email Success**: Logs successful email deliveries
- **Email Failures**: Logs failed email attempts with error details
- **Processing Summary**: Logs summary of event processing results

## Development

### Local Testing
1. **Start Services**: `docker-compose up notification mailpit`
2. **Check Mailpit UI**: http://localhost:8025
3. **Trigger Events**: Create users or update tasks
4. **Verify Emails**: Check Mailpit web interface

### Testing Event Flow
```bash
# Register new user (triggers welcome email)
curl -X POST http://localhost:8084/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"pass"}'

# Update task (triggers task notification)
curl -X PUT http://localhost:8081/tasks/1 \
  -H "Authorization: Bearer <token>" \
  -d '{"title":"Updated Task"}'
```
