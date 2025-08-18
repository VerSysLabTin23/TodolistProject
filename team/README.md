# Team Service

REST API service for managing teams and team memberships. Built with Go, Gin, and GORM.

## Features

- Team creation and management
- Team membership with role-based access (owner, admin, member)
- User team associations
- Search and pagination support

## Project Structure

```
team/
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
- Go 1.24+
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
   export DB_NAME=teamsdb
   export PORT=8083
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
http://localhost:8083
```

### Core Endpoints

- `GET /healthz` - Health check
- `GET /teams` - List teams
- `POST /teams` - Create team
- `GET /teams/{id}` - Get team
- `PUT /teams/{id}` - Update team
- `DELETE /teams/{id}` - Delete team
- `GET /teams/{id}/members` - List team members
- `POST /teams/{id}/members` - Add member
- `DELETE /teams/{id}/members/{userId}` - Remove member
- `GET /users/{userId}/teams` - List user's teams

### Query Parameters

- `q` - Search query for team name/description
- `limit` - Page size (1-200, default: 50)
- `offset` - Pagination offset

## Data Models

### Team
```json
{
  "id": 1,
  "name": "Development Team",
  "description": "Main development team",
  "ownerId": 3,
  "createdAt": "2025-08-10T09:30:00Z",
  "updatedAt": "2025-08-10T09:45:00Z"
}
```

### Team Member
```json
{
  "userId": 5,
  "teamId": 1,
  "role": "member",
  "joinedAt": "2025-08-10T10:00:00Z"
}
```

### Create Team Request
```json
{
  "name": "Team Name",
  "description": "Team description"
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

### Schema
- `teams` - Team information
- `team_members` - User-team relationships with roles

### Migrations
- `20250810_create_teams_table.sql` - Initial table creation
- `20250814153500_seed_mock_teams.sql` - Sample data

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 8083 | Service port |
| DB_HOST | localhost | Database host |
| DB_PORT | 3306 | Database port |
| DB_USER | root | Database username |
| DB_PASS | | Database password |
| DB_NAME | teamsdb | Database name |

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
# Manual testing
curl http://localhost:8083/healthz
curl http://localhost:8083/teams
```

## Dependencies

This service depends on:
- MySQL database
- Future: Auth Service for user authentication

## Future Enhancements

- JWT authentication
- User permission validation
- Request validation middleware
- Rate limiting
- Metrics and monitoring
- Team templates
- Team activity log

## License

MIT License - see LICENSE file for details.
