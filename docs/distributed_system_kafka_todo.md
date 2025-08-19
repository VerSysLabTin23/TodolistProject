# Distributed Systems Lab Project: ToDo Application with Kafka

## 1. Background & Motivation

This project is based on our existing **ToDo application** developed in
the **Distributed Systems Lab**. The goal of the lab project is to build
a distributed system, and we are adopting a **microservices
architecture** for the ToDo application.

In this project, we extend the application by integrating **Apache
Kafka** as middleware. Kafka enables **persistence, replay, scalability,
and fault tolerance**, and makes the system more clearly fit the
characteristics of a distributed system. The purpose is not to build a
completely new system but to improve the existing one by adding event
streaming capabilities.

------------------------------------------------------------------------

## 2. Project Scope

-   Build on the existing ToDo application from the lab.
-   Integrate Kafka as the event streaming backbone.
-   Record and expose task history as a persistent log of all changes.
-   *(Optional, if time allows)* add realtime updates via WebSocket for
    live collaboration.

------------------------------------------------------------------------

## 3. Goals / Demo Scenario

We will demonstrate the system with **two users (Alice and Bob)**
working in the same team **"Distributed System"**:

1.  **Alice creates tasks** ("Frontend", "Documentation", "Unit tests")
    →
    Bob's UI shows the tasks **immediately** (with realtime) or after a
    **REST refresh** (minimum).
2.  **Bob updates a task** (status: incomplete → complete) →
    Alice's UI sees the update **immediately** (with realtime) or via
    **REST** (minimum).
3.  **History view**: Both Alice and Bob can open the history page and
    see the full timeline of all changes in their team --- who did what
    and when.

------------------------------------------------------------------------

## 4. Architecture

### Event Contract

**Topic:** `tasks.events` (partitioned by team ID)\
**Event JSON:**

``` json
{
  "eventId": "uuid",
  "type": "task.created | task.updated | task.deleted",
  "taskId": "t-42",
  "teamId": "team-DS",
  "actor": "alice",
  "data":   { "... initial fields on create ..." },
  "changed":{ "... diffs on update ..." },
  "ts": "2025-08-19T18:22:03Z"
}
```

### Components

-   **Existing ToDo Application** → produces events and manages current
    state.
-   **Kafka** → acts as the middleware backbone for event streaming.
-   **History Functionality** → consumes events, persists them, and
    provides history APIs.
-   **(Optional) Realtime Functionality** → consumes events and pushes
    updates to the UI.

------------------------------------------------------------------------

## 5. End-to-End Flows

### Minimum Version (Kafka + History only)

**Flow: Task Creation** 
1. User creates tasks.
2. Application inserts into database and publishes `task.created`
events.
3. History functionality consumes events and writes them into the event
log.
4. Other users refresh the task list and see the new tasks.
5. History page shows the list of created tasks in order.

**Flow: Task Update** 1. User updates a task (e.g. status → "done").
2. Application updates the database and publishes a `task.updated`
event.
3. History functionality logs the update.
4. Other users refresh and see the updated task.
5. History page shows the update in the team timeline.

------------------------------------------------------------------------

### Nice-to-Have Version (Kafka + History + Realtime)

**Flow: Task Creation** 1. User creates tasks.
2. Application publishes `task.created` events.
3. Realtime functionality consumes events and pushes them to connected
clients.
4. Other users' UIs update instantly.
5. History functionality logs the same events.

**Flow: Task Update** 1. User marks a task complete.
2. Application publishes `task.updated`.
3. Realtime functionality pushes the update instantly to other users.
4. Their UIs update without reload.
5. History shows the change in the team timeline.

------------------------------------------------------------------------

## 6. APIs

**History** - `GET /teams/{teamId}/history` → team-level timeline.
- `GET /tasks/{taskId}/history` → per-task timeline.

**Realtime (optional)** - `GET /ws?teamId=team-DS` → WebSocket
connection, authenticated with JWT.

------------------------------------------------------------------------

## 7. Tasks (1 week)

-   **1**: Extend the application to publish Kafka events.
-   **2**: Implement event log storage and history API.
-   **3**: Integrate frontend with history view.
-   **4**: *(Optional)* add realtime updates with WebSocket.
-   **5**: Prepare the presentation and the demo.

------------------------------------------------------------------------

## 7. Acceptance Criteria

-   Application publishes task events to Kafka.
-   History is correctly persisted and accessible through APIs.
-   Frontend can display task lists and history.
-   Demo works with two users (Alice & Bob) collaborating in one team.
-   *(Optional)* Realtime updates work if WebSocket functionality is
    ready.
