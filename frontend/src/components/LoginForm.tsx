import { useState } from "react";
import { login, getAxiosErrorMessage } from "../api/auth";
import { useNavigate } from "react-router-dom";

export default function LoginForm() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await login({ username, password }); // <- USED
            // persist tokens and basic user info
            localStorage.setItem("accessToken", res.accessToken);
            localStorage.setItem("refreshToken", res.refreshToken);
            localStorage.setItem("currentUser", JSON.stringify(res.user));
            alert(`Welcome, ${res.user.username}`);
            navigate("/"); // or navigate to dashboard route
        } catch (error: unknown) {
            alert(getAxiosErrorMessage(error)); // <- USES error
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <h2>Login</h2>
            <input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
            />
            <button type="submit" disabled={submitting}>
                {submitting ? "Logging in..." : "Login"}
            </button>
        </form>
    );
}
