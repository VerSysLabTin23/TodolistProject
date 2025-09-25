import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    getTask,
    updateTask,
    deleteTask,
    setAssignee,
    setCompleted,
    type Task,
} from "../../api/task";
import { useRealtime } from "../../realtime/useRealtime";
import type { TaskEvent } from "../../realtime/ws";
import { patchFromEventPayload } from "../../realtime/eventPatch";

type Draft = {
    title: string;
    description: string;
    priority: Task["priority"];
    due: string;
    assigneeId: number | "" | undefined; // "" for UI empty state
};

function toDraft(t: Task): Draft {
    return {
        title: t.title,
        description: t.description ?? "",
        priority: t.priority,
        due: t.due ?? "",
        assigneeId: t.assigneeId ?? "",
    };
}

function fromDraft(d: Draft): Partial<Task> {
    return {
        title: d.title.trim(),
        description: d.description.trim() || undefined,
        priority: d.priority || undefined,
        due: d.due || undefined,
        assigneeId: d.assigneeId === "" ? undefined : d.assigneeId,
    };
}

export default function TaskDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const taskId = Number(id);
    const navigate = useNavigate();

    const [task, setTask] = useState<Task | null>(null);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // track if user is actively editing; while dirty, we won't overwrite the form with WS patches
    const isDirty = useMemo(() => {
        if (!task || !draft) return false;
        const now = fromDraft(draft);
        return (
            now.title !== task.title ||
            (now.description ?? "") !== (task.description ?? "") ||
            (now.priority ?? "") !== (task.priority ?? "") ||
            (now.due ?? "") !== (task.due ?? "") ||
            (now.assigneeId ?? "") !== (task.assigneeId ?? "")
        );
    }, [task, draft]);

    // initial load
    useEffect(() => {
        let canceled = false;
        async function load() {
            if (!Number.isFinite(taskId)) {
                setErr("Invalid task id");
                setLoading(false);
                return;
            }
            try {
                const t = await getTask(taskId);
                if (!canceled) {
                    setTask(t);
                    setDraft(toDraft(t));
                }
            } catch {
                if (!canceled) setErr("Failed to load task");
            } finally {
                if (!canceled) setLoading(false);
            }
        }
        load();
        return () => {
            canceled = true;
        };
    }, [taskId]);

    // realtime merge: if user is editing (dirty), keep their draft; otherwise apply patch
    useRealtime((evt: TaskEvent) => {
        if (!Number.isFinite(taskId) || evt.taskId !== taskId) return;

        if (evt.eventType === "task.deleted") {
            navigate("/tasks");
            return;
        }

        const patch = patchFromEventPayload(evt);
        setTask((prev) => {
            if (!prev) return prev;
            const merged: Task = { ...prev, ...patch };
            // only refresh the draft if user is not editing
            if (!isDirty) setDraft(toDraft(merged));
            return merged;
        });
    }, { throttleMs: 120 });

    async function saveAll() {
        if (!task || !draft) return;
        setSaving(true);
        try {
            const payload = fromDraft(draft);
            const updated = await updateTask(task.id, payload);
            setTask(updated);
            setDraft(toDraft(updated)); // reset dirty state
        } catch {
            alert("Save failed");
        } finally {
            setSaving(false);
        }
    }

    function cancelEdits() {
        if (task) setDraft(toDraft(task));
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

    async function toggleComplete() {
        if (!task) return;
        try {
            const updated = await setCompleted(task.id, !task.completed);
            setTask(updated);
            if (!isDirty) setDraft(toDraft(updated));
        } catch {
            alert("Complete toggle failed");
        }
    }

    async function commitAssignee() {
        if (!task || !draft) return;
        const v = draft.assigneeId === "" ? null : Number(draft.assigneeId);
        try {
            const updated = await setAssignee(task.id, v);
            setTask(updated);
            if (!isDirty) setDraft(toDraft(updated));
        } catch {
            alert("Setting assignee failed");
        }
    }

    if (loading) return <div>Loading…</div>;
    if (err) return <div style={{ color: "crimson" }}>{err}</div>;
    if (!task || !draft) return <div>Not found</div>;

    return (
        <section style={{ maxWidth: 720, margin: "0 auto" }}>
            <h1>Task #{task.id}</h1>

            <div style={{ display: "grid", gap: 10 }}>
                <label>
                    Title
                    <input
                        value={draft.title}
                        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                        style={{ width: "100%", padding: 8 }}
                    />
                </label>

                <label>
                    Description
                    <textarea
                        value={draft.description}
                        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                        rows={4}
                        style={{ width: "100%", padding: 8 }}
                    />
                </label>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <label>
                        Priority
                        <select
                            value={draft.priority ?? ""}
                            onChange={(e) =>
                                setDraft({
                                    ...draft,
                                    priority: (e.target.value || undefined) as Task["priority"],
                                })
                            }
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
                            value={draft.due}
                            onChange={(e) => setDraft({ ...draft, due: e.target.value })}
                        />
                    </label>

                    <label>
                        Assignee (userId)
                        <input
                            type="number"
                            value={draft.assigneeId === undefined ? "" : draft.assigneeId}
                            onChange={(e) =>
                                setDraft({
                                    ...draft,
                                    assigneeId:
                                        e.target.value === "" ? "" : Number(e.target.value),
                                })
                            }
                            onBlur={commitAssignee}
                            style={{ width: 120 }}
                        />
                    </label>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                    <button onClick={toggleComplete}>
                        {task.completed ? "Mark as not completed" : "Mark as completed"}
                    </button>

                    <button
                        onClick={saveAll}
                        disabled={saving || !isDirty}
                        style={{ fontWeight: 600 }}
                        title={!isDirty ? "No changes to save" : undefined}
                    >
                        {saving ? "Saving…" : "Save"}
                    </button>

                    <button
                        onClick={cancelEdits}
                        disabled={!isDirty || saving}
                        title={!isDirty ? "Nothing to cancel" : undefined}
                    >
                        Cancel
                    </button>

                    <button onClick={onDelete} style={{ color: "crimson", marginLeft: "auto" }}>
                        Delete
                    </button>
                </div>

                <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Team #{task.teamId} • created {task.createdAt || "—"} • updated{" "}
                    {task.updatedAt || "—"}
                </div>
            </div>
        </section>
    );
}
