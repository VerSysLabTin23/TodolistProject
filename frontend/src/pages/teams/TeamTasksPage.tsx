// Team-scoped task board.
// Purpose:
// - Display tasks for a single team, supporting create/complete/delete.
// - Listen to realtime task events and reconcile UI state live.
// - Offer a lightweight input to quickly add new tasks.
//
// Data flow:
// 1) On mount, fetch team metadata + current task list.
// 2) Subscribe to WS events (task.created/updated/completed/deleted) for this team only.
// 3) Create task: POST → unshift into list.
// 4) Toggle completion: call API and flip local state (optimistic but consistent).
// 5) Delete: confirm → call API → filter from list.
//
// Error handling:
// - Requests surface human-readable messages into `error`.
// - The realtime handler is throttled to avoid excessive re-renders under bursts.

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    listTasksForTeam,
    createTaskInTeam,
    setCompleted,
    deleteTask,
    type Task,
} from "../../api/task";
import { getTeamById, type Team } from "../../api/team";
import type { TaskEvent } from "../../realtime/ws";
import { useRealtime } from "../../realtime/useRealtime";
import { patchFromEventPayload } from "../../realtime/eventPatch";

// Normalize error objects into strings for inline display.
function err(e: unknown) { return e instanceof Error ? e.message : String(e); }

export default function TeamTasksPage() {
    // Team context (from route param).
    const { id } = useParams();
    const teamId = Number(id);

    // Local state for page concerns.
    const [team, setTeam] = useState<Team | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTitle, setNewTitle] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Derived state: basic validation for the "Add" button.
    const canAdd = useMemo(() => newTitle.trim().length > 0, [newTitle]);

    // Initial fetch: team metadata and its tasks in parallel.
    useEffect(() => {
        let cancel = false;
        (async () => {
            try {
                setLoading(true);
                const [t, list] = await Promise.all([
                    getTeamById(teamId),
                    listTasksForTeam(teamId),
                ]);
                if (cancel) return;
                setTeam(t);
                setTasks(list);
            } catch (e) {
                setError(err(e));
            } finally {
                if (!cancel) setLoading(false);
            }
        })();
        return () => { cancel = true; };
    }, [teamId]);

    // Realtime subscription: apply server-originated changes to local state.
    // - Only handle events that match the current teamId.
    // - Use a small throttle to batch bursts.
    useRealtime((evt: TaskEvent) => {
        if (evt.teamId !== teamId) return;
        const patch = patchFromEventPayload(evt);
        setTasks(prev => {
            switch (evt.eventType) {
                case "task.created":
                    // Add only if not already present (protect against duplicate deliveries).
                    if (prev.some(x => x.id === evt.taskId)) return prev;
                    return [{ id: evt.taskId, teamId, title: patch.title ?? "New task", completed: !!patch.completed, ...patch } as Task, ...prev];
                case "task.updated":
                case "task.completed":
                    // Merge server patch into the matching task.
                    return prev.map(t => t.id === evt.taskId ? ({ ...t, ...patch } as Task) : t);
                case "task.deleted":
                    // Remove task from local list.
                    return prev.filter(t => t.id !== evt.taskId);
                default:
                    return prev;
            }
        });
    }, { throttleMs: 120 });

    // Create a new task with a minimal payload (title only).
    async function addTask() {
        const title = newTitle.trim();
        if (!title) return;
        try {
            setSaving(true);
            const created = await createTaskInTeam(teamId, { title });
            // Prepend new tasks for immediacy.
            setTasks(prev => [created, ...prev]);
            setNewTitle("");
        } catch (e) {
            setError(err(e));
        } finally {
            setSaving(false);
        }
    }

    // Toggle completion. Local state is flipped on success.
    async function toggle(t: Task) {
        try {
            await setCompleted(t.id, !t.completed);
            setTasks(prev => prev.map(x => x.id === t.id ? { ...x, completed: !x.completed } : x));
        } catch (e) {
            setError(err(e));
        }
    }

    // Delete a task after confirmation.
    async function remove(t: Task) {
        if (!confirm("Delete this task?")) return;
        try {
            await deleteTask(t.id);
            setTasks(prev => prev.filter(x => x.id !== t.id));
        } catch (e) {
            setError(err(e));
        }
    }

    // Guarded renders for UX clarity.
    if (loading) return <div>Loading…</div>;
    if (error) return <div style={{ color: "crimson" }}>{error}</div>;
    if (!team) return null;

    return (
        <section style={{ maxWidth: 900, margin: "0 auto" }}>
            {/* Heading with link to the admin/manage view for the same team */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1 style={{ margin: 0 }}>Team #{team.id} — Tasks</h1>
                <Link to={`/teams/${team.id}/manage`}><button style={btnLight}>Manage team</button></Link>
            </div>

            {/* Quick-add input with basic validation */}
            <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
                <input
                    placeholder="New task title…"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    style={input}
                />
                <button onClick={addTask} disabled={!canAdd || saving} style={btnPrimary}>Add</button>
            </div>

            {/* Task list with simple actions */}
            {tasks.length === 0 ? (
                <div style={{ color: "#6b7280" }}>No tasks yet.</div>
            ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {tasks.map(t => (
                        <li key={t.id} style={row}>
                            <Link to={`/tasks/${t.id}`} style={{ textDecoration: t.completed ? "line-through" : "none" }}>
                                {t.title}
                            </Link>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={() => toggle(t)} style={btnSecondary}>
                                    {t.completed ? "Mark open" : "Mark done"}
                                </button>
                                <button onClick={() => remove(t)} style={btnDanger}>Delete</button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

// Minimal inline tokens for consistent look-and-feel.
const input: React.CSSProperties = { border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px", flex: 1 };
const row: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center", padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 8, background: "#fff" };
const btnPrimary: React.CSSProperties = { padding: "8px 12px", borderRadius: 8, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", cursor: "pointer" };
const btnSecondary: React.CSSProperties = { padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", background: "#f9fafb", cursor: "pointer" };
const btnDanger: React.CSSProperties = { padding: "6px 10px", borderRadius: 8, border: "1px solid #dc2626", background: "#fee2e2", color: "#991b1b", cursor: "pointer" };
const btnLight: React.CSSProperties = { padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f3f4f6", cursor: "pointer" };
