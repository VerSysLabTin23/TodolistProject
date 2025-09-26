// Admin endpoints for users (auth-service)
//
// This module contains strongly-typed helpers the frontend uses to call
// *administrative* user-management APIs on the Auth service via the Nginx
// gateway prefix `/api`. Every request includes the JWT access token (if
// present) and expects JSON responses.
//
// URL base used below: `/api/auth/admin/...`
//
// Security: these routes are meant for admins only; the backend also enforces
// authorization. On the frontend we still attach the JWT and surface readable
// errors.

/** Shape of a user returned by admin endpoints. */

export type AdminUser = {
    id: number;
    username: string;
    email?: string;
    role?: string;     // e.g. "admin" | "user"
    isAdmin?: boolean;
    createdAt?: string;
    updatedAt?: string;
};

/** Payload to create a new user via admin API. */

export type CreateUserInput = {
    username: string;
    email?: string;
    password: string;
    role?: string;
    isAdmin?: boolean;
};

/** Partial payload to update an existing user via admin API. */

export type UpdateUserInput = {
    username?: string;
    email?: string;
    password?: string;
    role?: string;
    isAdmin?: boolean;
};

/** Pull the current JWT access token from localStorage (if any). */

function getToken(): string {
    return localStorage.getItem("accessToken") ?? "";
}

/**
 * authFetch — thin wrapper around `fetch` that:
 *  - attaches the `Authorization: Bearer <token>` header when available
 *  - sets JSON headers (Accept + Content-Type) for non-FormData requests
 *  - throws a rich Error when the response is not OK (non-2xx)
 *
 * @param url  Absolute or relative URL (we use relative to the Nginx gateway).
 * @param init Standard fetch init options (method, body, headers...).
 */

async function authFetch(url: string, init?: RequestInit) {
    const token = getToken();
    const headers = new Headers(init?.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    headers.set("Accept", "application/json");
    if (!(init?.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }
    const res = await fetch(url, { ...init, headers });

    // Convert non-2xx responses to thrown Errors with readable content
    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText} ${txt}`);
    }
    return res;
}
/** Base prefix for admin endpoints on the Auth service (behind Nginx). */
const AUTH_ADMIN = "/api/auth/admin";

/* ===========================================================
   USERS (Admin)
   =========================================================== */

/**
 * List all users (admin scope).
 * GET /api/auth/admin/users
 */
export async function adminListUsers(): Promise<AdminUser[]> {
    const res = await authFetch(`${AUTH_ADMIN}/users`);
    return res.json() as Promise<AdminUser[]>;
}

/**
 * Create a new user (admin scope).
 * POST /api/auth/admin/users
 */

export async function adminCreateUser(input: CreateUserInput): Promise<AdminUser> {
    const res = await authFetch(`${AUTH_ADMIN}/users`, {
        method: "POST",
        body: JSON.stringify(input),
    });
    return res.json() as Promise<AdminUser>;
}

/**
 * Update an existing user (admin scope).
 * PATCH /api/auth/admin/users/:id
 */

export async function adminUpdateUser(id: number, patch: UpdateUserInput): Promise<AdminUser> {
    const res = await authFetch(`${AUTH_ADMIN}/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
    });
    return res.json() as Promise<AdminUser>;
}

/**
 * Delete a user (admin scope).
 * DELETE /api/auth/admin/users/:id
 */

export async function adminDeleteUser(id: number): Promise<void> {
    await authFetch(`${AUTH_ADMIN}/users/${id}`, { method: "DELETE" });
}
