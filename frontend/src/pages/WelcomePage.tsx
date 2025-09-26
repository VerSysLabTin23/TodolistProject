import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listUserTeams, type Team } from "../api/team";
import { listMyTasks, type Task } from "../api/task";

// Read current user once from localStorage
function useCurrentUserId(): number | null {
    return useMemo(() => {
        try {
            const raw = localStorage.getItem("currentUser");
            if (!raw) return null;
            const obj = JSON.parse(raw);
            return typeof obj?.id === "number" ? obj.id : null;
        } catch {
            return null;
        }
    }, []);
}

// runtime guard (prevents `.map` crash)
function toArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
}

export default function WelcomePage() {
    const userId = useCurrentUserId();

    const [teams, setTeams] = useState<Team[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancel = false;

        async function load() {
            setError(null);
            setLoading(true);

            if (!userId) {
                setError("No authenticated user found. Please log in again.");
                setLoading(false);
                return;
            }

            try {
                const [tms, tks] = await Promise.all([
                    listUserTeams(userId),
                    listMyTasks(),
                ]);

                if (cancel) return;

                // Validate shapes to avoid `.map` on non-array
                if (!Array.isArray(tms)) {
                    throw new Error("Team API returned unexpected shape.");
                }
                if (!Array.isArray(tks)) {
                    throw new Error("Task API returned unexpected shape.");
                }

                setTeams(toArray<Team>(tms));
                setTasks(toArray<Task>(tks));
            } catch (e) {
                const msg =
                    e instanceof Error ? e.message : "Failed to load data. Check services and your token.";
                setError(msg);
                // still render with empty arrays (no crash)
                setTeams([]);
                setTasks([]);
            } finally {
                if (!cancel) setLoading(false);
            }
        }

        load();
        return () => {
            cancel = true;
        };
    }, [userId]);

    if (loading) return <div>Loading…</div>;
    if (error) return <div style={{ color: "crimson" }}>{error}</div>;

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
            {/* Left: tasks */}
            <section>
                <h2 style={{ marginBottom: 12 }}>My Tasks</h2>
                {tasks.length === 0 ? (
                    <div style={{ padding: 12, color: "#6b7280" }}>You have no open tasks.</div>
                ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                        {tasks.map((t) => (
                            <li
                                key={t.id}
                                style={{
                                    padding: "10px 12px",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 8,
                                    marginBottom: 10,
                                    background: "#fff",
                                }}
                            >
                                <Link to={`/tasks/${t.id}`} style={{ textDecoration: t.completed ? "line-through" : "none" }}>
                                    <strong>{t.title}</strong>
                                </Link>
                                {t.priority && (
                                    <span style={{ marginLeft: 8, fontSize: 12, color: "#6b7280" }}>
                    [{t.priority}]
                  </span>
                                )}
                                {t.due && (
                                    <span style={{ marginLeft: 8, fontSize: 12, color: "#6b7280" }}>
                    due {t.due}
                  </span>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Right: teams */}
            <section>
                <h2 style={{ marginBottom: 12 }}>My Teams</h2>
                {teams.length === 0 ? (
                    <div style={{ padding: 12, color: "#6b7280" }}>
                        You are not a member of any team yet.
                    </div>
                ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                        {teams.map((tm) => (
                            <li
                                key={tm.id}
                                style={{
                                    padding: "10px 12px",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 8,
                                    marginBottom: 10,
                                    background: "#fff",
                                }}
                            >
                                <Link to={`/teams/${tm.id}`} style={{ textDecoration: "none" }}>
                                    <strong>{tm.name}</strong>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
