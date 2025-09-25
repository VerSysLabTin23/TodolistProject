import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAuthenticated } from "../auth/session";

export default function RequireAuth() {
    const loc = useLocation();
    if (!isAuthenticated()) return <Navigate to="/" replace state={{ from: loc }} />;
    return <Outlet />;
}
