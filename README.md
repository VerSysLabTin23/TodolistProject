# Todolist Project

A microservices-based task management application with team collaboration features.

## 🏗️ Architecture

The project consists of three independent microservices:

- **Auth Service** (Port 8084) - User authentication and management
- **Team Service** (Port 8083) - Team management and collaboration
- **Task Service** (Port 8081) - Task management within teams

Each service has its own database and communicates via HTTP APIs.

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Go 1.21+ (for local development)

### Option 1: Automated Startup (Recommended)

Use the provided startup script to automatically start all services in the correct order:

```bash
./start_services.sh
```

This script will:
1. Check Docker status
2. Clean up existing containers
3. Start databases
4. Run migrations
5. Start services
6. Wait for all services to be ready
7. Display service URLs and status

### Option 2: Manual Startup

If you prefer to start services manually:

```bash
# Start all services
docker compose up -d

# Check service status
docker compose ps

# View logs
docker compose logs -f [service-name]
```

## 🧪 Testing

After starting all services, test the integration:

```bash
./test_services.sh
```

This will test:
- Service health checks
- User registration and authentication
- JWT token validation
- Team and task service functionality

## 🌐 Service URLs

### Services
- **Auth Service**: http://localhost:8084
- **Team Service**: http://localhost:8083
- **Task Service**: http://localhost:8081

### Databases
- **Auth DB**: localhost:3309
- **Team DB**: localhost:3307
- **Task DB**: localhost:3306

### phpMyAdmin
- **Auth phpMyAdmin**: http://localhost:8085
- **Team phpMyAdmin**: http://localhost:8084
- **Task phpMyAdmin**: http://localhost:8082

## 👥 Default Users

The system comes with pre-configured users:

- **Admin**: `admin` / `admin123`
- **Users**: `john_doe`, `jane_smith`, `bob_wilson`, `alice_brown` / `admin123`

## 🔐 Authentication Flow

1. **Register**: `POST /auth/register`
2. **Login**: `POST /auth/login` → Receive JWT tokens
3. **Use Token**: Include `Authorization: Bearer <token>` in requests
4. **Refresh**: `POST /auth/refresh` when access token expires

## 📁 Project Structure

```
TodolistProject/
├── auth/                 # Authentication Service
│   ├── api/             # OpenAPI specification
│   ├── migrations/      # Database migrations
│   ├── auth_service.go  # Business logic
│   ├── handlers.go      # HTTP handlers
│   ├── models.go        # Data models
│   ├── repository.go    # Data access
│   ├── middleware.go    # JWT middleware
│   └── main.go         # Service entry point
├── team/                # Team Management Service
│   ├── api/             # OpenAPI specification
│   ├── migrations/      # Database migrations
│   ├── models.go        # Data models
│   ├── handlers.go      # HTTP handlers
│   ├── repository.go    # Data access
│   ├── middleware.go    # Auth middleware
│   └── main.go         # Service entry point
├── task/                # Task Management Service
│   ├── api/             # OpenAPI specification
│   ├── migrations/      # Database migrations
│   ├── models.go        # Data models
│   ├── handlers.go      # HTTP handlers
│   ├── repository.go    # Data access
│   ├── team_client.go   # Team service client
│   └── main.go         # Service entry point
├── docker-compose.yml   # Service orchestration
├── start_services.sh    # Automated startup script
├── test_services.sh     # Integration testing script
└── README.md            # This file
```

## 🔧 Development

### Adding New Features

1. **API Changes**: Update the OpenAPI specification in `api/*.yml`
2. **Models**: Modify data models in `models.go`
3. **Handlers**: Update HTTP handlers in `handlers.go`
4. **Database**: Create new migrations in `migrations/`

### Service Communication

Services communicate via HTTP APIs:
- Task Service → Team Service: Verify team existence and membership
- Task Service → Auth Service: Validate user permissions
- Team Service → Auth Service: Validate user authentication

### Database Migrations

Each service manages its own database:
- Run migrations: `docker compose up [service]-dbmate`
- View database: Use the corresponding phpMyAdmin instance

## 🚨 Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure no other services are using ports 8081, 8083, 8084
2. **Database Connection**: Check if databases are healthy with `docker compose ps`
3. **Service Dependencies**: Services start in order: databases → migrations → services

### Logs

View service logs:
```bash
docker compose logs -f auth-service
docker compose logs -f team-service
docker compose logs -f task-service
```

### Reset Everything

To completely reset the system:
```bash
docker compose down -v --remove-orphans
./start_services.sh
```

## 📚 API Documentation

Each service provides its own API documentation:
- **Auth Service**: http://localhost:8084 (OpenAPI spec in `auth/api/auth.yml`)
- **Team Service**: http://localhost:8083 (OpenAPI spec in `team/api/team.yml`)
- **Task Service**: http://localhost:8081 (OpenAPI spec in `task/api/task.yml`)

## 🔮 Future Enhancements

- [ ] Frontend application
- [ ] Real-time notifications
- [ ] File attachments
- [ ] Advanced permissions
- [ ] Activity logging
- [ ] API rate limiting
- [ ] Monitoring and metrics

## 📄 License

This project is licensed under the MIT License.
