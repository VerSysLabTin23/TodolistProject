// Completed tasks overview.
// Purpose:
// - Fetch the authenticated user's tasks (via listMyTasks)
// - Filter to completed items only
// - Provide quick navigation into each task's detail page
//
// Flow:
// 1) On mount: GET /tasks (scoped to current user) → listMyTasks()
// 2) Keep only tasks where completed === true
// 3) Render list (title, priority, due, teamId) or an empty-state message
//
// Error handling:
// - Surfaces a readable error above the list
// - Always clears the loading spinner in finally()

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listMyTasks, type Task } from "../api/task";

export default function CompletedPage() {
    // Local page state: data + UX flags
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // One-shot load on mount
    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const all = await listMyTasks();
                // Only show completed tasks
                setTasks(all.filter(t => t.completed));
            } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Simple guarded renders
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
                        <li
                            key={t.id}
                            style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 8 }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                {/* Title struck through to reinforce "completed" status */}
                                <strong style={{ textDecoration: "line-through" }}>{t.title}</strong>
                                <Link to={`/tasks/${t.id}`}>Open</Link>
                            </div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>
                                {/* Compact meta line: priority, due date, and team reference */}
                                {t.priority ? `[${t.priority}] • ` : ""}
                                {t.due ? `due ${t.due}` : ""}
                                {` • team #${t.teamId}`}
                            </div>
                            {/* Optional long-form description */}
                            {t.description && (
                                <div style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{t.description}</div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
