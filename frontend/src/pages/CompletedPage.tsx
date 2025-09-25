import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listMyTasks, type Task } from "../api/task";

export default function CompletedPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const all = await listMyTasks();
                setTasks(all.filter(t => t.completed));
            } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) return <div>Loading…</div>;
    if (error) return <div style={{ color: "crimson" }}>{error}</div>;

    return (
        <div>
            <h2>Completed tasks</h2>
    {tasks.length === 0 ? (
        <div style={{ padding: 12, color: "#6b7280" }}>No completed tasks.</div>
    ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
        {tasks.map((t) => (
            <li key={t.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <strong style={{ textDecoration: "line-through" }}>{t.title}</strong>
        <Link to={`/tasks/${t.id}`}>Open</Link>
        </div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
            {t.priority ? `[${t.priority}] • ` : ""}{t.due ? `due ${t.due}` : ""} • team #{t.teamId}
            </div>
            {t.description && <div style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{t.description}</div>}
            </li>
            ))}
            </ul>
        )}
        </div>
    );
    }
