// Username/password login form.
// Flow:
// 1) POST /auth/login via api/auth.login → returns access/refresh tokens (and sometimes user)
// 2) Persist tokens to localStorage so the Axios client can attach Authorization
// 3) If the login response doesn't include a user, GET /auth/me to fetch it
// 4) Save user to localStorage and redirect to /welcome
//
// Includes friendly error display and "submitting" state.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, getAxiosErrorMessage } from "../api/auth";
import { http } from "../api/http";

// Minimal shape we store for the current user
type Me = { id: number; username: string; role?: string };

export default function LoginForm() {
    // Controlled inputs
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    // UI states
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            // Attempt login (tokens are required; user may be included or not)
            const res = await login({ username, password }) as unknown as {
                accessToken: string;
                refreshToken: string;
                user?: Me;
            };

            // Store tokens immediately; subsequent HTTP calls will carry Authorization
            localStorage.setItem("accessToken", res.accessToken);
            localStorage.setItem("refreshToken", res.refreshToken);

            // Ensure we have a user object; some backends omit it from /login
            let me: Me | undefined = res.user;
            if (!me || typeof me.id !== "number") {
                const { data } = await http.get<Me>("/auth/me");
                me = data;
            }

            // Defensive: refuse to proceed without a valid user
            if (!me || typeof me.id !== "number") {
                throw new Error("Login succeeded, but user profile is missing.");
            }

            // Persist current user for later use (navbar, team queries, etc.)
            localStorage.setItem("currentUser", JSON.stringify(me));

            // Navigate into the private area
            navigate("/welcome", { replace: true });
        } catch (err) {
            // Turn Axios/HTTP errors into a readable message
            setError(getAxiosErrorMessage(err));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, maxWidth: 360 }}>
            {/* Inline error area */}
            {error && <div style={{ color: "crimson" }}>{error}</div>}

            {/* Username field */}
            <label style={{ display: "grid", gap: 6 }}>
                <span>Username</span>
                <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                />
            </label>

            {/* Password field */}
            <label style={{ display: "grid", gap: 6 }}>
                <span>Password</span>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                />
            </label>

            {/* Submit */}
            <button type="submit" disabled={submitting} style={{ padding: "8px 12px" }}>
                {submitting ? "Logging in…" : "Login"}
            </button>
        </form>
    );
}
