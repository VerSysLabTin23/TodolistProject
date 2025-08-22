import axios from "axios";

/**
 * Axios client for the Task service.
 * Uses Vite proxy: '/task-api' -> http://localhost:8081
 * Sends Authorization header (JWT) if present.
 */
const taskBaseURL = import.meta.env.VITE_TASK_API_BASE_URL ?? "/task-api";

const httpTask = axios.create({ baseURL: taskBaseURL });
httpTask.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export interface Task {
    id: number;
    teamId: number;
    title: string;
    description?: string;
    // Adjust these if your backend names differ
    priority?: "low" | "medium" | "high";
    due?: string;              // "YYYY-MM-DD"
    assigneeId?: number;
    completed?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

/**
 * Lists tasks for a team (backend checks membership).
 * Matches backend route: GET /teams/:teamId/tasks
 */
export async function listTasksForTeam(teamId: number): Promise<Task[]> {
    const { data } = await httpTask.get<Task[]>(`/teams/${teamId}/tasks`);
    return data;
}
