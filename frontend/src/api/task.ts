import axios from "axios";

const httpTask = axios.create({
    baseURL: import.meta.env.VITE_TASK_API_BASE_URL ?? "/task-api",
});
httpTask.interceptors.request.use((c) => {
    const t = localStorage.getItem("accessToken");
    if (t) c.headers.Authorization = `Bearer ${t}`;
    return c;
});

export type Task = {
    id: number; teamId: number; title: string;
    description?: string; priority?: "low"|"medium"|"high";
    due?: string; assigneeId?: number; completed?: boolean;
    createdAt?: string; updatedAt?: string;
};

export async function listMyTasks(): Promise<Task[]> {
    const { data } = await httpTask.get<Task[]>("/tasks"); // aggregate
    return data;
}
export async function listTasksForTeam(teamId: number): Promise<Task[]> {
    const { data } = await httpTask.get<Task[]>(`/teams/${teamId}/tasks`);
    return data;
}
export async function createTaskInTeam(teamId: number, body: {
    title: string; description?: string; priority: "low"|"medium"|"high"; due: string; assigneeId?: number;
}): Promise<Task> {
    const { data } = await httpTask.post<Task>(`/teams/${teamId}/tasks`, body);
    return data;
}
export async function updateTask(id: number, body: Partial<{
    title: string; description?: string; completed: boolean;
    priority: "low"|"medium"|"high"; due: string; assigneeId?: number|null;
}>): Promise<Task> {
    const { data } = await httpTask.put<Task>(`/tasks/${id}`, body);
    return data;
}
export async function deleteTask(id: number): Promise<void> {
    await httpTask.delete(`/tasks/${id}`);
}
export async function setAssignee(id: number, assigneeId?: number|null): Promise<Task> {
    const { data } = await httpTask.put<Task>(`/tasks/${id}/assignee`, { assigneeId });
    return data;
}
export async function setCompleted(id: number, completed: boolean): Promise<Task> {
    const { data } = await httpTask.post<Task>(`/tasks/${id}/complete`, { completed });
    return data;
}
export async function getTask(id: number): Promise<Task> {
    const { data } = await httpTask.get<Task>(`/tasks/${id}`);
    return data;
}
