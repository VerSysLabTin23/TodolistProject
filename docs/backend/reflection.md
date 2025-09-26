# Reflection in Backend

## What Worked Well
- Microservices architecture enabled independent development and scaling
- Event-driven architecture provided good decoupling and scalability
- WebSocket implementation delivered quick real-time update
- Docker containerization simplified deployment and development

## Major Challenges
- WebSocket Connection Management: Had to implement robust reconnection logic and handle browser compatibility issues
- Distributed System Complexity: Required careful error handling and monitoring across services
- Data Format and Schema Inconsistencies: The most challenging issue was handling different data formats between services

*Take a bug for example:*  
    The backend sent a time.Time object for the due field in the Kafka event payload.  
    However, the frontend expected a string in "YYYY-MM-DD" format.  
    This mismatch caused WebSocket events to fail silently. The frontend would receive the event but couldn't parse the due field, leading to incomplete task updates that required manual page refresh. The issue took so much time to debug because the WebSocket connection appeared to be working, but the data parsing was failing silently.

## What I'd Do Differently
- Architecture: comprehensive monitoring (Prometheus/Grafana)
- Technology: 
  - Database: consider PostgreSQL for better JSON support.
  - **Redis for caching**: The current system lacks caching, leading to repeated database queries for user authentication, team membership validation, and task data. Redis would significantly improve performance by caching frequently accessed data. It was planned, but didn't have enough time to implement it. I think there is a bottleneck in ws, because of the repeated queries for user authentication and team membership validation, with cache it will be faster and more efficient.
- Process: comprehensive testing strategy, automated deployment.
- Data Handling: Implement stricter schema validation and especially need **better error reporting** for format mismatches
- Development Process: I should have worked on frontend parallel with backend development. Less backend development and do more frontend work so that we could present the project more visually. Now even though we have a "laufbar und umfassend" backend, we don't have the frontend to showcase it.

## Key Learnings
1. Distributed System Design Principles:
    - Service Decomposition: Breaking down monolithic applications into microservices requires careful consideration of service boundaries and data ownership
    - Event-Driven Architecture: Using events for inter-service communication provides excellent decoupling but introduces complexity in event ordering and consistency
    - Data Consistency: Achieving ACID properties across services is challenging; eventual consistency with compensation patterns is often more practical
    - Fault Tolerance: Distributed systems must be designed to handle partial failures gracefully, requiring circuit breakers, retries, and fallback mechanisms
2. Communication Patterns:
    - Synchronous vs Asynchronous: REST APIs for request-response patterns, message queues for event-driven communication
    - Service Discovery: Dynamic service location is crucial for scalability and fault tolerance
    - Load Balancing: Distributing load across multiple service instances requires careful consideration of session affinity and health checks
3. Authentication and Authorization:
    - JWT Token Management: Stateless authentication using JWT tokens enables horizontal scaling but requires careful token validation and refresh mechanisms
    - Cross-Service Authentication: Services need to validate tokens and extract user context without maintaining session state
    - WebSocket Authentication: Authenticating WebSocket connections requires special handling, such as token validation during connection upgrade
    - Internal Service Communication: Using internal tokens for service-to-service communication provides security isolation
4. Real-time Communication:
    - WebSocket Management: Maintaining persistent connections in distributed systems requires connection pooling, heartbeat mechanisms, and proper cleanup
    - Event Broadcasting: Targeting specific users or groups in real-time requires efficient user-to-connection mapping and event routing
5. Monitoring and Observability:
    - Distributed Tracing: Tracking requests across multiple services is essential for debugging and performance optimization
    - Health Checks: Implementing proper health checks enables automatic failure detection and recovery
    - Centralized Logging: Aggregating logs from multiple services provides visibility into system behavior
6. Data Management:
    - Database per Service: Each service owning its data provides better isolation but requires careful design of data access patterns
    - Event Sourcing: Storing events as the source of truth enables replay and audit capabilities
    - Schema Evolution: Managing data format changes across services requires versioning and backward compatibility strategies

\newpage
