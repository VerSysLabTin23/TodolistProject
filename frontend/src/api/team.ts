/**
 * HTTP client for the Team service.
 * Vite proxy: '/team-api' -> http://localhost:8083
 * Sends Authorization header (JWT) if present.
 */

export type TeamRole = "OWNER" | "ADMIN" | "MEMBER";

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
    id: number;          // userId
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
/* -------- Mutations -------- */

export async function createTeam(input: CreateTeamInput): Promise<Team> {
    const res = await authFetch(`${TEAM_API}/teams`, {
        method: "POST",
        body: JSON.stringify(input),
    });
    return res.json() as Promise<Team>;
}

export async function addMember(
    teamId: number,
    userId: number,
    role: TeamRole
): Promise<TeamMember> {
    const res = await authFetch(`${TEAM_API}/teams/${teamId}/members`, {
        method: "POST",
        body: JSON.stringify({ userId, role }), // role must be upper-case
    });
    return res.json() as Promise<TeamMember>;
}

export async function inviteByUsername(
    teamId: number,
    username: string,
    role: TeamRole = "MEMBER"
): Promise<TeamMember> {
    const res = await authFetch(`${TEAM_API}/teams/${teamId}/members/invite`, {
        method: "POST",
        body: JSON.stringify({ username, role }),
    });
    return res.json() as Promise<TeamMember>;
}

/* -------- Queries -------- */

export async function listUserTeams(userId: number): Promise<Team[]> {
    const res = await authFetch(`${TEAM_API}/users/${userId}/teams`);
    return res.json() as Promise<Team[]>;
}

export async function getTeamById(teamId: number): Promise<Team> {
    const res = await authFetch(`${TEAM_API}/teams/${teamId}`);
    return res.json() as Promise<Team>;
}

export async function listTeamMembers(teamId: number): Promise<TeamMember[]> {
    const res = await authFetch(`${TEAM_API}/teams/${teamId}/members`);
    return res.json() as Promise<TeamMember[]>;
}

export type TeamPatch = {
    name?: string;
    description?: string;
};

/** ADMIN: list all teams (not just those of the current user) */
export async function adminListAllTeams(): Promise<Team[]> {
    const res = await authFetch(`${TEAM_API}/teams`);
    return res.json() as Promise<Team[]>;
}

/** ADMIN: update team (name/description) */
export async function adminUpdateTeam(teamId: number, patch: TeamPatch): Promise<Team> {
    const res = await authFetch(`${TEAM_API}/teams/${teamId}`, {
        method: "PUT",
        body: JSON.stringify(patch),
    });
    return res.json() as Promise<Team>;
}

/** ADMIN: add member with role */
export async function adminAddMember(teamId: number, userId: number, role: TeamRole): Promise<TeamMember> {
    const res = await authFetch(`${TEAM_API}/teams/${teamId}/members`, {
        method: "POST",
        body: JSON.stringify({ userId, role }),
    });
    return res.json() as Promise<TeamMember>;
}

/** ADMIN: remove member */
export async function adminRemoveMember(teamId: number, userId: number): Promise<void> {
    await authFetch(`${TEAM_API}/teams/${teamId}/members/${userId}`, {
        method: "DELETE",
    });
}

/** ADMIN: (optional) change member role */
export async function adminSetMemberRole(teamId: number, userId: number, role: TeamRole): Promise<TeamMember> {
    const res = await authFetch(`${TEAM_API}/teams/${teamId}/members/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
    });
    return res.json() as Promise<TeamMember>;
}
