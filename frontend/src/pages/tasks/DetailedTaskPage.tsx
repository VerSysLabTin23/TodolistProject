// Full-featured single-task editor: loads one task, lets you edit,
// assign to a team member, toggle completion, delete, and stays in sync via WS.

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
    getTask,          // GET /tasks/:id
    updateTask,       // PUT /tasks/:id
    deleteTask,       // DELETE /tasks/:id
    setCompleted,     // POST /tasks/:id/complete
    setAssignee,      // PUT /tasks/:id/assignee
    type Task,
} from "../../api/task";
import type { TaskEvent } from "../../realtime/ws";
import { useRealtime } from "../../realtime/useRealtime";
import { patchFromEventPayload } from "../../realtime/eventPatch";
import { listTeamMembers, type TeamMember } from "../../api/team";

// Local form model mirrors editable Task fields
type Form = {
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high";
    due?: string;               // YYYY-MM-DD
    assigneeId?: number | null;
    completed: boolean;
};

// Convert Task → Form for the UI
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

// Shallow diff between two records to build a PATCH payload
function diffPatch<A extends Record<string, unknown>>(a: A, b: A): Partial<A> {
    const out: Partial<A> = {};
    (Object.keys(a) as Array<keyof A>).forEach((k) => {
        if (a[k] !== b[k]) out[k] = b[k];
    });
    return out;
}

// Normalize unknown → string error
function errorMessage(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
}

export default function DetailedTaskPage() {
    // Read :id from the URL and cast to number
    const { id } = useParams();
    const taskId = Number(id);
    const navigate = useNavigate();

    // Main server object + form state + initial snapshot for dirty-checking
    const [task, setTask] = useState<Task | null>(null);
    const [form, setForm] = useState<Form | null>(null);
    const [initial, setInitial] = useState<Form | null>(null);

    // Team members used to populate the assignee dropdown
    const [members, setMembers] = useState<TeamMember[]>([]);

    // Request flags + error
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // True if current form differs from initial snapshot
    const dirty = useMemo(
        () => (form && initial ? JSON.stringify(form) !== JSON.stringify(initial) : false),
        [form, initial]
    );

    // Initial load: task + team members (for assignee list)
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

                // Load team members for assignee dropdown (non-fatal if it fails)
                try {
                    const ms = await listTeamMembers(t.teamId);
                    if (!cancelled) setMembers(ms);
                } catch { /* ignore */ }
            } catch (e: unknown) {
                setError(errorMessage(e) || "Failed to load task.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [taskId]);

    // Realtime subscription: keep this task in sync with server events
    useRealtime(
        (evt: TaskEvent) => {
            if (!task) return;
            if (evt.taskId !== task.id) return; // ignore events for other tasks

            if (evt.eventType === "task.deleted") {
                // If someone else deletes this task, go back to the list
                navigate("/tasks", { replace: true });
                return;
            }

            // Merge server patch into our task (and into the form if not currently edited)
            const patch = patchFromEventPayload(evt); // Partial<Task>
            setTask((prev) => (prev ? { ...prev, ...patch } : prev));

            // Only auto-apply into the form if it's "clean"
            if (!dirty && form) {
                const next = { ...form, ...patch };
                setForm(next);
                setInitial(next);
            }
        },
        { throttleMs: 120 } // avoid flooding renders
    );

    // Handle submit: update assignee via its endpoint, others via PUT /tasks/:id
    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!task || !form || !initial) return;

        // Compute changed fields
        const patch = diffPatch<Form>(initial, form);
        if (Object.keys(patch).length === 0) return;

        try {
            setSaving(true);

            // Assignee updates on a dedicated endpoint
            if (Object.prototype.hasOwnProperty.call(patch, "assigneeId")) {
                await setAssignee(task.id, form.assigneeId ?? null);
                setTask((prev) => (prev ? { ...prev, assigneeId: form.assigneeId ?? null } : prev));
                delete (patch as Partial<Form>).assigneeId; // rest handled below
            }

            // Remaining fields updated via PUT /tasks/:id
            if (Object.keys(patch).length > 0) {
                const updated = await updateTask(task.id, patch);
                setTask(updated);
                const next = toForm(updated);
                setForm(next);
                setInitial(next);
            } else {
                // If only assignee changed, resync form from existing + assignee
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

    // Restore form back to last-saved values
    function onCancel() {
        if (initial) setForm(initial);
    }

    // Toggle completion via server, then resync form
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

    // Delete the task with confirmation and navigate away
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

    // Loading / error / null guards
    if (loading) return <div>Loading…</div>;
    if (error) return <div style={{ color: "crimson" }}>{error}</div>;
    if (!task || !form) return null;

    // UI
    return (
        <div style={{ maxWidth: 720 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <h2 style={{ margin: 0 }}>Task #{task.id}</h2>
                {/* Link back to this task’s team overview */}
                <Link to={`/teams/${task.teamId}`}>Back to Team</Link>
            </div>

            <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
                {/* Title */}
                <label style={{ display: "grid", gap: 6 }}>
                    <span>Title</span>
                    <input
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        required
                        style={inputStyle}
                    />
                </label>

                {/* Description */}
                <label style={{ display: "grid", gap: 6 }}>
                    <span>Description</span>
                    <textarea
                        value={form.description ?? ""}
                        onChange={(e) => setForm({ ...form, description: e.target.value || undefined })}
                        rows={4}
                        style={textareaStyle}
                    />
                </label>

                {/* Priority + Due */}
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

                {/* Assignee */}
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

                {/* Completed */}
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" checked={form.completed} onChange={onToggleCompleted} />
                    <span>Completed</span>
                </label>

                {/* Actions */}
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

                {/* Meta */}
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Last updated: {task.updatedAt ?? "—"} · Created: {task.createdAt ?? "—"}
                </div>
            </form>
        </div>
    );
}

// Reusable styles
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
