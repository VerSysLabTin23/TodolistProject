import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, getAxiosErrorMessage } from "../api/auth";
import { http } from "../api/http";

type Me = { id: number; username: string; role?: string };

export default function LoginForm() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            // 1) Login — must return tokens; may or may not return user
            const res = await login({ username, password }) as unknown as {
                accessToken: string;
                refreshToken: string;
                user?: Me;
            };

            // 2) Persist tokens immediately (so subsequent calls include Authorization)
            localStorage.setItem("accessToken", res.accessToken);
            localStorage.setItem("refreshToken", res.refreshToken);

            // 3) Ensure we have the current user saved.
            let me: Me | undefined = res.user;
            if (!me || typeof me.id !== "number") {
                // Some backends don’t include the user in /login — fetch it.
                const { data } = await http.get<Me>("/auth/me");
                me = data;
            }

            // Defensive check to avoid the blank /welcome issue
            if (!me || typeof me.id !== "number") {
                throw new Error("Login succeeded, but user profile is missing.");
            }

            localStorage.setItem("currentUser", JSON.stringify(me));

            // 4) Go to the app
            navigate("/welcome", { replace: true });
        } catch (err) {
            setError(getAxiosErrorMessage(err));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, maxWidth: 360 }}>
            {error && <div style={{ color: "crimson" }}>{error}</div>}

            <label style={{ display: "grid", gap: 6 }}>
                <span>Username</span>
                <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                />
            </label>

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

            <button type="submit" disabled={submitting} style={{ padding: "8px 12px" }}>
                {submitting ? "Logging in…" : "Login"}
            </button>
        </form>
    );
}
