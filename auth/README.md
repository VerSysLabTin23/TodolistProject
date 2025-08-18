# Auth Service

Authentication and User Management Service for the Todolist Project.

## Features

- User registration and authentication
- JWT token management (access + refresh tokens)
- User profile management
- Password management with bcrypt hashing
- Role-based access control (user/admin)
- User CRUD operations (admin only)
- Secure password validation

## Project Structure

```
auth/
├── api/                    # OpenAPI specification
├── migrations/            # Database migrations
├── auth_service.go       # Authentication business logic
├── handlers.go           # HTTP request handlers
├── models.go             # Data models and DTOs
├── repository.go         # Data access layer
├── main.go              # Application entry point
├── Dockerfile           # Container configuration
├── docker-compose.yml   # Local development setup
└── README.md            # This file
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Go 1.21+ (for local development)

### Local Development

1. Start the service with Docker Compose:
   ```bash
   docker compose up -d
   ```

2. The service will be available at:
   - Auth Service: http://localhost:8084
   - Database: localhost:3308
   - phpMyAdmin: http://localhost:8085

3. Check service health:
   ```bash
   curl http://localhost:8084/healthz
   ```

### Database Setup

The service automatically runs migrations on startup. Default users are created:

- **Admin**: `admin` / `admin123`
- **Users**: `john_doe`, `jane_smith`, `bob_wilson`, `alice_brown` / `admin123`

## API Endpoints

### Authentication

- `POST /auth/register` - User registration
- `POST /auth/login` - User authentication
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - User logout

### User Management

- `GET /users` - List users (admin only)
- `POST /users` - Create user (admin only)
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user (admin only)

### User Profile

- `GET /users/profile` - Get current user profile
- `PUT /users/profile` - Update current user profile
- `POST /users/change-password` - Change password

## Data Models

### User

```go
type User struct {
    ID           int       `json:"id"`
    Username     string    `json:"username"`
    Email        string    `json:"email"`
    PasswordHash string    `json:"-"`
    FirstName   string    `json:"firstName"`
    LastName    string    `json:"lastName"`
    Role        string    `json:"role"`
    IsActive    bool      `json:"isActive"`
    CreatedAt   time.Time `json:"createdAt"`
    UpdatedAt   time.Time `json:"updatedAt"`
}
```

### JWT Claims

```go
type Claims struct {
    UserID   int    `json:"user_id"`
    Username string `json:"username"`
    Role     string `json:"role"`
    jwt.RegisteredClaims
}
```

## Error Handling

All API endpoints return consistent error responses:

```json
{
    "code": "ERROR_CODE",
    "message": "Human readable error message"
}
```

Common error codes:
- `BAD_REQUEST` - Invalid input
- `UNAUTHORIZED` - Missing or invalid credentials
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Resource conflict
- `INTERNAL_ERROR` - Server error

## Database Schema

### users Table

- `id` - Primary key
- `username` - Unique username
- `email` - Unique email address
- `password_hash` - Bcrypt hashed password
- `first_name` - User's first name
- `last_name` - User's last name
- `role` - User role (user/admin)
- `is_active` - Account status
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8084` | Service port |
| `DB_HOST` | `localhost` | Database host |
| `DB_PORT` | `3306` | Database port |
| `DB_USER` | `root` | Database user |
| `DB_PASS` | `pass` | Database password |
| `DB_NAME` | `authdb` | Database name |
| `JWT_SECRET` | `your-secret-key-change-in-production` | JWT signing secret |
| `JWT_ACCESS_TTL` | `15m` | Access token TTL |
| `JWT_REFRESH_TTL` | `168h` | Refresh token TTL |

## Development Guidelines

### Adding New Endpoints

1. Define the endpoint in `api/auth.yml`
2. Add the handler method in `handlers.go`
3. Register the route in `main.go`
4. Add tests if applicable

### Database Changes

1. Create a new migration file in `migrations/`
2. Update models if needed
3. Test the migration locally

### Security Considerations

- Always hash passwords with bcrypt
- Validate JWT tokens on protected endpoints
- Check user permissions before sensitive operations
- Use environment variables for secrets
- Implement rate limiting in production

## Dependencies

- **Gin** - HTTP web framework
- **GORM** - ORM library
- **MySQL Driver** - Database driver
- **JWT** - JSON Web Token library
- **bcrypt** - Password hashing

## Future Enhancements

- [ ] JWT token blacklisting
- [ ] Password reset functionality
- [ ] Email verification
- [ ] Two-factor authentication
- [ ] OAuth integration
- [ ] Rate limiting
- [ ] Audit logging
- [ ] User activity tracking
