// frontend/src/auth/session.ts
export function isAuthenticated(): boolean {
    return !!localStorage.getItem("accessToken");
}

export type MinimalUser = { id: number; username?: string } | null;

export function currentUser(): MinimalUser {
    try {
        return JSON.parse(localStorage.getItem("currentUser") || "null");
    } catch {
        return null;
    }
}

export function logout(): void {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("currentUser");
}
