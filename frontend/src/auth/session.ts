// Lightweight session helpers for auth state stored in localStorage.
// These utilities are used by routing guards, the navbar, and logout flows.

/** Returns true if an access token is present (simple auth check). */
export function isAuthenticated(): boolean {
    return !!localStorage.getItem("accessToken");
}

/** Minimal shape we persist for the signed-in user. */
export type MinimalUser = { id: number; username?: string } | null;

/** Safely read the current user from localStorage (or null on parse error). */
export function currentUser(): MinimalUser {
    try {
        return JSON.parse(localStorage.getItem("currentUser") || "null");
    } catch {
        return null;
    }
}

/** Clears all auth-related storage keys (used on logout or token refresh failure). */
export function logout(): void {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("currentUser");
}
