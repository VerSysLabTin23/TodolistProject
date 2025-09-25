// Admin endpoints for users (auth-service)

export type AdminUser = {
    id: number;
    username: string;
    email?: string;
    role?: string;     // e.g. "admin" | "user"
    isAdmin?: boolean; // some backends provide this instead
    createdAt?: string;
    updatedAt?: string;
};

export type CreateUserInput = {
    username: string;
    email?: string;
    password: string;
    role?: string;      // optional; e.g. "admin"
    isAdmin?: boolean;  // optional; if backend prefers this flag
};

export type UpdateUserInput = {
    username?: string;
    email?: string;
    password?: string;
    role?: string;
    isAdmin?: boolean;
};

function getToken(): string {
    return localStorage.getItem("accessToken") ?? "";
}

async function authFetch(url: string, init?: RequestInit) {
    const token = getToken();
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

const AUTH_ADMIN = "/api/auth/admin";

/** USERS */
export async function adminListUsers(): Promise<AdminUser[]> {
    const res = await authFetch(`${AUTH_ADMIN}/users`);
    return res.json() as Promise<AdminUser[]>;
}

export async function adminCreateUser(input: CreateUserInput): Promise<AdminUser> {
    const res = await authFetch(`${AUTH_ADMIN}/users`, {
        method: "POST",
        body: JSON.stringify(input),
    });
    return res.json() as Promise<AdminUser>;
}

export async function adminUpdateUser(id: number, patch: UpdateUserInput): Promise<AdminUser> {
    const res = await authFetch(`${AUTH_ADMIN}/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
    });
    return res.json() as Promise<AdminUser>;
}

export async function adminDeleteUser(id: number): Promise<void> {
    await authFetch(`${AUTH_ADMIN}/users/${id}`, { method: "DELETE" });
}
