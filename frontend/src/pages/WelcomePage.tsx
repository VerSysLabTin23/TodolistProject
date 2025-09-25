import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listUserTeams, type Team } from "../api/team";
import { listMyTasks, type Task } from "../api/task";
import type { TaskEvent } from "../realtime/ws";
import { useRealtime } from "../realtime/useRealtime";
import { patchFromEventPayload } from "../realtime/eventPatch";

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

export default function WelcomePage() {
    const userId = useCurrentUserId();

    const [teams, setTeams] = useState<Team[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // initial load
    useEffect(() => {
        let canceled = false;

        async function load() {
            if (!userId) {
                setError("No authenticated user found. Please log in again.");
                setLoading(false);
                return;
            }
            try {
                const [userTeams, myTasks] = await Promise.all([
                    listUserTeams(userId),
                    listMyTasks(),
                ]);
                if (canceled) return;
                setTeams(userTeams);
                setTasks(myTasks);
            } catch {
                if (!canceled) setError("Failed to load data. Check services and your token.");
            } finally {
                if (!canceled) setLoading(false);
            }
        }

        load();
        return () => {
            canceled = true;
        };
    }, [userId]);

    useRealtime((evt: TaskEvent) => {
        const patch = patchFromEventPayload(evt);

        setTasks(prev => {
            switch (evt.eventType) {
                case "task.deleted":
                    return prev.filter(t => t.id !== evt.taskId);

                case "task.created": {
                    // Only show in “My Tasks” if the backend includes it in listMyTasks (ownership/assignee rules).
                    // Optimistic add for perceived snappiness, but de-dupe by id:
                    if (prev.some(t => t.id === evt.taskId)) return prev;
                    const next = {
                        id: evt.taskId,
                        teamId: evt.teamId,
                        title: patch.title ?? "New task",
                        description: patch.description,
                        priority: patch.priority,
                        due: patch.due,
                        assigneeId: patch.assigneeId,
                        completed: Boolean(patch.completed ?? false),
                    };
                    return [next, ...prev];
                }

                case "task.updated":
                case "task.completed":
                    return prev.map(t => (t.id === evt.taskId ? { ...t, ...patch } : t));

                default:
                    return prev;
            }
        });
    }, { throttleMs: 150 });

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
                                <Link to={`/tasks/${t.id}`} style={{ textDecoration: "none" }}>
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
