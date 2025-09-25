/**
 * HTTP client for the Team service.
 * Vite proxy: '/team-api' -> http://localhost:8083
 * Sends Authorization header (JWT) if present.
 */

export type TeamRole = "owner" | "admin" | "member";

export type CreateTeamInput = {
    name: string;
    description?: string;
};

export type Team = {
    id: number;
    name: string;
    description?: string;
};

export type TeamMember = {
    id: number;            // userId
    username: string;
    role: TeamRole;
};

function getAccessToken(): string {
    return localStorage.getItem("accessToken") ?? "";
}

async function authFetch(url: string, init?: RequestInit) {
    const token = getAccessToken();
    const headers = new Headers(init?.headers);

    if (token) headers.set("Authorization", `Bearer ${token}`);
    headers.set("Accept", "application/json");
    if (!(init?.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }

    const res = await fetch(url, { ...init, headers });
    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText} ${txt}`);
    }
    return res;
}

const TEAM_API = "/team-api";

/* ----------------- Mutations ----------------- */

// Create a team
export async function createTeam(input: CreateTeamInput): Promise<Team> {
    const res = await authFetch(`${TEAM_API}/teams`, {
        method: "POST",
        body: JSON.stringify(input),
    });
    return res.json() as Promise<Team>;
}

// Add a member (useful to assert the creator as 'owner' if backend didn’t)
export async function addMember(
    teamId: number,
    userId: number,
    role: TeamRole
): Promise<TeamMember> {
    const res = await authFetch(`${TEAM_API}/teams/${teamId}/members`, {
        method: "POST",
        body: JSON.stringify({ userId, role }),
    });
    return res.json() as Promise<TeamMember>;
}

// Invite by username (optional helper)
export async function inviteByUsername(
    teamId: number,
    username: string,
    role: TeamRole = "member"
): Promise<TeamMember> {
    const res = await authFetch(`${TEAM_API}/teams/${teamId}/members/invite`, {
        method: "POST",
        body: JSON.stringify({ username, role }),
    });
    return res.json() as Promise<TeamMember>;
}

/* ----------------- Queries ----------------- */

// A user’s teams
export async function listUserTeams(userId: number): Promise<Team[]> {
    const res = await authFetch(`${TEAM_API}/users/${userId}/teams`);
    return res.json() as Promise<Team[]>;
}

// Team by id
export async function getTeamById(teamId: number): Promise<Team> {
    const res = await authFetch(`${TEAM_API}/teams/${teamId}`);
    return res.json() as Promise<Team>;
}

// Members of a team
export async function listTeamMembers(teamId: number): Promise<TeamMember[]> {
    const res = await authFetch(`${TEAM_API}/teams/${teamId}/members`);
    return res.json() as Promise<TeamMember[]>;
}
