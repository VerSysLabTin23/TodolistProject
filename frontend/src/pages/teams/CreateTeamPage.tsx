import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTeam, addMember, type Team } from "../../api/team";

function currentUserId(): number | null {
    try {
        const raw = localStorage.getItem("currentUser");
        if (!raw) return null;
        const o = JSON.parse(raw);
        return typeof o?.id === "number" ? o.id : null;
    } catch {
        return null;
    }
}

export default function CreateTeamPage() {
    const uid = useMemo(currentUserId, []);
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) {
            setErr("Name is required");
            return;
        }
        setErr(null);
        setSaving(true);
        try {
            // 1) create team
            const team: Team = await createTeam({
                name: name.trim(),
                description: description.trim() || undefined,
            });

            // 2) ensure creator is owner (if backend didn’t already do it)
            if (uid != null) {
                try { await addMember(team.id, uid, "owner"); } catch { /* ignore 409/403 */ }
            }

            // 3) go to team details
            navigate(`/teams/${team.id}`);
        } catch (e) {
            setErr(e instanceof Error ? e.message : "Failed to create team");
        } finally {
            setSaving(false);
        }
    }

    return (
        <section style={{ maxWidth: 720, margin: "0 auto" }}>
            <h1 style={{ marginBottom: 12 }}>Create a new team</h1>

            <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
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

                <div style={{ display: "flex", gap: 8 }}>
                    <button type="submit" disabled={saving}>
                        {saving ? "Creating…" : "Create team"}
                    </button>
                    <button type="button" onClick={() => navigate(-1)} disabled={saving}>
                        Cancel
                    </button>
                </div>
            </form>
        </section>
    );
}
