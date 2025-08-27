import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    getTask, updateTask, deleteTask, setAssignee, setCompleted, type Task,
} from "../../api/task";

export default function TaskDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const taskId = Number(id);
    const navigate = useNavigate();

    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        let canceled = false;
        async function load() {
            try {
                const t = await getTask(taskId);
                if (!canceled) setTask(t);
            } catch (e) {
                if (!canceled) setErr("Failed to load task");
            } finally {
                if (!canceled) setLoading(false);
            }
        }
        if (!Number.isFinite(taskId)) {
            setErr("Invalid task id");
            setLoading(false);
            return;
        }
        load();
        return () => { canceled = true; };
    }, [taskId]);

    async function save(changes: Partial<Task>) {
        if (!task) return;
        setSaving(true);
        try {
            const updated = await updateTask(task.id, changes);
            setTask(updated);
        } catch (e) {
            alert("Save failed");
        } finally {
            setSaving(false);
        }
    }

    async function onDelete() {
        if (!task) return;
        if (!confirm("Delete this task?")) return;
        try {
            await deleteTask(task.id);
            navigate("/tasks");
        } catch {
            alert("Delete failed");
        }
    }

    if (loading) return <div>Loading…</div>;
    if (err) return <div style={{ color: "crimson" }}>{err}</div>;
    if (!task) return <div>Not found</div>;

    return (
        <section style={{ maxWidth: 720, margin: "0 auto" }}>
            <h1>Task #{task.id}</h1>

            <div style={{ display: "grid", gap: 10 }}>
                <label>
                    Title
                    <input
                        value={task.title}
                        onChange={(e) => setTask({ ...task, title: e.target.value })}
                        onBlur={() => save({ title: task.title })}
                        style={{ width: "100%", padding: 8 }}
                    />
                </label>

                <label>
                    Description
                    <textarea
                        value={task.description ?? ""}
                        onChange={(e) => setTask({ ...task, description: e.target.value })}
                        onBlur={() => save({ description: task.description ?? "" })}
                        rows={4}
                        style={{ width: "100%", padding: 8 }}
                    />
                </label>

                <div style={{ display: "flex", gap: 12 }}>
                    <label>
                        Priority
                        <select
                            value={task.priority ?? ""}
                            onChange={(e) => {
                                const p = (e.target.value || undefined) as Task["priority"];
                                setTask({ ...task, priority: p });
                                save({ priority: p });
                            }}
                        >
                            <option value="">—</option>
                            <option value="low">low</option>
                            <option value="medium">medium</option>
                            <option value="high">high</option>
                        </select>
                    </label>

                    <label>
                        Due
                        <input
                            type="date"
                            value={task.due ?? ""}
                            onChange={(e) => {
                                const v = e.target.value || undefined;
                                setTask({ ...task, due: v });
                                save({ due: v as string | undefined });
                            }}
                        />
                    </label>

                    <label>
                        Assignee (userId)
                        <input
                            type="number"
                            value={task.assigneeId ?? ""}
                            onChange={(e) => {
                                const v = e.target.value === "" ? undefined : Number(e.target.value);
                                setTask({ ...task, assigneeId: v });
                            }}
                            onBlur={async (e) => {
                                const v = e.currentTarget.value === "" ? null : Number(e.currentTarget.value);
                                try {
                                    const updated = await setAssignee(task.id, v);
                                    setTask(updated);
                                } catch {
                                    alert("Setting assignee failed");
                                }
                            }}
                            style={{ width: 120 }}
                        />
                    </label>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                    <button
                        disabled={saving}
                        onClick={async () => {
                            try {
                                const updated = await setCompleted(task.id, !task.completed);
                                setTask(updated);
                            } catch {
                                alert("Complete toggle failed");
                            }
                        }}
                    >
                        {task.completed ? "Mark as not completed" : "Mark as completed"}
                    </button>

                    <button onClick={onDelete} style={{ color: "crimson" }}>
                        Delete
                    </button>
                </div>

                <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Team #{task.teamId} • created {task.createdAt || "—"} • updated {task.updatedAt || "—"}
                </div>
            </div>
        </section>
    );
}
