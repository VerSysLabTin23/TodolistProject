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

// Cross-team “my tasks”
export async function listMyTasks(): Promise<Task[]> {
    const { data } = await http.get<Task[]>("/task-api/tasks");
    return data;
}

// Team tasks
export async function listTasksForTeam(teamId: number): Promise<Task[]> {
    const { data } = await http.get<Task[]>(`/task-api/teams/${teamId}/tasks`);
    return data;
}

// Create within a team
export async function createTaskInTeam(teamId: number, input: CreateTaskInput): Promise<Task> {
    const { data } = await http.post<Task>(`/task-api/teams/${teamId}/tasks`, input);
    return data;
}

// Single task
export async function getTask(id: number): Promise<Task> {
    const { data } = await http.get<Task>(`/task-api/tasks/${id}`);
    return data;
}

export async function updateTask(
    id: number,
    patch: Partial<CreateTaskInput> & { completed?: boolean }
): Promise<Task> {
    const { data } = await http.put<Task>(`/task-api/tasks/${id}`, patch);
    return data;
}

export async function deleteTask(id: number): Promise<void> {
    await http.delete<void>(`/task-api/tasks/${id}`);
}

export async function setAssignee(id: number, assigneeId?: number | null): Promise<Task> {
    const { data } = await http.put<Task>(`/task-api/tasks/${id}/assignee`, { assigneeId });
    return data;
}

export async function setCompleted(id: number, completed: boolean): Promise<Task> {
    const { data } = await http.post<Task>(`/task-api/tasks/${id}/complete`, { completed });
    return data;
}
