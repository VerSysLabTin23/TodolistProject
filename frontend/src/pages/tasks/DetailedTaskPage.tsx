import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
    getTask,
    updateTask,
    deleteTask,
    setCompleted,
    setAssignee,
    type Task,
} from "../../api/task";
import type { TaskEvent } from "../../realtime/ws";
import { useRealtime } from "../../realtime/useRealtime";
import { patchFromEventPayload } from "../../realtime/eventPatch";
import { listTeamMembers, type TeamMember } from "../../api/team";

type Form = {
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high";
    due?: string;
    assigneeId?: number | null;
    completed: boolean;
};

function toForm(t: Task): Form {
    return {
        title: t.title,
        description: t.description,
        priority: t.priority,
        due: t.due,
        assigneeId: t.assigneeId ?? null,
        completed: !!t.completed,
    };
}

// Generic, fully-typed diff without `any`
function diffPatch<A extends Record<string, unknown>>(a: A, b: A): Partial<A> {
    const out: Partial<A> = {};
    (Object.keys(a) as Array<keyof A>).forEach((k) => {
        if (a[k] !== b[k]) out[k] = b[k];
    });
    return out;
}

function errorMessage(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
}

export default function DetailedTaskPage() {
    const { id } = useParams();
    const taskId = Number(id);
    const navigate = useNavigate();

    const [task, setTask] = useState<Task | null>(null);
    const [form, setForm] = useState<Form | null>(null);
    const [initial, setInitial] = useState<Form | null>(null);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const dirty = useMemo(
        () => (form && initial ? JSON.stringify(form) !== JSON.stringify(initial) : false),
        [form, initial]
    );

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const t = await getTask(taskId);
                if (cancelled) return;
                setTask(t);
                const f = toForm(t);
                setForm(f);
                setInitial(f);

                // fetch members for assignee dropdown
                try {
                    const ms = await listTeamMembers(t.teamId);
                    if (!cancelled) setMembers(ms);
                } catch {
                    /* non-fatal */
                }
            } catch (e: unknown) {
                setError(errorMessage(e) || "Failed to load task.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [taskId]);

    // Realtime: merge updates from other users
    useRealtime(
        (evt: TaskEvent) => {
            if (!task) return;
            if (evt.taskId !== task.id) return;

            if (evt.eventType === "task.deleted") {
                navigate("/tasks", { replace: true });
                return;
            }

            const patch = patchFromEventPayload(evt); // Partial<Task>
            setTask((prev) => (prev ? { ...prev, ...patch } : prev));
            if (!dirty && form) {
                const next = { ...form, ...patch };
                setForm(next);
                setInitial(next);
            }
        },
        { throttleMs: 120 }
    );

    // Submit: handle assignee via its endpoint; others via PUT
    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!task || !form || !initial) return;

        const patch = diffPatch<Form>(initial, form);
        if (Object.keys(patch).length === 0) return;

        try {
            setSaving(true);

            if (Object.prototype.hasOwnProperty.call(patch, "assigneeId")) {
                await setAssignee(task.id, form.assigneeId ?? null);
                setTask((prev) => (prev ? { ...prev, assigneeId: form.assigneeId ?? null } : prev));
                delete (patch as Partial<Form>).assigneeId;
            }

            if (Object.keys(patch).length > 0) {
                const updated = await updateTask(task.id, patch);
                setTask(updated);
                const next = toForm(updated);
                setForm(next);
                setInitial(next);
            } else {
                const next = toForm({ ...task, assigneeId: form.assigneeId ?? null });
                setForm(next);
                setInitial(next);
            }

            setError(null);
        } catch (e: unknown) {
            setError(errorMessage(e) || "Failed to save changes.");
        } finally {
            setSaving(false);
        }
    }

    function onCancel() {
        if (initial) setForm(initial);
    }

    async function onToggleCompleted() {
        if (!task || !form) return;
        try {
            setSaving(true);
            const updated = await setCompleted(task.id, !form.completed);
            setTask(updated);
            const next = toForm(updated);
            setForm(next);
            setInitial(next);
        } catch (e: unknown) {
            setError(errorMessage(e) || "Failed to update status.");
        } finally {
            setSaving(false);
        }
    }

    async function onDelete() {
        if (!task) return;
        if (!confirm("Delete this task? This cannot be undone.")) return;
        try {
            setSaving(true);
            await deleteTask(task.id);
            navigate("/tasks", { replace: true });
        } catch (e: unknown) {
            setError(errorMessage(e) || "Failed to delete task.");
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div>Loading…</div>;
    if (error) return <div style={{ color: "crimson" }}>{error}</div>;
    if (!task || !form) return null;

    return (
        <div style={{ maxWidth: 720 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <h2 style={{ margin: 0 }}>Task #{task.id}</h2>
                <Link to={`/teams/${task.teamId}`}>Back to Team</Link>
            </div>

            <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                    <span>Title</span>
                    <input
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        required
                        style={inputStyle}
                    />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    <span>Description</span>
                    <textarea
                        value={form.description ?? ""}
                        onChange={(e) => setForm({ ...form, description: e.target.value || undefined })}
                        rows={4}
                        style={textareaStyle}
                    />
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <label style={{ display: "grid", gap: 6 }}>
                        <span>Priority</span>
                        <select
                            value={form.priority ?? ""}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    priority: (e.target.value || undefined) as Form["priority"],
                                })
                            }
                            style={inputStyle}
                        >
                            <option value="">—</option>
                            <option value="low">low</option>
                            <option value="medium">medium</option>
                            <option value="high">high</option>
                        </select>
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                        <span>Due (YYYY-MM-DD)</span>
                        <input
                            type="date"
                            value={form.due ?? ""}
                            onChange={(e) => setForm({ ...form, due: e.target.value || undefined })}
                            style={inputStyle}
                        />
                    </label>
                </div>

                <label style={{ display: "grid", gap: 6 }}>
                    <span>Assignee</span>
                    <select
                        value={form.assigneeId ?? ""}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                assigneeId: e.target.value === "" ? null : Number(e.target.value),
                            })
                        }
                        style={inputStyle}
                    >
                        <option value="">Unassigned</option>
                        {members.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.username} (#{m.id})
                            </option>
                        ))}
                    </select>
                    <small style={{ color: "#6b7280" }}>Pick a team member.</small>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" checked={form.completed} onChange={onToggleCompleted} />
                    <span>Completed</span>
                </label>

                <div style={{ display: "flex", gap: 12 }}>
                    <button type="button" onClick={onCancel} disabled={!dirty || saving} style={btnSecondary}>
                        Cancel
                    </button>
                    <button type="submit" disabled={!dirty || saving} style={btnPrimary}>
                        {saving ? "Saving…" : "Submit"}
                    </button>
                    <div style={{ flex: 1 }} />
                    <button type="button" onClick={onDelete} disabled={saving} style={btnDanger}>
                        Delete
                    </button>
                </div>

                <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Last updated: {task.updatedAt ?? "—"} · Created: {task.createdAt ?? "—"}
                </div>
            </form>
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "8px 10px",
    background: "#fff",
};

const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    resize: "vertical",
};

const btnPrimary: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "#f9fafb",
    color: "#111827",
    cursor: "pointer",
};

const btnDanger: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #dc2626",
    background: "#fee2e2",
    color: "#991b1b",
    cursor: "pointer",
};
