# Frontend Documentation

## Overview

The frontend of the project is a **React + TypeScript single-page application (SPA)** that provides the user interface for managing tasks, teams, and user accounts. It communicates exclusively with the backend microservices through an **Nginx reverse proxy** that routes `/api/*` requests to the appropriate services.

The main goals of the frontend are:

* Provide a clear **user-friendly interface** for login, registration, and navigation.
* Allow users to **create, update, and manage tasks** inside teams.
* Enable **team management**: creating teams, editing details, and inviting/removing members.
* Support **real-time updates** via WebSockets, so users see changes instantly.
* Respect **roles and permissions** (regular users vs admins).

---

## Technology Stack

* **React (v18)** – component-based UI library.
* **TypeScript** – type safety and maintainability.
* **Vite** – fast development server and bundler.
* **React Router v6** – client-side routing.
* **Axios** – HTTP client with token injection and error handling.
* **WebSocket client** – for real-time task updates.
* **CSS (inline + utility styles)** – simple styling, no external CSS frameworks.

---

## Project Structure

```
frontend/
├── src/
│   ├── api/                # HTTP clients for backend services
│   │   ├── auth.ts
│   │   ├── team.ts
│   │   ├── task.ts
│   │   └── http.ts
│   ├── layouts/            # Shared layout wrappers
│   │   ├── AppLayout.tsx
│   │   └── AuthLayout.tsx
│   ├── pages/              # Page-level components
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── WelcomePage.tsx
│   │   ├── tasks/
│   │   │   ├── TasksPage.tsx
│   │   │   ├── DetailedTaskPage.tsx
│   │   │   └── CompletedPage.tsx
│   │   ├── teams/
│   │   │   ├── TeamsPage.tsx
│   │   │   ├── CreateTeamPage.tsx
│   │   │   ├── TeamTasksPage.tsx
│   │   │   └── TeamsDetailedPage.tsx
│   │   └── admin/
│   │       ├── UsersAdminPage.tsx
│   │       ├── TeamsAdminPage.tsx
│   │       └── TeamAdminDetailPage.tsx
│   ├── realtime/           # WebSocket logic
│   │   ├── ws.ts
│   │   ├── useRealtime.ts
│   │   └── RealtimeRoot.tsx
│   ├── routes/             # Auth guards
│   │   ├── RequireAuth.tsx
│   │   └── RequireAdmin.tsx
│   ├── App.tsx             # Router and app root
│   └── main.tsx            # Entry point
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## API Layer

### `http.ts`

A thin wrapper around Axios.

* Automatically adds **Authorization** header if access token exists.
* Handles JSON encoding/decoding.
* Throws meaningful errors if the backend returns non-2xx responses.

```ts
import axios from "axios";

export const http = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});
```

---

### `auth.ts`

Handles authentication calls to `/api/auth/*`.

* `login(credentials)` – POST /auth/login.
* `register(credentials)` – POST /auth/register.
* Stores access token in `localStorage`.

---

### `team.ts`

Handles team management.

* `createTeam(input)` – create a new team.
* `getTeamById(id)` – fetch team details.
* `listUserTeams(userId)` – get all teams for a given user.
* `listTeamMembers(teamId)` – get members of a team.
* `updateTeam(id, patch)` – change team name/description.
* `deleteTeam(id)` – delete a team.
* `adminAddMember(teamId, userId, role)` – add user by ID.
* `adminRemoveMember(teamId, userId)` – remove member.

---

### `task.ts`

Handles task CRUD.

* `listMyTasks()` – list all tasks assigned to current user.
* `listTasksForTeam(teamId)` – list all tasks in a team.
* `createTaskInTeam(teamId, input)` – create new task.
* `getTask(id)` – fetch single task.
* `updateTask(id, patch)` – update fields of a task.
* `deleteTask(id)` – delete a task.
* `setAssignee(id, userId)` – assign task to member.
* `setCompleted(id, completed)` – mark task done/undone.

---

## Pages

### 1. Authentication

* **LoginPage** – login form, saves token, redirects to `/welcome`.
* **RegisterPage** – create new account.
* **WelcomePage** – greeting page after login.

### 2. Teams

* **TeamsPage** – lists all teams the user is part of.
* **CreateTeamPage** – create a new team.
* **TeamTasksPage** – main view inside a team: task list, create tasks.
* **TeamsDetailedPage** – management view: rename team, delete, invite/remove members.

### 3. Tasks

* **TasksPage** – personal task list (“My Tasks”).
* **DetailedTaskPage** – detailed editing of one task.
* **CompletedPage** – view completed tasks.

### 4. Admin

* **UsersAdminPage** – list all users.
* **TeamsAdminPage** – list all teams.
* **TeamAdminDetailPage** – inspect a team as admin.

---

## Routing

The router is defined in `App.tsx` with React Router v6.

* `/` → Login page.
* `/register` → Register page.
* `/welcome` → Welcome dashboard.
* `/teams` → List of teams.
* `/teams/new` → Create new team.
* `/teams/:id` → Team tasks.
* `/teams/:id/manage` → Manage team (members, settings).
* `/tasks` → My tasks.
* `/tasks/:id` → Detailed task view.
* `/completed` → Completed tasks.
* `/admin/*` → Admin-only pages.

Auth guards:

* `RequireAuth` ensures token is set.
* `RequireAdmin` ensures user has admin role.

---

## Real-Time Updates

Implemented via WebSockets:

* Client connects to `/ws` after login.
* Subscribes to events such as:

    * `task.created`
    * `task.updated`
    * `task.deleted`
    * `task.completed`
* The UI updates automatically without page reload.

---

## UI/UX Principles

* **Minimalistic design**: clean forms, simple buttons, focus on functionality.
* **Error handling**: API errors are shown in red text.
* **Optimistic updates**: UI updates immediately, then confirmed by WebSocket.
* **Accessibility**: semantic HTML with labels.

---

## Common Issues Encountered

* **API mismatches**: frontend expected username invites, backend required numeric IDs.
* **Nginx rewrites**: misrouted `/api/tasks/*` caused 400/405 errors.
* **Strict backend validation**: required exact JSON shape.
* **CI/CD build failures**: Docker context paths and TypeScript compile errors.
* **Time pressure**: integration of multiple microservices was complex.

---

## Lessons Learned

* Always document backend API contracts clearly.
* Keep Nginx configuration minimal to avoid rewrite errors.
* TypeScript is powerful, but requires strict consistency in imports.
* Debugging distributed systems under time pressure is difficult — logging and monitoring are crucial.
* Start integration testing earlier to catch mismatches sooner.

---

## Future Improvements

1. **Better Error Messages** – expose validation errors from backend to help debugging.
2. **Consistent API** – unify invite endpoints (username + ID).
3. **CI/CD Stability** – pre-build TypeScript before Docker build to avoid surprises.
4. **Improved UI** – add search, sorting, and filtering for tasks.
5. **Testing** – unit tests for components, integration tests for API layer.

---

## Conclusion

The frontend demonstrates a **working multi-service React application** that connects to several backend services via Nginx. Despite unresolved issues, the architecture is extensible and provides a clear separation of concerns.

The project highlights both the **strengths of modern SPA development** and the **challenges of microservice integration under real-world constraints**.

\newpage
