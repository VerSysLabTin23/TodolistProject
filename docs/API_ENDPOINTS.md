## API Endpoints Overview

This document lists all current HTTP endpoints across the Auth, Team, and Task services, with auth requirements and sample curl commands.

- Base URLs:
  - Auth: http://localhost:8084
  - Team: http://localhost:8083
  - Task: http://localhost:8081
- Unless noted, endpoints return JSON. Most endpoints require Authorization: Bearer <accessToken>.

### Auth Service (localhost:8084)

- Health
  - GET /healthz
    - curl: `curl -sS http://localhost:8084/healthz`

- Authentication
  - POST /auth/register
    - Body: { username, email, password, firstName?, lastName? }
    - curl:
      ```bash
      curl -sS -X POST http://localhost:8084/auth/register \
        -H 'Content-Type: application/json' \
        -d '{"username":"newuser","email":"new@example.com","password":"password"}'
      ```
  - POST /auth/login
    - Body: { username, password }
    - curl:
      ```bash
      curl -sS -X POST http://localhost:8084/auth/login \
        -H 'Content-Type: application/json' \
        -d '{"username":"admin","password":"password"}'
      ```
  - POST /auth/refresh
    - Body: { refreshToken }
    - curl:
      ```bash
      curl -sS -X POST http://localhost:8084/auth/refresh \
        -H 'Content-Type: application/json' \
        -d '{"refreshToken":"$REFRESH"}'
      ```
  - POST /auth/logout
    - Auth required
    - curl: `curl -sS -X POST http://localhost:8084/auth/logout -H "Authorization: Bearer $ACCESS"`

- Token validation (internal utility)
  - POST /validate
    - Auth required; returns `{ valid: true, user: { id, username, role } }` if token is valid
    - curl: `curl -sS -X POST http://localhost:8084/validate -H "Authorization: Bearer $ACCESS"`

- Users
  - GET /users
    - List users (typically admin). Query: q, limit, offset
    - curl: `curl -sS http://localhost:8084/users -H "Authorization: Bearer $ACCESS"`
  - POST /users
    - Create user (admin). Body: { username, email, password, firstName?, lastName?, role }
    - curl:
      ```bash
      curl -sS -X POST http://localhost:8084/users \
        -H "Authorization: Bearer $ACCESS" -H 'Content-Type: application/json' \
        -d '{"username":"alice","email":"alice@example.com","password":"password","role":"user"}'
      ```
  - GET /users/{id}
    - Get by ID
    - curl: `curl -sS http://localhost:8084/users/1 -H "Authorization: Bearer $ACCESS"`
  - PUT /users/{id}
    - Update fields. Body: any subset of { username, email, firstName, lastName, role, isActive }
    - curl:
      ```bash
      curl -sS -X PUT http://localhost:8084/users/1 \
        -H "Authorization: Bearer $ACCESS" -H 'Content-Type: application/json' \
        -d '{"firstName":"Admin","lastName":"User"}'
      ```
  - DELETE /users/{id}
    - Delete user (admin)
    - curl: `curl -sS -X DELETE http://localhost:8084/users/5 -H "Authorization: Bearer $ACCESS"`
  - GET /users/profile
    - Current user profile
    - curl: `curl -sS http://localhost:8084/users/profile -H "Authorization: Bearer $ACCESS"`
  - PUT /users/profile
    - Update current user profile. Body: { firstName?, lastName?, email? }
    - curl:
      ```bash
      curl -sS -X PUT http://localhost:8084/users/profile \
        -H "Authorization: Bearer $ACCESS" -H 'Content-Type: application/json' \
        -d '{"firstName":"Admin","lastName":"User"}'
      ```
  - POST /users/change-password
    - Body: { currentPassword, newPassword }
    - curl:
      ```bash
      curl -sS -X POST http://localhost:8084/users/change-password \
        -H "Authorization: Bearer $ACCESS" -H 'Content-Type: application/json' \
        -d '{"currentPassword":"password","newPassword":"password123"}'
      ```

### Team Service (localhost:8083)

- Health
  - GET /healthz
    - curl: `curl -sS http://localhost:8083/healthz`

- Teams
  - GET /teams
    - Query: q, limit, offset
    - curl: `curl -sS http://localhost:8083/teams`
  - POST /teams
    - Body: { name, description? }
    - curl:
      ```bash
      curl -sS -X POST http://localhost:8083/teams \
        -H 'Content-Type: application/json' \
        -d '{"name":"Dev Team","description":"Main team"}'
      ```
  - GET /teams/{id}
    - Get team by ID
    - curl: `curl -sS http://localhost:8083/teams/1`
  - PUT /teams/{id}
    - Requires membership/owner (per middleware). Body: { name?, description? }
    - curl:
      ```bash
      curl -sS -X PUT http://localhost:8083/teams/1 \
        -H 'Content-Type: application/json' \
        -d '{"name":"New Name"}'
      ```
  - DELETE /teams/{id}
    - Requires owner
    - curl: `curl -sS -X DELETE http://localhost:8083/teams/1`

- Team Members
  - GET /teams/{id}/members
    - List members
    - curl: `curl -sS http://localhost:8083/teams/1/members`
  - POST /teams/{id}/members
    - Add member. Body: { userId, role }
    - curl:
      ```bash
      curl -sS -X POST http://localhost:8083/teams/1/members \
        -H 'Content-Type: application/json' \
        -d '{"userId":5,"role":"member"}'
      ```
  - DELETE /teams/{id}/members/{userId}
    - Remove member
    - curl: `curl -sS -X DELETE http://localhost:8083/teams/1/members/5`

- Users → Teams
  - GET /users/{userId}/teams
    - List teams the user belongs to
    - curl: `curl -sS http://localhost:8083/users/1/teams`

### Task Service (localhost:8081)

- Health
  - GET /healthz
    - curl: `curl -sS http://localhost:8081/healthz`

- Team-scoped tasks
  - GET /teams/{teamId}/tasks
    - Query: completed?, priority?, assigneeId?, q?, limit?, offset?
    - Auth required
    - curl: `curl -sS -H "Authorization: Bearer $ACCESS" "http://localhost:8081/teams/1/tasks?priority=high&limit=10"`
  - POST /teams/{teamId}/tasks
    - Body: { title, priority, due, description?, assigneeId? }
    - Auth required
    - curl:
      ```bash
      curl -sS -X POST http://localhost:8081/teams/1/tasks \
        -H "Authorization: Bearer $ACCESS" -H 'Content-Type: application/json' \
        -d '{"title":"Write docs","priority":"medium","due":"2025-08-30"}'
      ```

- Cross-team listing
  - GET /tasks
    - Query: teamId?, completed?, priority?, assigneeId?, q?, limit?, offset?
    - Auth required
    - curl: `curl -sS -H "Authorization: Bearer $ACCESS" http://localhost:8081/tasks`

- Single task
  - GET /tasks/{id}
    - Auth required
    - curl: `curl -sS -H "Authorization: Bearer $ACCESS" http://localhost:8081/tasks/1`
  - PUT /tasks/{id}
    - Body: any subset of { title, description, completed, priority, due, assigneeId }
    - Auth required
    - curl:
      ```bash
      curl -sS -X PUT http://localhost:8081/tasks/1 \
        -H "Authorization: Bearer $ACCESS" -H 'Content-Type: application/json' \
        -d '{"completed":true,"priority":"high"}'
      ```
  - DELETE /tasks/{id}
    - Auth required
    - curl: `curl -sS -X DELETE -H "Authorization: Bearer $ACCESS" http://localhost:8081/tasks/1`

- Sub-resources
  - PUT /tasks/{id}/assignee
    - Body: { assigneeId: number|null }
    - Auth required
    - curl:
      ```bash
      curl -sS -X PUT http://localhost:8081/tasks/1/assignee \
        -H "Authorization: Bearer $ACCESS" -H 'Content-Type: application/json' \
        -d '{"assigneeId":5}'
      ```
  - POST /tasks/{id}/complete
    - Body: { completed: boolean }
    - Auth required
    - curl:
      ```bash
      curl -sS -X POST http://localhost:8081/tasks/1/complete \
        -H "Authorization: Bearer $ACCESS" -H 'Content-Type: application/json' \
        -d '{"completed":true}'
      ```

---

Notes
- Replace `$ACCESS`/`$REFRESH` with real tokens from the Auth login/refresh responses.
- Error responses follow `{ code, message }` shape across services.


