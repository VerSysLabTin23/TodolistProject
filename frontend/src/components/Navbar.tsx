import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { isAuthenticated, currentUser, logout } from "../auth/session";
import CreateTeamButton from "./CreateTeamButton";

export default function Navbar() {
    const navigate = useNavigate();
    const authed = isAuthenticated();
    const user = currentUser();
    const { pathname } = useLocation();
    const onTeamRoute = pathname.startsWith("/teams");

    function handleLogout() {
        logout();
        navigate("/", { replace: true }); // prevent back nav into protected pages
    }

    const linkBase: React.CSSProperties = {
        textDecoration: "none",
        padding: "6px 10px",
        borderRadius: 6,
        fontSize: 14,
    };
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
            {/* Left: app links (only when authenticated) */}
            {authed ? (
                <>
                    <NavLink to="/welcome" style={linkStyle}>Home</NavLink>
                    <NavLink to="/tasks" style={linkStyle}>Tasks</NavLink>
                    <NavLink to="/teams" style={linkStyle}>Teams</NavLink>

                </>
            ) : null}

            {/* Right: user area */}
            <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
                {authed ? (
                    <>
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              {user?.username ?? `user#${user?.id ?? ""}`}
            </span>
                        <button onClick={handleLogout}>Logout</button>
                    </>
                ) : (
                    <>
                        <NavLink to="/" style={linkStyle}>Sign in</NavLink>
                        <NavLink to="/register" style={linkStyle}>Sign up</NavLink>
                        <NavLink to="/completed" style={linkStyle}>
                            Completed
                        </NavLink>
                    </>
                )}
            </div>

            {/* Contextual action: only on team routes and when authenticated */}
            {authed && onTeamRoute ? <CreateTeamButton small /> : null}
        </nav>
    );
}
