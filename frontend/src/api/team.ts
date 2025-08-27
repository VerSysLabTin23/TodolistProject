import axios from "axios";

/**
 * Axios client for the Team service.
 * Uses Vite proxy: '/team-api' -> http://localhost:8083
 * Sends Authorization header (JWT) if present.
 */
const teamBaseURL = import.meta.env.VITE_TEAM_API_BASE_URL ?? "/team-api";

const httpTeam = axios.create({ baseURL: teamBaseURL });
httpTeam.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export interface Team {
    id: number;
    name: string;
    description?: string;
    ownerId?: number;
    createdAt?: string;
    updatedAt?: string;
}

/**
 * Returns teams for a given user.
 * Matches backend route: GET /users/:userId/teams
 */
export async function listUserTeams(userId: number): Promise<Team[]> {
    const { data } = await httpTeam.get<Team[]>(`/users/${userId}/teams`);
    return data;
}
export async function getTeamById(teamId: number): Promise<Team> {
    const { data } = await httpTeam.get<Team>(`/teams/${teamId}`);
    return data;
}
