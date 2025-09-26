// frontend/src/api/team.ts
/**
 * HTTP client for the Team service via the Nginx gateway.
 * - /api/teams/...  -> team-service:8083/teams/...
 * - /api/users/...  -> team-service:8083/users/...
 */

export type TeamRole = "OWNER" | "ADMIN" | "MEMBER";

export type CreateTeamInput = { name: string; description?: string };
export type Team = { id: number; name: string; description?: string };
export type TeamMember = { id: number; username: string; role: TeamRole };

function getAccessToken(): string {
    return localStorage.getItem("accessToken") ?? "";
}

async function authFetch(url: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    headers.set("Accept", "application/json");
    if (!(init?.body instanceof FormData)) headers.set("Content-Type", "application/json");

    const res = await fetch(url, { ...init, headers });
    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText} ${txt}`);
    }
    return res;
}

const API = "/api";

/* -------- Mutations -------- */
export async function createTeam(input: CreateTeamInput): Promise<Team> {
    const res = await authFetch(`${API}/teams`, { method: "POST", body: JSON.stringify(input) });
    return res.json() as Promise<Team>;
}

export async function addMember(teamId: number, userId: number, role: TeamRole): Promise<TeamMember> {
    const res = await authFetch(`${API}/teams/${teamId}/members`, {
        method: "POST",
        body: JSON.stringify({ userId, role }),
    });
    return res.json() as Promise<TeamMember>;
}

// export async function inviteByUsername(teamId: number, username: string, role: TeamRole = "MEMBER"): Promise<TeamMember> {
//     const res = await authFetch(`${API}/teams/${teamId}/members/invite`, {
//         method: "POST",
//         body: JSON.stringify({ username, role }),
//     });
//     return res.json() as Promise<TeamMember>;
// }

/* -------- Queries -------- */
export async function listUserTeams(userId: number): Promise<Team[]> {
    // IMPORTANT: user-team listing is under /api/users/..., not /api/teams/users/...
    const res = await authFetch(`${API}/users/${userId}/teams`);
    return res.json() as Promise<Team[]>;
}

export async function getTeamById(teamId: number): Promise<Team> {
    const res = await authFetch(`${API}/teams/${teamId}`);
    return res.json() as Promise<Team>;
}

export async function listTeamMembers(teamId: number): Promise<TeamMember[]> {
    const res = await authFetch(`${API}/teams/${teamId}/members`);
    return res.json() as Promise<TeamMember[]>;
}

export type TeamPatch = { name?: string; description?: string };

export async function adminListAllTeams(): Promise<Team[]> {
    const res = await authFetch(`${API}/teams`);
    return res.json() as Promise<Team[]>;
}

export async function adminUpdateTeam(teamId: number, patch: TeamPatch): Promise<Team> {
    const res = await authFetch(`${API}/teams/${teamId}`, { method: "PUT", body: JSON.stringify(patch) });
    return res.json() as Promise<Team>;
}

export async function adminAddMember(teamId: number, userId: number, role: TeamRole): Promise<TeamMember> {
    const res = await authFetch(`${API}/teams/${teamId}/members`, {
        method: "POST",
        body: JSON.stringify({ userId, role }),
    });
    return res.json() as Promise<TeamMember>;
}

export async function adminRemoveMember(teamId: number, userId: number): Promise<void> {
    await authFetch(`${API}/teams/${teamId}/members/${userId}`, { method: "DELETE" });
}

export async function adminSetMemberRole(teamId: number, userId: number, role: TeamRole): Promise<TeamMember> {
    const res = await authFetch(`${API}/teams/${teamId}/members/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
    });
    return res.json() as Promise<TeamMember>;
}

export async function updateTeam(teamId: number, patch: TeamPatch): Promise<Team> {
    const res = await authFetch(`/api/teams/${teamId}`, {
        method: "PUT",
        body: JSON.stringify(patch),
    });
    return res.json() as Promise<Team>;
}

export async function deleteTeam(teamId: number): Promise<void> {
    await authFetch(`/api/teams/${teamId}`, { method: "DELETE" });
}
export async function inviteByUsername(teamId: number, username: string, role: TeamRole = "MEMBER"): Promise<TeamMember> {
    // Try preferred invite endpoint first
    const res = await authFetch(`/api/teams/${teamId}/members/invite`, {
        method: "POST",
        body: JSON.stringify({ username, role }),
    }).catch(() => null);

    if (res) return res.json() as Promise<TeamMember>;

    // Fallback: if /invite is not implemented, backend might require userId instead.
    // (Up to you: look up userId by username via Auth service, or show a message.)
    throw new Error("Invites by username are not enabled on this backend. Please add members by user ID.");
}
export { adminRemoveMember as removeMember };
