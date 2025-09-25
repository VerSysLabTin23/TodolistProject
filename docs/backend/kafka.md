# Kafka Documentation

## Overview
**Apache Kafka** serves as the message broker and event streaming platform for the entire application.  
It enables asynchronous communication between services and provides event persistence and replay capabilities.

## Architecture
- **Port**: `9092`  
- **Role**: Message Broker, Event Streaming Platform  
- **Dependencies**: None (standalone service)  
- **Storage**: Persistent event storage  

## Key Features
- Event streaming and message queuing  
- Event persistence and replay  
- Topic-based message routing  
- Partitioning for scalability  
- Multiple consumer support  
- Fault tolerance and durability  

## Event Topics
- `task.created` — task creation events  
- `task.updated` — task update events  
- `task.deleted` — task deletion events  
- `task.completed` — task completion events  
- `team.created` — team creation events  
- `team.updated` — team update events  
- `team.deleted` — team deletion events  
- `team.member_added` — team member addition events  
- `team.member_removed` — team member removal events  
- `team.member_role_updated` — team member role update events  
- `user.created` — user creation events  

## Partitioning Strategy

### Key Principle
All events are partitioned by **Team ID** to ensure:  
- **Event Ordering**: Events for the same team are always processed in sequence  
- **Scalability**: Events from different teams can be processed in parallel  
- **Consistency**: WebSocket clients receive events in the correct order  
- **Load Distribution**: Events are distributed across partitions according to team activity  

### Partition Keys
- **Task Events**: `"task:" + taskId` → routed by `teamId`  
- **Team Events**: `"team:" + teamId`  
- **User Events**: `"user:" + userId`  


## Event Flow
Events are published by services and consumed by other services via **Kafka topics**.  
Events are partitioned and persisted, allowing for **replay** and **fault-tolerant processing**.  

## Persistence
All events are durably stored in Kafka’s internal log for replay and recovery.  

## Key Files
- **Docker Config**: `docker-compose.yml` (kafka service)  
- **Producer Examples**:  
  - `task/internal/events/producer.go`  
  - `team/internal/events/events.go`  
  - `auth/internal/events/producer.go`  
- **Consumer Examples**:  
  - `realtime/kafka_consumer.go`  
  - `notification/kafka_consumer.go`  

## Configuration
**Environment Variables**:  
- `KAFKA_BROKERS` — Kafka broker addresses (default: `dev_kafka:9092`)  
- `KAFKA_TOPIC_PREFIX` — optional topic prefix  
- `KAFKA_GROUP_ID` — consumer group ID  

## Event Schema
All events follow a consistent JSON structure:  

```json
{
  "eventType": "task.created",
  "taskId": 123,
  "teamId": 456,
  "actorId": 789,
  "timestamp": "2025-01-20T10:30:00Z",
  "payload": { ... }
}
```

## Benefits
- **Event Ordering**: Guaranteed ordering of events within each team  
- **Scalability**: Supports parallel processing across teams and consumers  
- **Fault Tolerance**: Team-level isolation prevents cascading failures  
- **Performance**: Load distribution adapts to team activity  

## Scalability
- **Partitioning**: Events are partitioned by `teamId` to enable parallel processing across teams  
- **Consumer Groups**: Multiple consumers within a group can share the processing load  
- **Horizontal Scaling**: Kafka clusters can be scaled with multiple brokers for high availability and throughput  
