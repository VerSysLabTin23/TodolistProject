// Route guard: restrict access to ADMIN users.
// Purpose:
// - Read the current user from localStorage.
// - Accept either `role === "admin"` or boolean flag `isAdmin === true`.
// - If not admin, redirect to /welcome (non-admin landing).
//
// Notes:
// - Backends differ: some return `role: "ADMIN"|"USER"`, others return `isAdmin: boolean`.
//   This guard accepts both to be resilient.
// - Keep this guard fast: avoid network requests; rely on session snapshot in localStorage.
//
// ⚠ Housekeeping:
// - The file content was duplicated in the provided snippet. Ensure only ONE
//   copy of this module is exported in your repository (remove duplicates).

import { Navigate, Outlet } from "react-router-dom";

type CurrentUser = {
    id: number;
    username: string;
    // Backends often include one of these; we accept either to be safe:
    role?: string;          // e.g. "admin" / "user" (case-insensitive)
    isAdmin?: boolean;      // explicit boolean flag
};

// Read-and-validate the current user from localStorage.
// Returns `null` if missing or malformed. Tolerates bad JSON.
function readCurrentUser(): CurrentUser | null {
    try {
        const raw = localStorage.getItem("currentUser");
        if (!raw) return null;
        const o = JSON.parse(raw);
        if (typeof o === "object" && o && typeof o.id === "number") return o as CurrentUser;
        return null;
    } catch {
        return null;
    }
}

// Normalize "is this user admin?" across role strings and boolean flag.
function isAdminUser(u: CurrentUser | null): boolean {
    if (!u) return false;
    if (u.isAdmin === true) return true;
    if (typeof u.role === "string" && u.role.toLowerCase() === "admin") return true;
    return false;
}

export default function RequireAdmin() {
    const user = readCurrentUser();
    if (!isAdminUser(user)) return <Navigate to="/welcome" replace />;
    return <Outlet />;
}
