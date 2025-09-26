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

// --- helpers -------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null;
}

function pickArrayProp<T = unknown>(obj: unknown, key: string): T[] | undefined {
    if (!isRecord(obj)) return undefined;
    const value = obj[key];
    return Array.isArray(value) ? (value as T[]) : undefined;
}

function unwrapList(payload: unknown): Task[] {
    // bare array
    if (Array.isArray(payload)) return payload as Task[];

    // common wrappers: {tasks: [...]}, {data: [...]}, {items: [...]}
    const fromTasks = pickArrayProp<Task>(payload, "tasks");
    if (fromTasks) return fromTasks;

    const fromData = pickArrayProp<Task>(payload, "data");
    if (fromData) return fromData;

    const fromItems = pickArrayProp<Task>(payload, "items");
    if (fromItems) return fromItems;

    // accidental SPA fallback (HTML instead of JSON)
    if (typeof payload === "string" && payload.includes("<!DOCTYPE html")) {
        throw new Error("Task API returned HTML (proxy fallback) – check the path prefix.");
    }

    throw new Error("Task API returned unexpected shape.");
}
// --- Lists ---------------------------------------------------------

// Cross-team “my tasks”  → GET /api/tasks
export async function listMyTasks(): Promise<Task[]> {
    const { data } = await http.get("/api/tasks");
    return unwrapList(data);
}

// Team tasks → GET /api/tasks/teams/:teamId/tasks
export async function listTasksForTeam(teamId: number): Promise<Task[]> {
    const { data } = await http.get(`/api/tasks/teams/${teamId}/tasks`);
    return unwrapList(data);
}

// --- Create --------------------------------------------------------

export async function createTaskInTeam(teamId: number, input: CreateTaskInput): Promise<Task> {
    const { data } = await http.post<Task>(`/api/tasks/teams/${teamId}/tasks`, input);
    return data;
}

// --- Single task ---------------------------------------------------

export async function getTask(id: number): Promise<Task> {
    const { data } = await http.get<Task>(`/api/tasks/${id}`);
    return data;
}

export async function updateTask(
    id: number,
    patch: Partial<CreateTaskInput> & { completed?: boolean }
): Promise<Task> {
    const { data } = await http.put<Task>(`/api/tasks/${id}`, patch);
    return data;
}

export async function deleteTask(id: number): Promise<void> {
    await http.delete<void>(`/api/tasks/${id}`);
}

export async function setAssignee(id: number, assigneeId?: number | null): Promise<Task> {
    const { data } = await http.put<Task>(`/api/tasks/${id}/assignee`, { assigneeId });
    return data;
}

export async function setCompleted(id: number, completed: boolean): Promise<Task> {
    const { data } = await http.post<Task>(`/api/tasks/${id}/complete`, { completed });
    return data;
}
