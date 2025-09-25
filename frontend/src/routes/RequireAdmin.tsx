import { Navigate, Outlet } from "react-router-dom";

type CurrentUser = {
    id: number;
    username: string;
    // backends often include one of these; we accept either to be safe:
    role?: string;          // "admin" / "user" ...
    isAdmin?: boolean;
};

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
