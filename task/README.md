# Task Service

REST API service for managing tasks within teams. Built with Go, Gin, and GORM.

## Features

- Team-scoped task management
- Priority-based sorting (High > Medium > Low, then by due date)
- Flexible filtering and search
- Pagination support
- Quick operations for assignee and completion updates

## Project Structure

```
task/
├── api/                    # OpenAPI specification
├── migrations/            # Database migrations
├── main.go               # Application entry point
├── models.go             # Data models and DTOs
├── handlers.go           # HTTP request handlers
├── repository.go         # Data access layer
├── dockerfile            # Docker configuration
├── docker-compose.yml    # Local development setup
└── README.md            # This file
```

## Quick Start

### Prerequisites
- Go 1.21+
- MySQL 8.0+
- Docker (optional)

### Local Development

1. Install dependencies
   ```bash
   go mod tidy
   ```

2. Set environment variables
   ```bash
   export DB_HOST=localhost
   export DB_PORT=3306
   export DB_USER=root
   export DB_PASS=your_password
   export DB_NAME=tasksdb
   export PORT=8081
   ```

3. Run the service
   ```bash
   go run main.go
   ```

### Docker
```bash
docker-compose up --build
```

## API Endpoints

### Base URL
```
http://localhost:8081
```

### Core Endpoints

- `GET /healthz` - Health check
- `GET /teams/{teamId}/tasks` - List tasks in team
- `POST /teams/{teamId}/tasks` - Create task in team
- `GET /tasks` - List tasks across teams
- `GET /tasks/{id}` - Get single task
- `PUT /tasks/{id}` - Update task
- `DELETE /tasks/{id}` - Delete task
- `PUT /tasks/{id}/assignee` - Set assignee
- `POST /tasks/{id}/complete` - Toggle completion

### Query Parameters

- `completed` - Filter by completion state
- `priority` - Filter by priority (low, medium, high)
- `assigneeId` - Filter by assignee
- `teamId` - Filter by team
- `q` - Search query
- `limit` - Page size (1-200, default: 50)
- `offset` - Pagination offset

## Data Models

### Task
```json
{
  "id": 1,
  "teamId": 12,
  "creatorId": 3,
  "assigneeId": 5,
  "title": "Task title",
  "description": "Task description",
  "completed": false,
  "priority": "medium",
  "due": "2025-08-20",
  "createdAt": "2025-08-10T09:30:00Z",
  "updatedAt": "2025-08-10T09:45:00Z"
}
```

### Create Task Request
```json
{
  "title": "Task title",
  "description": "Task description",
  "priority": "medium",
  "due": "2025-08-20",
  "assigneeId": 5
}
```

## Error Handling

All errors return consistent format:
```json
{
  "code": "ERROR_CODE",
  "message": "Error description"
}
```

Common error codes: `BAD_REQUEST`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `INTERNAL_ERROR`

## Database

### Migrations
- `20250810_create_tasks_table.sql` - Initial table creation
- `20250814153500_seed_mock_tasks.sql` - Sample data
- `20250815_update_tasks_table.sql` - Schema updates

### Schema
- `id` - Primary key
- `team_id` - Team identifier
- `creator_id` - Task creator
- `assignee_id` - Task assignee (nullable)
- `title` - Task title
- `description` - Task description (nullable)
- `completed` - Completion status
- `priority` - Priority level (low, medium, high)
- `due` - Due date
- `created_at`, `updated_at` - Timestamps

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 8081 | Service port |
| DB_HOST | localhost | Database host |
| DB_PORT | 3306 | Database port |
| DB_USER | root | Database username |
| DB_PASS | | Database password |
| DB_NAME | tasksdb | Database name |

## Development

### Code Style
- Follow Go conventions
- Use meaningful variable names
- Handle errors explicitly
- Add comments for complex logic

### Adding Features
1. Update models in `models.go`
2. Add repository methods in `repository.go`
3. Implement handlers in `handlers.go`
4. Add routes in `main.go`
5. Create migrations if needed

### Testing
```bash
# Run API tests
./test_api.sh

# Manual testing
curl http://localhost:8081/healthz
curl http://localhost:8081/teams/1/tasks
```

## Dependencies

This service depends on:
- Auth Service (for user management)
- Team Service (for team management)

Foreign key constraints will be added when dependent services are available.

## Future Enhancements

- JWT authentication
- Team membership validation
- Request validation middleware
- Rate limiting
- Metrics and monitoring
- WebSocket support
- Task templates
- File attachments

## License

MIT License - see LICENSE file for details.
