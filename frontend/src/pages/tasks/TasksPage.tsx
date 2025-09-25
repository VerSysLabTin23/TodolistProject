import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listMyTasks, type Task } from "../../api/task";
import { connectTaskWS, type TaskEvent } from "../../realtime/ws";
import { listUserTeams, type Team } from "../../api/team";

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

export default function TasksPage() {
    const userId = useCurrentUserId();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");

    useEffect(() => {
        let canceled = false;
        async function load() {
            if (!userId) { setLoading(false); return; }
            try {
                const [all, myTeams] = await Promise.all([listMyTasks(), listUserTeams(userId)]);
                if (canceled) return;
                setTasks(all);
                setTeams(myTeams);
            } finally {
                if (!canceled) setLoading(false);
            }
        }
        load();
        return () => { canceled = true; };
    }, [userId]);

    // Subscribe to realtime updates globally, filter to tasks the user can see
    useEffect(() => {
        const sub = connectTaskWS({
            onEvent: (evt: TaskEvent) => {
                console.log(`[TasksPage] Processing ${evt.eventType} for task ${evt.taskId}`);
                setTasks((prev) => {
                    switch (evt.eventType) {
                        case "task.deleted":
                            return prev.filter((t) => t.id !== evt.taskId);
                        case "task.created":
                            // Only add if task doesn't already exist
                            if (prev.find((t) => t.id === evt.taskId)) {
                                return prev; // Task already exists, don't duplicate
                            }
                            return [
                                {
                                    id: evt.taskId,
                                    teamId: evt.teamId,
                                    title: String(evt.payload?.title ?? "New task"),
                                    description: evt.payload?.description as string | undefined,
                                    priority: evt.payload?.priority as Task["priority"],
                                    due: evt.payload?.due as string | undefined,
                                    assigneeId:
                                        (evt.payload?.assigneeId as number | undefined) ??
                                        (evt.assigneeId ?? undefined),
                                    completed: Boolean(evt.payload?.completed ?? false),
                                },
                                ...prev
                            ];
                        case "task.updated":
                        case "task.completed":
                            return prev.map((t) => {
                                if (t.id === evt.taskId) {
                                    const payload = evt.payload as any || {};
                                    return {
                                        ...t,
                                        title: typeof payload.title === 'string' ? payload.title : t.title,
                                        description: typeof payload.description === 'string' ? payload.description : 
                                                   payload.description === undefined ? t.description : payload.description,
                                        priority: (payload.priority === 'low' || payload.priority === 'medium' || payload.priority === 'high') 
                                                 ? payload.priority : t.priority,
                                        due: typeof payload.due === 'string' ? payload.due : t.due,
                                        completed: typeof payload.completed === 'boolean' ? payload.completed : t.completed,
                                        assigneeId: typeof payload.assigneeId === 'number' ? payload.assigneeId : 
                                                   payload.assigneeId === null ? undefined : t.assigneeId,
                                    } as Task;
                                }
                                return t;
                            });
                        default:
                            return prev;
                    }
                });
            },
        });
        return () => sub.close();
    }, []);

    const byTeamName = useMemo(() => {
        const map = new Map<number, string>();
        for (const t of teams) map.set(t.id, t.name);
        return map;
    }, [teams]);

    const filtered = useMemo(() => {
        const term = q.trim().toLowerCase();
        if (!term) return tasks;
        return tasks.filter(t =>
            t.title.toLowerCase().includes(term) ||
            (t.description ?? "").toLowerCase().includes(term)
        );
    }, [tasks, q]);

    if (loading) return <div>Loading…</div>;

    return (
        <section style={{ maxWidth: 900, margin: "0 auto" }}>
            <h1 style={{ marginBottom: 12 }}>My Tasks</h1>

            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <input
                    placeholder="Search title/description…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    style={{ flex: 1, padding: 8 }}
                />
                <Link to="/teams" style={{ alignSelf: "center" }}>Create task (go to team)</Link>
            </div>

            {filtered.length === 0 ? (
                <div style={{ padding: 12, color: "#6b7280" }}>
                    You have no tasks. Create one from a team page.
                </div>
            ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {filtered.map((t) => (
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
                            <span style={{ marginLeft: 8, fontSize: 12, color: "#6b7280" }}>
                {t.priority ? `[${t.priority}]` : ""} {t.due ? `due ${t.due}` : ""}
              </span>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>
                                Team: {byTeamName.get(t.teamId) ?? `#${t.teamId}`}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
