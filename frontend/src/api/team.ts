// Team API client
//
// This file uses the native `fetch` with a small `authFetch` wrapper to talk
// to the Team service via the Nginx gateway. The gateway rewrites:
//   /api/teams/... → team-service /teams/...
//   /api/users/... → team-service /users/...
//
// All requests carry the Authorization header when a JWT is present.

export type TeamRole = "OWNER" | "ADMIN" | "MEMBER";

/** Body when creating a team. */
export type CreateTeamInput = { name: string; description?: string };

/** Minimal team projection used by the UI. */
export type Team = { id: number; name: string; description?: string };

/** Member listing item (user within a team). */
export type TeamMember = { id: number; username: string; role: TeamRole };

/** Get the current access token from localStorage (if any). */
function getAccessToken(): string {
    return localStorage.getItem("accessToken") ?? "";
}

/**
 * authFetch — a tiny wrapper over `fetch`:
 *  - attaches JWT when present
 *  - sets JSON headers (except for FormData bodies)
 *  - throws a rich Error on non-2xx responses
 */
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

/** Convenience base prefix routed by Nginx to the team-service. */
const API = "/api";

/* ---------------- Mutations ---------------- */

/** POST /api/teams — create a new team. */
export async function createTeam(input: CreateTeamInput): Promise<Team> {
    const res = await authFetch(`${API}/teams`, { method: "POST", body: JSON.stringify(input) });
    return res.json() as Promise<Team>;
}

/** POST /api/teams/:teamId/members — add an existing user by ID with a role. */
export async function addMember(teamId: number, userId: number, role: TeamRole): Promise<TeamMember> {
    const res = await authFetch(`${API}/teams/${teamId}/members`, {
        method: "POST",
        body: JSON.stringify({ userId, role }),
    });
    return res.json() as Promise<TeamMember>;
}

/* ---------------- Queries ---------------- */

/** GET /api/users/:userId/teams — list teams the given user is a member of. */
export async function listUserTeams(userId: number): Promise<Team[]> {
    const res = await authFetch(`${API}/users/${userId}/teams`);
    return res.json() as Promise<Team[]>;
}

/** GET /api/teams/:teamId — fetch a single team by ID. */
export async function getTeamById(teamId: number): Promise<Team> {
    const res = await authFetch(`${API}/teams/${teamId}`);
    return res.json() as Promise<Team>;
}

/** GET /api/teams/:teamId/members — list members of a team. */
export async function listTeamMembers(teamId: number): Promise<TeamMember[]> {
    const res = await authFetch(`${API}/teams/${teamId}/members`);
    return res.json() as Promise<TeamMember[]>;
}

/* ---------------- Admin & owner actions ---------------- */

export type TeamPatch = { name?: string; description?: string };

/** GET /api/teams — (admin) list all teams. */
export async function adminListAllTeams(): Promise<Team[]> {
    const res = await authFetch(`${API}/teams`);
    return res.json() as Promise<Team[]>;
}

/** PUT /api/teams/:teamId — update team name/description. */
export async function adminUpdateTeam(teamId: number, patch: TeamPatch): Promise<Team> {
    const res = await authFetch(`${API}/teams/${teamId}`, { method: "PUT", body: JSON.stringify(patch) });
    return res.json() as Promise<Team>;
}

/** POST /api/teams/:teamId/members — (admin) add member by userId with role. */
export async function adminAddMember(teamId: number, userId: number, role: TeamRole): Promise<TeamMember> {
    const res = await authFetch(`${API}/teams/${teamId}/members`, {
        method: "POST",
        body: JSON.stringify({ userId, role }),
    });
    return res.json() as Promise<TeamMember>;
}

/** DELETE /api/teams/:teamId/members/:userId — (admin) remove member by user ID. */
export async function adminRemoveMember(teamId: number, userId: number): Promise<void> {
    await authFetch(`${API}/teams/${teamId}/members/${userId}`, { method: "DELETE" });
}

/** PATCH /api/teams/:teamId/members/:userId — (admin) change member role. */
export async function adminSetMemberRole(teamId: number, userId: number, role: TeamRole): Promise<TeamMember> {
    const res = await authFetch(`${API}/teams/${teamId}/members/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
    });
    return res.json() as Promise<TeamMember>;
}

/** PUT /api/teams/:teamId — (owner/admin) update team. */
export async function updateTeam(teamId: number, patch: TeamPatch): Promise<Team> {
    const res = await authFetch(`/api/teams/${teamId}`, {
        method: "PUT",
        body: JSON.stringify(patch),
    });
    return res.json() as Promise<Team>;
}

/** DELETE /api/teams/:teamId — (owner/admin) delete team. */
export async function deleteTeam(teamId: number): Promise<void> {
    await authFetch(`/api/teams/${teamId}`, { method: "DELETE" });
}

/**
 * Invite by username (if backend supports an /invite endpoint).
 * Falls back with an explanatory error if not implemented.
 */
export async function inviteByUsername(
    teamId: number,
    username: string,
    role: TeamRole = "MEMBER"
): Promise<TeamMember> {
    const res = await authFetch(`/api/teams/${teamId}/members/invite`, {
        method: "POST",
        body: JSON.stringify({ username, role }),
    }).catch(() => null);

    if (res) return res.json() as Promise<TeamMember>;
    throw new Error("Invites by username are not enabled on this backend. Please add members by user ID.");
}

/** Friendly alias: reuse the admin remove call under a neutral name. */
export { adminRemoveMember as removeMember };

/** Optional alias for clarity in UI code. */
export const addMemberById = adminAddMember;
