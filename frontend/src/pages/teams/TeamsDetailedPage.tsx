// Team administration page (for a single team).
// Purpose:
// - Load team metadata and current members.
// - Allow editing basic team properties (name, description).
// - Allow inviting a new member by numeric userId.
// - Allow removing a member.
// - Allow deleting the team (irreversible) and returning to /teams.
//
// Data flow:
// 1) On mount, fetch team and members in parallel → hydrate local state and edit form.
// 2) "Dirty" flag is derived from a memo that compares form vs. loaded team.
// 3) Save: PATCH team (defensive trim), then update state with returned server copy.
// 4) Invite: validate numeric userId, add member, then refresh member list.
// 5) Remove: confirm, call remove, optimistically filter from local state.
// 6) Delete: confirm, delete team, navigate back to list.
//
// Error handling:
// - All mutating operations set `saving=true` and surface errors into `state.error`.
// - Read failures surface into `state.error` and stop the loading spinner.
// - A simple `confirm()` is used for destructive actions.
//
// UX notes:
// - The "Back to Team tasks" link returns to the non-admin team view.
// - "Save changes" is enabled only when the form is dirty and not saving.

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
    getTeamById,
    listTeamMembers,
    adminAddMember,
    adminRemoveMember,
    updateTeam,
    deleteTeam,
    type Team,
    type TeamMember,
    type TeamPatch,
} from "../../api/team";

// Aggregate local UI state for this screen.
// - `team`: the canonical server copy for comparison and rendering.
// - `members`: current membership list.
// - `loading`: initial data is being fetched.
// - `saving`: a mutation is in-flight (save/invite/remove/delete).
// - `error`: user-friendly error text for inline display.
type State = {
    team: Team | null;
    members: TeamMember[];
    loading: boolean;
    saving: boolean;
    error: string | null;
};

export default function TeamsDetailedPage() {
    // Router params and navigation helper.
    const { id } = useParams();
    const teamId = Number(id);
    const navigate = useNavigate();

    // Page state: canonical data, spinners, and errors.
    const [state, setState] = useState<State>({
        team: null,
        members: [],
        loading: true,
        saving: false,
        error: null,
    });

    // Edit form model for PATCH. Initialized after team load.
    const [form, setForm] = useState<TeamPatch>({ name: "", description: "" });

    // Temporary input for "invite by userId".
    const [inviteId, setInviteId] = useState<string>("");

    // Derived "dirty" flag—only enable "Save" when the form differs from the loaded team.
    const dirty = useMemo(
        () =>
            state.team
                ? (form.name ?? "") !== (state.team.name ?? "") ||
                (form.description ?? "") !== (state.team.description ?? "")
                : false,
        [form, state.team]
    );

    // Initial load: fetch team + members concurrently.
    // The `cancel` guard prevents state updates after unmount.
    useEffect(() => {
        let cancel = false;
        (async () => {
            try {
                setState((s) => ({ ...s, loading: true, error: null }));
                const [t, ms] = await Promise.all([
                    getTeamById(teamId),
                    listTeamMembers(teamId),
                ]);
                if (cancel) return;
                setState({ team: t, members: ms, loading: false, saving: false, error: null });
                // Seed the form with server values (avoid undefineds).
                setForm({ name: t.name, description: t.description ?? "" });
            } catch (e) {
                setState((s) => ({
                    ...s,
                    loading: false,
                    error: e instanceof Error ? e.message : String(e),
                }));
            }
        })();
        return () => { cancel = true; };
    }, [teamId]);

    // Persist team edits. Defensive trimming and fallback values protect against empty payloads.
    async function onSaveTeam(e: React.FormEvent) {
        e.preventDefault();
        if (!state.team || !dirty) return;
        try {
            setState((s) => ({ ...s, saving: true, error: null }));
            const updated = await updateTeam(state.team.id, {
                name: form.name?.trim() || state.team.name,
                description: form.description?.trim() || "",
            });
            // Replace canonical team in state with the authoritative server response.
            setState((s) => ({ ...s, team: updated, saving: false }));
        } catch (e) {
            setState((s) => ({
                ...s,
                saving: false,
                error: e instanceof Error ? e.message : String(e),
            }));
        }
    }

    // Invite a member by numeric userId. On success, re-fetch members for consistency.
    async function onInvite(e: React.FormEvent) {
        e.preventDefault();
        if (!state.team) return;

        const trimmed = inviteId.trim();
        // Input-level validation to prevent accidental strings or empty values.
        if (!/^\d+$/.test(trimmed)) {
            setState(s => ({ ...s, error: "Please enter a numeric user ID." }));
            return;
        }
        const userId = Number(trimmed);

        try {
            setState(s => ({ ...s, saving: true, error: null }));
            await adminAddMember(state.team.id, userId, "MEMBER");
            // Pull the fresh list to reflect server-side role defaults or normalization.
            const ms = await listTeamMembers(state.team.id);
            setState(s => ({ ...s, members: ms, saving: false }));
            setInviteId("");
        } catch (e) {
            setState(s => ({
                ...s,
                saving: false,
                error: e instanceof Error ? e.message : String(e),
            }));
        }
    }

    // Remove member with a guard confirm. Optimistic local removal after success.
    async function onRemoveMember(userId: number) {
        if (!state.team) return;
        if (!confirm("Remove this member from the team?")) return;
        try {
            setState((s) => ({ ...s, saving: true, error: null }));
            await adminRemoveMember(state.team.id, userId);
            setState((s) => ({
                ...s,
                members: s.members.filter((m) => m.id !== userId),
                saving: false,
            }));
        } catch (e) {
            setState((s) => ({
                ...s,
                saving: false,
                error: e instanceof Error ? e.message : String(e),
            }));
        }
    }

    // Delete team with a guard confirm. On success, redirect to the team list.
    async function onDeleteTeam() {
        if (!state.team) return;
        if (!confirm("Delete this team? This cannot be undone.")) return;
        try {
            setState((s) => ({ ...s, saving: true, error: null }));
            await deleteTeam(state.team.id);
            navigate("/teams", { replace: true });
        } catch (e) {
            setState((s) => ({
                ...s,
                saving: false,
                error: e instanceof Error ? e.message : String(e),
            }));
        }
    }

    // Basic loading/error/empty guards to keep the render path simple and predictable.
    if (state.loading) return <div>Loading…</div>;
    if (state.error) return <div style={{ color: "crimson" }}>{state.error}</div>;
    if (!state.team) return null;

    return (
        <div style={{ maxWidth: 760 }}>
            {/* Header with back-link to the non-admin team task view and a destructive "Delete" action */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>Team #{state.team.id}</h2>
                <Link to={`/teams/${teamId}`}>Back to Team tasks</Link>
                <div style={{ marginLeft: "auto" }}>
                    <button onClick={onDeleteTeam} style={btnDanger} disabled={state.saving}>
                        Delete team
                    </button>
                </div>
            </div>

            {/* Team edit form: simple two-field PATCH with dirty/save state */}
            <form onSubmit={onSaveTeam} style={{ display: "grid", gap: 12, marginBottom: 20 }}>
                <label style={{ display: "grid", gap: 6 }}>
                    <span>Name</span>
                    <input
                        value={form.name ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        required
                        style={input}
                    />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                    <span>Description</span>
                    <textarea
                        rows={3}
                        value={form.description ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        style={textarea}
                    />
                </label>
                <div>
                    <button type="submit" disabled={!dirty || state.saving} style={btnPrimary}>
                        {state.saving ? "Saving…" : "Save changes"}
                    </button>
                </div>
            </form>

            {/* Minimal "invite by userId" utility. A richer UX could search by username/email. */}
            <form onSubmit={onInvite} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20 }}>
                <strong>Invite by user ID:</strong>
                <input
                    value={inviteId}
                    onChange={(e) => setInviteId(e.target.value)}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="e.g. 42"
                    style={{ ...input, maxWidth: 180 }}
                />
                <button type="submit" disabled={!inviteId.trim() || state.saving} style={btnSecondary}>
                    Invite
                </button>
            </form>

            {/* Members section with inline "Remove" actions */}
            <div style={{ marginTop: 8 }}>
                <h3 style={{ margin: "8px 0" }}>Members</h3>
                {state.members.length === 0 ? (
                    <div style={{ color: "#6b7280" }}>No members yet.</div>
                ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                        {state.members.map((m) => (
                            <li key={m.id}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    padding: "8px 10px",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 8,
                                    marginBottom: 8,
                                }}>
                                <div style={{ flex: 1 }}>
                                    <strong>{m.username}</strong>{" "}
                                    <span style={{ color: "#6b7280" }}>({m.role})</span>
                                </div>
                                <button onClick={() => onRemoveMember(m.id)} style={btnLight} disabled={state.saving}>
                                    Remove
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

// Inline style tokens for visual consistency with the rest of the app.
const input: React.CSSProperties = {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "8px 10px",
    background: "#fff",
};
const textarea: React.CSSProperties = { ...input, resize: "vertical" };
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
const btnLight: React.CSSProperties = {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "#f3f4f6",
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
