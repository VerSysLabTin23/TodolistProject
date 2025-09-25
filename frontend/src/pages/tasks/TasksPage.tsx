import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    listMyTasks,
    setCompleted,
    deleteTask,
    type Task,
} from "../../api/task";
import type { TaskEvent } from "../../realtime/ws";
import { useRealtime } from "../../realtime/useRealtime";
import { patchFromEventPayload } from "../../realtime/eventPatch";

function errorMessage(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
}

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                setTasks(await listMyTasks());
            } catch (e: unknown) {
                setError(errorMessage(e) || "Failed to load tasks.");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    useRealtime(
        (evt: TaskEvent) => {
            const patch = patchFromEventPayload(evt); // Partial<Task>
            setTasks((prev) => {
                switch (evt.eventType) {
                    case "task.created":
                        if (prev.some((t) => t.id === evt.taskId)) return prev;
                        return [
                            {
                                id: evt.taskId,
                                teamId: evt.teamId,
                                title: patch.title ?? "New task",
                                completed: Boolean(patch.completed),
                                ...patch,
                            } as Task,
                            ...prev,
                        ];
                    case "task.updated":
                    case "task.completed":
                        return prev.map((t) => (t.id === evt.taskId ? ({ ...t, ...patch } as Task) : t));
                    case "task.deleted":
                        return prev.filter((t) => t.id !== evt.taskId);
                    default:
                        return prev;
                }
            });
        },
        { throttleMs: 120 }
    );

    async function toggleComplete(t: Task) {
        try {
            await setCompleted(t.id, !t.completed);
            // optimistic; realtime will sync
            setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, completed: !x.completed } : x)));
        } catch (e: unknown) {
            setError(errorMessage(e) || "Failed to update status.");
        }
    }

    async function remove(t: Task) {
        if (!confirm("Delete this task?")) return;
        try {
            await deleteTask(t.id);
            setTasks((prev) => prev.filter((x) => x.id !== t.id));
        } catch (e: unknown) {
            setError(errorMessage(e) || "Failed to delete task.");
        }
    }

    if (loading) return <div>Loading…</div>;
    if (error) return <div style={{ color: "crimson" }}>{error}</div>;

    return (
        <div>
            <h2 style={{ marginBottom: 12 }}>My Tasks</h2>
            {tasks.length === 0 ? (
                <div style={{ padding: 12, color: "#6b7280" }}>No tasks.</div>
            ) : (
                <ul style={{ listStyle: "none", padding: 0 }}>
                    {tasks.map((t) => (
                        <li
                            key={t.id}
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr auto auto",
                                alignItems: "center",
                                gap: 8,
                                border: "1px solid #e5e7eb",
                                borderRadius: 8,
                                padding: "8px 10px",
                                marginBottom: 8,
                            }}
                        >
                            <Link to={`/tasks/${t.id}`} style={{ textDecoration: t.completed ? "line-through" : "none" }}>
                                {t.title}
                            </Link>
                            <button onClick={() => toggleComplete(t)} style={btnSecondary}>
                                {t.completed ? "Mark Open" : "Mark Done"}
                            </button>
                            <button onClick={() => remove(t)} style={btnDanger}>
                                Delete
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

const btnSecondary: React.CSSProperties = {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "#f9fafb",
    cursor: "pointer",
};

const btnDanger: React.CSSProperties = {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid #dc2626",
    background: "#fee2e2",
    color: "#991b1b",
    cursor: "pointer",
};
