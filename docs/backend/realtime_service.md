# Realtime Service Documentation

## Overview
The **Realtime Service** manages WebSocket connections and provides real-time updates to the frontend.  
It consumes events from **Kafka** and broadcasts them to connected users based on team membership and user relationships.

## Architecture
- **Port**: `8086`  
- **Database**: None (stateless)  
- **Dependencies**: Auth Service (JWT validation), Team Service (member resolution), Kafka  
- **Event Processing**: Kafka consumer for real-time updates  

## Key Features
- WebSocket connection management  
- User-specific connection mapping  
- Kafka event consumption and processing  
- Real-time event broadcasting  
- Team member resolution for targeted updates  
- Connection health monitoring  

## Authentication
WebSocket connections are authenticated via **JWT tokens** passed in:  
- The connection URL, or  
- `Sec-WebSocket-Protocol` header  

## Event Processing
Consumes events from **Kafka** topics:  
- `task.*` — task-related events  
- `team.*` — team-related events  
- `user.*` — user-related events  

Broadcasts events to specific users based on:  
- Team membership  
- Task assignment  
- Event ownership  

## Key Files
- **Main Entry**: `realtime/main.go`  
- **WebSocket Hub**: `realtime/websocket.go` 
- **Kafka Consumer**: `realtime/kafka_consumer.go`  
- **Events**: `realtime/events.go`  

\newpage 
