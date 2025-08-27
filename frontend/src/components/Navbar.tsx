import {Link, useLocation, useNavigate} from "react-router-dom";
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
        // prevent “Back” returning to protected pages
        navigate("/", { replace: true });
    }

    return (
        <nav style={{
            display: "flex", gap: 16, padding: "10px 16px",
            borderBottom: "1px solid #e5e7eb", marginBottom: 16
        }}>
            {/* Left: app navigation */}
            <Link to="/welcome">Home</Link>
            <Link to="/tasks">Tasks</Link>
            <Link to="/teams">Teams</Link>

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
                        <Link to="/">Sign in</Link>
                        <Link to="/register">Sign up</Link>
                    </>
                )}
            </div>
            {onTeamRoute && <CreateTeamButton small />}
        </nav>
    );
}
