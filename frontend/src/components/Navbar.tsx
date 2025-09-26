// Top navigation bar.
// - Shows main app links when authenticated (Home, Tasks, Teams)
// - Shows auth links when signed out (Sign in / Sign up / Completed)
// - Displays current username and a Logout button when authenticated
// - Conditionally shows a "Create team" shortcut on team routes
//
// Uses react-router's NavLink for active styling and navigate() on logout.

import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { isAuthenticated, currentUser, logout } from "../auth/session";
import CreateTeamButton from "./CreateTeamButton";

export default function Navbar() {
    const navigate = useNavigate();

    // Simple auth state derived from localStorage
    const authed = isAuthenticated();
    const user = currentUser();

    // Helps us decide when to show team-specific UI
    const { pathname } = useLocation();
    const onTeamRoute = pathname.startsWith("/teams");

    // Logout clears storage and hard-redirects to the login page
    function handleLogout() {
        logout();
        navigate("/", { replace: true }); // prevent returning with back button
    }

    // Base style for links
    const linkBase: React.CSSProperties = {
        textDecoration: "none",
        padding: "6px 10px",
        borderRadius: 6,
        fontSize: 14,
    };

    // Active vs inactive visual
    const linkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
        ...linkBase,
        color: isActive ? "#111827" : "#374151",
        background: isActive ? "#e5e7eb" : "transparent",
    });

    return (
        <nav
            role="navigation"
            aria-label="Main"
            style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 16px",
                borderBottom: "1px solid #e5e7eb",
                background: "#fafafa",
                marginBottom: 16,
            }}
        >
            {/* LEFT: main app links (only when authenticated) */}
            {authed ? (
                <>
                    <NavLink to="/welcome" style={linkStyle}>Home</NavLink>
                    <NavLink to="/tasks" style={linkStyle}>Tasks</NavLink>
                    <NavLink to="/teams" style={linkStyle}>Teams</NavLink>
                </>
            ) : null}

            {/* RIGHT: user area / auth links */}
            <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
                {authed ? (
                    <>
                        {/* small user badge */}
                        <span style={{ fontSize: 12, color: "#6b7280" }}>
                            {user?.username ?? `user#${user?.id ?? ""}`}
                        </span>
                        {/* logout ends the session and redirects to / */}
                        <button onClick={handleLogout}>Logout</button>
                    </>
                ) : (
                    <>
                        {/* When logged out, offer entry points */}
                        <NavLink to="/" style={linkStyle}>Sign in</NavLink>
                        <NavLink to="/register" style={linkStyle}>Sign up</NavLink>
                        <NavLink to="/completed" style={linkStyle}>Completed</NavLink>
                    </>
                )}
            </div>

            {/* Contextual action: quick access to "Create team" when browsing teams */}
            {authed && onTeamRoute ? <CreateTeamButton small /> : null}
        </nav>
    );
}
