import { Link } from "react-router-dom";

export default function Navbar() {
    return (
        <nav style={{
            display: "flex", gap: 16, padding: "10px 16px",
            borderBottom: "1px solid #e5e7eb", marginBottom: 16
        }}>
            <Link to="/welcome">Home</Link>
            <Link to="/tasks">Tasks</Link>
            <Link to="/teams">Teams</Link>
        </nav>
    );
}
