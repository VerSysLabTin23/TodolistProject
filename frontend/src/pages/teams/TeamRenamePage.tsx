import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getTeamById } from "../../api/team";
import {
    listTasksForTeam,
    createTaskInTeam,
    setCompleted,
    deleteTask,
    type Task,
} from "../../api/task";

type NewTaskForm = {
    title: string;
    description?: string;
    priority: "low" | "medium" | "high";
    due: string;                 // ISO date (yyyy-mm-dd)
    assigneeId?: number;
};

export default function TeamDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const teamId = Number(id);

    const [teamName, setTeamName] = useState<string>("");
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState<NewTaskForm>({
        title: "",
        description: "",
        priority: "medium",
        due: "",
        assigneeId: undefined,
    });

    useEffect(() => {
        let cancel = false;
        async function load() {
            try {
                const [team, ts] = await Promise.all([
                    getTeamById(teamId),
                    listTasksForTeam(teamId),
                ]);
                if (cancel) return;
                setTeamName(team.name);
                setTasks(ts);
            } finally {
                if (!cancel) setLoading(false);
            }
        }
        if (Number.isFinite(teamId)) load(); else setLoading(false);
        return () => { cancel = true; };
    }, [teamId]);

    async function onCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!form.title.trim()) {
            alert("Title is required.");
            return;
        }
        setCreating(true);
        try {
            const created = await createTaskInTeam(teamId, {
                title: form.title.trim(),
                description: form.description?.trim() || undefined,
                priority: form.priority,
                due: form.due || new Date().toISOString().slice(0, 10),
                assigneeId: form.assigneeId,
            });
            setTasks((prev) => [created, ...prev]);
            // reset minimal fields
            setForm((f) => ({ ...f, title: "", description: "" }));
        } catch {
            alert("Failed to create task.");
        } finally {
            setCreating(false);
        }
    }

    async function toggleComplete(t: Task) {
        try {
            const updated = await setCompleted(t.id, !t.completed);
            setTasks((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
        } catch {
            alert("Failed to update completion.");
        }
    }

    async function remove(t: Task) {
        if (!confirm("Delete this task?")) return;
        try {
            await deleteTask(t.id);
            setTasks((prev) => prev.filter((x) => x.id !== t.id));
        } catch {
            alert("Delete failed.");
        }
    }

    if (loading) return <div>Loading…</div>;

    return (
        <section style={{ maxWidth: 1000, margin: "0 auto" }}>
            <h1 style={{ marginBottom: 12 }}>
                Team: {teamName || `#${teamId}`}
            </h1>

            {/* Create Task */}
            <form onSubmit={onCreate}
                  style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 3fr 1fr 1fr 1fr auto",
                      gap: 8,
                      alignItems: "end",
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 16,
                      background: "#fff",
                  }}>
                <label style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>Title*</span>
                    <input
                        required
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="e.g. Write release notes"
                    />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>Description</span>
                    <input
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        placeholder="optional"
                    />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>Priority</span>
                    <select
                        value={form.priority}
                        onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as NewTaskForm["priority"] }))}
                    >
                        <option value="low">low</option>
                        <option value="medium">medium</option>
                        <option value="high">high</option>
                    </select>
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>Due</span>
                    <input
                        type="date"
                        value={form.due}
                        onChange={(e) => setForm((f) => ({ ...f, due: e.target.value }))}
                    />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>Assignee (userId)</span>
                    <input
                        type="number"
                        value={form.assigneeId ?? ""}
                        onChange={(e) =>
                            setForm((f) => ({
                                ...f,
                                assigneeId: e.target.value === "" ? undefined : Number(e.target.value),
                            }))
                        }
                        placeholder="optional"
                    />
                </label>

                <button type="submit" disabled={creating} style={{ height: 36 }}>
                    {creating ? "Creating…" : "Add Task"}
                </button>
            </form>

            {/* Tasks in this team */}
            {tasks.length === 0 ? (
                <div style={{ color: "#6b7280" }}>No tasks in this team yet.</div>
            ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {tasks.map((t) => (
                        <li key={t.id}
                            style={{
                                padding: "10px 12px",
                                border: "1px solid #e5e7eb",
                                borderRadius: 8,
                                marginBottom: 10,
                                background: "#fff",
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                            }}>
                            <div style={{ flex: 1 }}>
                                <div>
                                    <strong>{t.title}</strong>{" "}
                                    <span style={{ fontSize: 12, color: "#6b7280" }}>
                    {t.priority ? `[${t.priority}]` : ""} {t.due ? `• due ${t.due}` : ""}
                  </span>
                                </div>
                                {t.description ? (
                                    <div style={{ fontSize: 12, color: "#6b7280" }}>{t.description}</div>
                                ) : null}
                            </div>

                            <button onClick={() => toggleComplete(t)}>
                                {t.completed ? "Mark not completed" : "Mark completed"}
                            </button>
                            <button onClick={() => remove(t)} style={{ color: "crimson" }}>
                                Delete
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
