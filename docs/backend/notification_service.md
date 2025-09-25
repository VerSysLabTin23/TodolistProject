# Notification Service Documentation

## Overview
The **Notification Service** handles email notifications by consuming events from **Kafka** and sending appropriate emails to users.  
It provides asynchronous notification processing for task and team-related events.

## Architecture
- **Port**: `8090`  
- **Database**: None (stateless)  
- **Dependencies**: Kafka, SMTP server  
- **Event Processing**: Kafka consumer for notification triggers  

## Key Features
- Email notification sending  
- Kafka event consumption  
- SMTP integration  
- Asynchronous notification processing  
- Event-based notification triggers  

## Authentication
Uses **internal authentication** for service-to-service communication.  

## Event Processing
Consumes events from **Kafka** topics and sends appropriate notifications:  
- `task.*` — task-related notifications  
- `team.*` — team-related notifications  
- `user.*` — user-related notifications  

## Key Files
- **Main Entry**: `notification/main.go`  
- **Kafka Consumer**: `notification/kafka_consumer.go`  
- **Email Sender**: `notification/email_sender.go`  
- **Auth Client**: `notification/auth_client.go`  
