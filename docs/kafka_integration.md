# Kafka Integration Documentation

## Overview

This Todo application uses Apache Kafka as a distributed messaging system to enable asynchronous communication between microservices. Kafka facilitates event-driven architecture, allowing services to communicate without tight coupling.

## Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│ Auth        │         │ Task        │         │ Notification│
│ Service     │         │ Service     │         │ Service     │
└─────────────┘         └─────────────┘         └─────────────┘
       │                       │                       │
       │                       │                       │
       ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Apache Kafka Cluster                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ user.created│  │task.updated │  │   task.completed    │ │
│  │ topic       │  │ topic       │  │   topic             │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Event Topics

### 1. `user.created`
**Producer**: Auth Service  
**Consumer**: Notification Service  
**Purpose**: Notify when a new user account is created

#### Event Structure
```json
{
  "eventType": "user.created",
  "userId": 7,
  "timestamp": "2025-08-25T22:30:57.123Z",
  "payload": {
    "email": "user@example.com",
    "username": "newuser"
  }
}
```

### 2. `task.updated`
**Producer**: Task Service  
**Consumer**: Notification Service  
**Purpose**: Notify when a task is modified

#### Event Structure
```json
{
  "eventType": "task.updated",
  "taskId": 1,
  "teamId": 1,
  "actorId": 1,
  "creatorId": 1,
  "assigneeId": 2,
  "timestamp": "2025-08-25T22:41:54.574Z",
  "payload": {
    "title": "Updated Task Title",
    "completed": false
  }
}
```

### 3. `task.completed`
**Producer**: Task Service  
**Consumer**: Notification Service  
**Purpose**: Notify when a task completion status changes

#### Event Structure
```json
{
  "eventType": "task.completed",
  "taskId": 1,
  "teamId": 1,
  "actorId": 1,
  "creatorId": 1,
  "assigneeId": 2,
  "timestamp": "2025-08-25T22:50:15.123Z",
  "payload": {
    "completed": true
  }
}
```

## Producer Implementation

### Auth Service Producer
```go
type KafkaProducer struct {
    writer *kafka.Writer
}

func NewKafkaProducer() *KafkaProducer {
    brokers := os.Getenv("KAFKA_BROKERS")
    if brokers == "" {
        brokers = "dev_kafka:9092"
    }
    return &KafkaProducer{
        writer: &kafka.Writer{
            Addr:         kafka.TCP(brokers),
            RequiredAcks: kafka.RequireOne,
            Async:        true,
        },
    }
}

func (p *KafkaProducer) UserCreated(ctx context.Context, userID int, email, username string) error {
    return p.publish(ctx, "user.created", UserEvent{
        EventType: "user.created",
        UserID:    userID,
        Timestamp: time.Now(),
        Payload: map[string]interface{}{
            "email":    email,
            "username": username,
        },
    })
}
```

### Task Service Producer
```go
func (p *KafkaProducer) TaskUpdated(ctx context.Context, taskID, teamID, actorID, creatorID int, assigneeID *int, payload interface{}) error {
    return p.publish(ctx, "task.updated", TaskEvent{
        EventType:  "task.updated",
        TaskID:     taskID,
        TeamID:     teamID,
        ActorID:    actorID,
        CreatorID:  creatorID,
        AssigneeID: assigneeID,
        Timestamp:  time.Now(),
        Payload:    payload,
    })
}
```

## Consumer Implementation

### Notification Service Consumer
```go
func startKafkaConsumer(ctx context.Context, authClient *AuthClient, emailSender *EmailSender) func() {
    brokers := os.Getenv("KAFKA_BROKERS")
    topics := []string{"task.updated", "task.completed", "user.created"}
    
    for _, topic := range topics {
        r := kafka.NewReader(kafka.ReaderConfig{
            Brokers: []string{brokers},
            GroupID: "notification-service",
            Topic:   topic,
        })
        
        go func() {
            for {
                m, err := r.ReadMessage(ctx)
                if err != nil {
                    continue
                }
                
                // Process event based on topic
                switch topic {
                case "task.updated", "task.completed":
                    processTaskEvent(authClient, emailSender, topic, event)
                case "user.created":
                    processUserEvent(emailSender, topic, event)
                }
            }
        }()
    }
}
```

## Event Processing Patterns

### 1. Event Enrichment
**Pattern**: Consumer fetches additional data from other services
```go
func processTaskEvent(authClient *AuthClient, emailSender *EmailSender, eventType string, event TaskEvent) {
    // Enrich with user details
    creator, _ := authClient.GetUserByID(event.CreatorID)
    assignee, _ := authClient.GetUserByID(*event.AssigneeID)
    
    // Send personalized emails
    sendEmailToUser(creator.Email, creator.Username, eventType, event)
    sendEmailToUser(assignee.Email, assignee.Username, eventType, event)
}
```

### 2. Event Filtering
**Pattern**: Process events based on business rules
```go
func processTaskEvent(authClient *AuthClient, emailSender *EmailSender, eventType string, event TaskEvent) {
    // Only send to assignee if different from creator
    if event.AssigneeID != nil && *event.AssigneeID != event.CreatorID {
        sendEmailToUser(authClient, emailSender, *event.AssigneeID, eventType, event)
    }
}
```

### 3. Error Handling
**Pattern**: Graceful degradation with logging
```go
func processEvent(event Event) {
    if err := process(event); err != nil {
        log.Printf("Failed to process event: %v", err)
        // Continue processing other events
        return
    }
    log.Printf("Successfully processed event")
}
```

## Testing

### Local Development
```bash
# Start Kafka with docker-compose
docker-compose up kafka

# Test event publishing
curl -X POST http://localhost:8084/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"pass"}'

# Check notification service logs
docker logs notification_service
```

### Event Verification
```bash
# Check Kafka topics
docker exec dev_kafka kafka-topics --list --bootstrap-server localhost:9092

# Monitor events in real-time
docker exec dev_kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic user.created \
  --from-beginning
```