// Route guard: require authentication.
// Purpose:
// - Block access to private routes if the user is not authenticated.
// - Redirect unauthenticated users to "/" (Login) and preserve the intended
//   location in `state.from` so the app can return the user post-login.
//
// Design:
// - Uses a synchronous `isAuthenticated()` snapshot from session utilities,
//   avoiding any network IO in the guard itself.

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAuthenticated } from "../auth/session";

export default function RequireAuth() {
    const loc = useLocation();
    if (!isAuthenticated()) return <Navigate to="/" replace state={{ from: loc }} />;
    return <Outlet />;
}
