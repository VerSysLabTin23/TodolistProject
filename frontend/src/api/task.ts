// src/api/task.ts
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
    // used by UI pages:
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

// === Lists ===

// Cross-team “my tasks” → GET /api/tasks
export async function listMyTasks(): Promise<Task[]> {
    const { data } = await http.get<Task[]>("/tasks");
    return data;
}

// Team tasks → GET /api/tasks/teams/:teamId/tasks
export async function listTasksForTeam(teamId: number): Promise<Task[]> {
    const { data } = await http.get<Task[]>(`/tasks/teams/${teamId}/tasks`);
    return data;
}

// === Create ===

// Create within a team → POST /api/tasks/teams/:teamId/tasks
export async function createTaskInTeam(teamId: number, input: CreateTaskInput): Promise<Task> {
    const { data } = await http.post<Task>(`/tasks/teams/${teamId}/tasks`, input);
    return data;
}

// === Single task ===

// GET /api/tasks/:id
export async function getTask(id: number): Promise<Task> {
    const { data } = await http.get<Task>(`/tasks/${id}`);
    return data;
}

// PUT /api/tasks/:id
export async function updateTask(id: number, patch: Partial<CreateTaskInput> & { completed?: boolean }): Promise<Task> {
    const { data } = await http.put<Task>(`/tasks/${id}`, patch);
    return data;
}

// DELETE /api/tasks/:id
export async function deleteTask(id: number): Promise<void> {
    await http.delete<void>(`/tasks/${id}`);
}

// PUT /api/tasks/:id/assignee
export async function setAssignee(id: number, assigneeId?: number | null): Promise<Task> {
    const { data } = await http.put<Task>(`/tasks/${id}/assignee`, { assigneeId });
    return data;
}

// POST /api/tasks/:id/complete
export async function setCompleted(id: number, completed: boolean): Promise<Task> {
    const { data } = await http.post<Task>(`/tasks/${id}/complete`, { completed });
    return data;
}
