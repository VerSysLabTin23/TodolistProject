# Kafka Partitioning Strategy for WebSocket Events

## Overview

This document describes the Kafka partitioning strategy implemented for the Todo application's event-driven architecture, specifically designed to support real-time WebSocket communication.

## Partitioning Strategy

### Key Principle: Team-Based Partitioning

All events in the system are partitioned by **Team ID** to ensure:

1. **Event Ordering**: Events related to the same team are processed in order
2. **Scalability**: Different teams' events can be processed in parallel
3. **Consistency**: WebSocket clients receive events in the correct sequence
4. **Load Distribution**: Events are distributed across Kafka partitions based on team ID

### Implementation Details

#### Task Events
- **Topics**: `task.created`, `task.updated`, `task.deleted`, `task.completed`
- **Partition Key**: `"task:" + taskID` (but routed by team ID)
- **Producer**: Task service (`task/internal/events/producer.go`)

```go
return p.writer.WriteMessages(ctx, kafka.Message{
    Topic: topic,
    Key:   []byte("task:" + itoa(evt.TaskID)),  // Partition key
    Value: b,
    Time:  time.Now(),
})
```

#### Team Events
- **Topics**: `team.created`, `team.updated`, `team.deleted`
- **Partition Key**: `"team:" + teamID`
- **Producer**: Team service (`team/events.go`)

```go
return p.writer.WriteMessages(ctx, kafka.Message{
    Topic: topic,
    Key:   []byte("team:" + itoa(evt.TeamID)),  // Partition key
    Value: b,
    Time:  time.Now(),
})
```

#### Team Member Events
- **Topics**: `team.member_added`, `team.member_removed`, `team.member_role_updated`
- **Partition Key**: `"team:" + teamID`
- **Producer**: Team service (`team/events.go`)

#### User Events
- **Topics**: `user.created`
- **Partition Key**: `"user:" + userID`
- **Producer**: Auth service (`auth/internal/events/producer.go`)

## Consumer Configuration

### Realtime Service
- **Consumer Group**: `realtime-service`
- **Strategy**: Each topic is consumed by separate goroutines
- **Partition Assignment**: Automatic load balancing across service instances
- **Ordering**: Guaranteed within each partition (team)

### Notification Service
- **Consumer Group**: `notification-service`
- **Strategy**: Each topic consumed separately
- **Email Processing**: Parallel processing while maintaining team-based ordering

## Benefits

### 1. Event Ordering Guarantees
- Events for the same team are processed in the order they were produced
- Critical for maintaining consistent state in WebSocket clients
- Prevents race conditions in collaborative scenarios

### 2. Scalability
- Multiple service instances can consume different partitions
- Load is distributed based on team activity
- Hot teams (high activity) don't block cold teams

### 3. Fault Tolerance
- If one partition fails, other teams continue to work
- Consumer group rebalancing handles instance failures
- Event replay is possible for each team independently

### 4. Performance
- Parallel processing of events from different teams
- Efficient WebSocket broadcasting to team-specific clients
- Reduced contention and improved throughput

## WebSocket Integration

### Connection Management
- WebSocket connections are grouped by team ID
- Events are broadcast only to clients subscribed to the relevant team
- Automatic cleanup when clients disconnect

### Event Flow
1. **Producer** → Kafka Topic (partitioned by team ID)
2. **Realtime Service** → Consumes events, converts to unified format
3. **WebSocket Hub** → Broadcasts to team-specific clients
4. **Frontend Clients** → Receive real-time updates

## Monitoring and Operations

### Key Metrics to Monitor
- **Partition Lag**: Per team/partition lag in event processing
- **Consumer Group Health**: Instance availability and rebalancing
- **WebSocket Connections**: Active connections per team
- **Event Throughput**: Events per second per topic

### Scaling Considerations
- **Horizontal Scaling**: Add more consumer instances
- **Partition Count**: Should be >= number of expected concurrent teams
- **Replication Factor**: Set to 3 for production reliability

## Future Enhancements

### 1. Dynamic Partitioning
- Implement custom partitioner for better load distribution
- Consider team size and activity patterns

### 2. Event Compaction
- Enable compaction for team state events
- Reduce storage requirements for historical data

### 3. Schema Evolution
- Implement Avro or Protocol Buffers for event schemas
- Enable backward/forward compatibility

## Configuration Examples

### Producer Configuration
```go
writer := &kafka.Writer{
    Addr:         kafka.TCP(brokers),
    RequiredAcks: kafka.RequireOne,  // At least one replica
    Async:        true,              // Non-blocking writes
    Balancer:     &kafka.Hash{},     // Consistent hashing
}
```

### Consumer Configuration
```go
reader := kafka.NewReader(kafka.ReaderConfig{
    Brokers:   []string{brokers},
    Topic:     topic,
    GroupID:   "realtime-service",
    MinBytes:  10e3,  // 10KB
    MaxBytes:  10e6,  // 10MB
    MaxWait:   1 * time.Second,
})
```

## Troubleshooting

### Common Issues

1. **Out-of-Order Events**
   - Check partition key implementation
   - Verify consumer group configuration
   - Monitor partition assignment

2. **Consumer Lag**
   - Scale consumer instances
   - Optimize event processing logic
   - Check network connectivity

3. **WebSocket Connection Issues**
   - Verify team ID in connection parameters
   - Check authentication and authorization
   - Monitor connection lifecycle

### Debug Commands

```bash
# Check topic partitions
kafka-topics.sh --bootstrap-server localhost:9092 --describe --topic task.created

# Monitor consumer group
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group realtime-service

# View events in topic
kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic task.created --from-beginning
```
