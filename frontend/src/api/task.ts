// Task API client
//
// This module encapsulates all HTTP calls to the Task service via the shared
// Axios client (`http`). The `http` baseURL is "/api", and Nginx rewrites:
// - /api/tasks               → task-service /tasks
// - /api/tasks/teams/:id/... → task-service /teams/:id/...
//
// It also includes defensive helpers to normalize list responses coming from
// different shapes (array, {data: [...]}, {tasks: [...]}, etc.).

import { http } from "./http";

/** Canonical shape of a Task in the app. */
export type Task = {
    id: number;
    teamId: number;
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high";
    due?: string;
    assigneeId?: number | null;
    completed: boolean;
    createdAt?: string;
    updatedAt?: string;
};

/** Payload to create or update a task. All fields optional except title on create. */
export type CreateTaskInput = {
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high";
    due?: string;
    assigneeId?: number | null;
};

/* ---------- response-shape helpers ---------- */

type UnknownRecord = Record<string, unknown>;

/** Runtime type-guard: does this look like a Task object? */
function isTaskLike(x: unknown): x is Task {
    if (!x || typeof x !== "object") return false;
    const r = x as UnknownRecord;
    return typeof r["id"] === "number" && typeof r["teamId"] === "number" && typeof r["title"] === "string";
}

/** Runtime type-guard: is this an array of Task-like objects? */
function isTaskArray(x: unknown): x is Task[] {
    return Array.isArray(x) && x.every(isTaskLike);
}

/** Try to pluck an array from a known key of an envelope object. */
function pickArrayKey(obj: unknown, key: string): Task[] | null {
    if (!obj || typeof obj !== "object") return null;
    const v = (obj as UnknownRecord)[key];
    return isTaskArray(v) ? v : null;
}

/** Detect obvious HTML (SPA fallback) returned by the proxy on a bad path. */
function looksLikeHtml(payload: unknown): boolean {
    return typeof payload === "string" && /<!DOCTYPE html|<html/i.test(payload);
}

/**
 * Normalize a list response so callers can always get Task[].
 * Supports: Task[], {tasks: [...]}, {data: [...]}, {items: [...]}
 * Throws when the server accidentally returned index.html (proxy fallback).
 */
function unwrapList(payload: unknown): Task[] {
    if (isTaskArray(payload)) return payload;
    const t = pickArrayKey(payload, "tasks"); if (t) return t;
    const d = pickArrayKey(payload, "data");  if (d) return d;
    const i = pickArrayKey(payload, "items"); if (i) return i;
    if (looksLikeHtml(payload)) {
        throw new Error(
            "Task API returned HTML (proxy fallback) – your request hit the SPA instead of the API. Check the request path and Nginx routes."
        );
    }
    throw new Error("Task API returned unexpected shape.");
}

/* ---------- Lists ---------- */

/** Cross-team “My tasks” view. GET /api/tasks */
export async function listMyTasks(): Promise<Task[]> {
    // http baseURL is "/api", so "/tasks" → "/api/tasks"
    const { data } = await http.get("/tasks");
    return unwrapList(data);
}

/** Team-scoped tasks. GET /api/tasks/teams/:teamId/tasks */
export async function listTasksForTeam(teamId: number): Promise<Task[]> {
    const { data } = await http.get(`/tasks/teams/${teamId}/tasks`);
    return unwrapList(data);
}

/* ---------- Create ---------- */

/**
 * Create a task within a team. POST /api/tasks/teams/:teamId/tasks
 * Only send defined fields; keep payload clean. Title is required.
 */
export async function createTaskInTeam(
    teamId: number,
    input: CreateTaskInput
): Promise<Task> {
    const payload: Record<string, unknown> = {
        title: (input.title ?? "").trim(),
    };
    if (!payload.title) throw new Error("Title is required");

    if (input.description) payload.description = input.description;
    if (input.priority) payload.priority = input.priority;
    if (input.due) payload.due = input.due; // expected format: YYYY-MM-DD
    if (typeof input.assigneeId === "number") payload.assigneeId = input.assigneeId;

    const { data } = await http.post<Task>(`/tasks/teams/${teamId}/tasks`, payload);
    return data;
}

/* ---------- Single task ---------- */

/** GET /api/tasks/:id */
export async function getTask(id: number): Promise<Task> {
    const { data } = await http.get<Task>(`/tasks/${id}`);
    return data;
}

/** PUT /api/tasks/:id -- general update (title/description/priority/due/completed) */
export async function updateTask(
    id: number,
    patch: Partial<CreateTaskInput> & { completed?: boolean }
): Promise<Task> {
    const { data } = await http.put<Task>(`/tasks/${id}`, patch);
    return data;
}

/** DELETE /api/tasks/:id */
export async function deleteTask(id: number): Promise<void> {
    await http.delete<void>(`/tasks/${id}`);
}

/** PUT /api/tasks/:id/assignee { assigneeId } */
export async function setAssignee(id: number, assigneeId?: number | null): Promise<Task> {
    const { data } = await http.put<Task>(`/tasks/${id}/assignee`, { assigneeId });
    return data;
}

/** POST /api/tasks/:id/complete { completed } */
export async function setCompleted(id: number, completed: boolean): Promise<Task> {
    const { data } = await http.post<Task>(`/tasks/${id}/complete`, { completed });
    return data;
}
