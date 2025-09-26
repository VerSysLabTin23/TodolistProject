// frontend/src/api/task.ts
import { http } from "./http";

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

export type CreateTaskInput = {
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high";
    due?: string;
    assigneeId?: number | null;
};

/* ---------- helpers (unchanged) ---------- */
type UnknownRecord = Record<string, unknown>;
function isTaskLike(x: unknown): x is Task {
    if (!x || typeof x !== "object") return false;
    const r = x as UnknownRecord;
    return typeof r["id"] === "number" && typeof r["teamId"] === "number" && typeof r["title"] === "string";
}
function isTaskArray(x: unknown): x is Task[] { return Array.isArray(x) && x.every(isTaskLike); }
function pickArrayKey(obj: unknown, key: string): Task[] | null {
    if (!obj || typeof obj !== "object") return null;
    const v = (obj as UnknownRecord)[key];
    return isTaskArray(v) ? v : null;
}
function looksLikeHtml(payload: unknown): boolean { return typeof payload === "string" && /<!DOCTYPE html|<html/i.test(payload); }
function unwrapList(payload: unknown): Task[] {
    if (isTaskArray(payload)) return payload;
    const t = pickArrayKey(payload, "tasks"); if (t) return t;
    const d = pickArrayKey(payload, "data");  if (d) return d;
    const i = pickArrayKey(payload, "items"); if (i) return i;
    if (looksLikeHtml(payload)) throw new Error("Task API returned HTML (proxy fallback) – your request hit the SPA instead of the API. Check the request path and Nginx routes.");
    throw new Error("Task API returned unexpected shape.");
}

/* ---------- Lists ---------- */

// Cross-team “my tasks” → GET /api/tasks
export async function listMyTasks(): Promise<Task[]> {
    const { data } = await http.get("/tasks");        // baseURL '/api' → '/api/tasks'
    return unwrapList(data);
}

// Team tasks → GET /api/tasks/teams/:teamId/tasks
export async function listTasksForTeam(teamId: number): Promise<Task[]> {
    const { data } = await http.get(`/tasks/teams/${teamId}/tasks`);
    return unwrapList(data);
}

/* ---------- Create ---------- */

// export async function createTaskInTeam(teamId: number, input: CreateTaskInput): Promise<Task> {
//     const { data } = await http.post<Task>(`/tasks/teams/${teamId}/tasks`, input);
//     return data;
// }
export async function createTaskInTeam(
    teamId: number,
    input: CreateTaskInput
): Promise<Task> {
    // Build payload with only defined values and include teamId.
    const payload: Record<string, unknown> = {
        teamId,
        title: (input.title || "").trim(),
    };
    if (!payload.title) throw new Error("Title is required");

    if (input.description) payload.description = input.description;
    if (input.priority) payload.priority = input.priority;
    if (input.due) payload.due = input.due; // must be YYYY-MM-DD if used
    if (typeof input.assigneeId === "number") payload.assigneeId = input.assigneeId;

    const { data } = await http.post<Task>(`/api/tasks/teams/${teamId}/tasks`, payload);
    return data;
}

/* ---------- Single task ---------- */

export async function getTask(id: number): Promise<Task> {
    const { data } = await http.get<Task>(`/tasks/${id}`);
    return data;
}

export async function updateTask(id: number, patch: Partial<CreateTaskInput> & { completed?: boolean }): Promise<Task> {
    const { data } = await http.put<Task>(`/tasks/${id}`, patch);
    return data;
}

export async function deleteTask(id: number): Promise<void> {
    await http.delete<void>(`/tasks/${id}`);
}

export async function setAssignee(id: number, assigneeId?: number | null): Promise<Task> {
    const { data } = await http.put<Task>(`/tasks/${id}/assignee`, { assigneeId });
    return data;
}

export async function setCompleted(id: number, completed: boolean): Promise<Task> {
    const { data } = await http.post<Task>(`/tasks/${id}/complete`, { completed });
    return data;
}
