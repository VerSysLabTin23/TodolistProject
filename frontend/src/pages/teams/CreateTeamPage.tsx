import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {  createTeam } from "../../api/team";

export default function CreateTeamPage() {
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
            // Create team — backend automatically makes the creator a member/owner
            const team = await createTeam({
                name: name.trim(),
                description: description.trim() || undefined,
            });

            // Go straight to the team page
            navigate(`/teams/${team.id}`, { replace: true });
        } catch (e) {
            setErr(e instanceof Error ? e.message : "Failed to create team");
        } finally {
            setSaving(false);
        }
    }

    return (
        <section style={{ maxWidth: 720, margin: "0 auto" }}>
            <h1>Create a new team</h1>

            <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 12 }}>
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
                    <button type="button" disabled={saving} onClick={() => navigate("/teams")}>
                        Cancel
                    </button>
                </div>
            </form>
        </section>
    );
}
