import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listUserTeams, type Team } from "../api/team";
import { listTasksForTeam, type Task } from "../api/task";

/**
 * Safe getter for current user from localStorage.
 * We expect Login to have stored 'currentUser' as JSON with an 'id' field.
 */
function useCurrentUserId(): number | null {
    return useMemo(() => {
        try {
            const raw = localStorage.getItem("currentUser");
            if (!raw) return null;
            const obj = JSON.parse(raw);
            if (typeof obj?.id === "number") return obj.id;
            return null;
        } catch {
            return null;
        }
    }, []);
}

/**
 * Welcome page:
 * - Left: My Tasks (merged across all teams)
 * - Right: My Teams
 *
 * Flow:
 * 1) Read userId from localStorage.
 * 2) GET /users/:userId/teams   (team-service)
 * 3) For each team, GET /teams/:teamId/tasks  (task-service)
 * 4) Merge tasks, show simple lists with links (routes to be implemented later)
 */
export default function WelcomePage() {
    const userId = useCurrentUserId();
    const [teams, setTeams] = useState<Team[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        async function load() {
            if (!userId) {
                setError("No authenticated user found. Please log in again.");
                setLoading(false);
                return;
            }
            try {
                // 1) fetch user's teams
                const userTeams = await listUserTeams(userId);
                if (!alive) return;
                setTeams(userTeams);

                // 2) fetch tasks for each team in parallel
                const byTeam = await Promise.all(
                    userTeams.map((t) => listTasksForTeam(t.id).catch(() => [] as Task[]))
                );
                const merged = byTeam.flat();
                if (!alive) return;
                setTasks(merged);
            } catch (e) {
                setError("Failed to load data. Check services and your token." +e);
            } finally {
                if (alive) setLoading(false);
            }
        }
        load();
        return () => { alive = false; };
    }, [userId]);

    if (loading) return <div>Loading…</div>;
    if (error)   return <div style={{ color: "crimson" }}>{error}</div>;

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 24,
                alignItems: "start",
            }}
        >
            {/* Left: My Tasks (merged) */}
            <section>
                <h2 style={{ marginBottom: 12 }}>My Tasks</h2>
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
                            <Link to={`/tasks/${t.id}`} style={{ textDecoration: "none" }}>
                                <strong>{t.title}</strong>
                            </Link>
                            {t.priority ? (
                                <span style={{ marginLeft: 8, fontSize: 12, color: "#6b7280" }}>
                  [{t.priority}]
                </span>
                            ) : null}
                            {t.due ? (
                                <span style={{ marginLeft: 8, fontSize: 12, color: "#6b7280" }}>
                  due {t.due}
                </span>
                            ) : null}
                        </li>
                    ))}
                    {tasks.length === 0 && <li>No tasks.</li>}
                </ul>
            </section>

            {/* Right: My Teams */}
            <section>
                <h2 style={{ marginBottom: 12 }}>My Teams</h2>
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
                    {teams.length === 0 && <li>No teams.</li>}
                </ul>
            </section>
        </div>
    );
}
