// Create a new team, then (best-effort) add the current user as OWNER,
// and redirect to the new team’s task view.

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTeam, addMember, type Team } from "../../api/team";

// Helper to read current user id from localStorage
function currentUserId(): number | null {
    try {
        const raw = localStorage.getItem("currentUser");
        if (!raw) return null;
        const o = JSON.parse(raw);
        return typeof o?.id === "number" ? o.id : null;
    } catch { return null; }
}

export default function CreateTeamPage() {
    const navigate = useNavigate();
    const uid = useMemo(currentUserId, []); // compute once

    // Form + request state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // Submit handler
    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) { setErr("Name is required"); return; }

        setErr(null);
        setSaving(true);
        try {
            // 1) Create team with name/description
            const team: Team = await createTeam({
                name: name.trim(),
                description: description.trim() || undefined,
            });

            // 2) Ensure creator is OWNER (ignore 409/conflict errors)
            if (uid != null) {
                try { await addMember(team.id, uid, "OWNER"); } catch { /* ignore */ }
            }

            // 3) Navigate to the new team task page
            navigate(`/teams/${team.id}`);
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Failed to create team";
            setErr(msg);
        } finally {
            setSaving(false);
        }
    }

    // UI form
    return (
        <section style={{ maxWidth: 700, margin: "0 auto" }}>
            <h1>Create a new team</h1>
            <form onSubmit={submit} style={{ display: "grid", gap: 12, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
                <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>Team name*</span>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Development Team"
                        required
                    />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>Description</span>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        placeholder="Optional"
                    />
                </label>

                {err ? <div style={{ color: "crimson", fontSize: 13 }}>{err}</div> : null}

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button type="button" onClick={() => navigate(-1)} disabled={saving}>Cancel</button>
                    <button type="submit" disabled={saving}>{saving ? "Creating…" : "Create team"}</button>
                </div>
            </form>
        </section>
    );
}
