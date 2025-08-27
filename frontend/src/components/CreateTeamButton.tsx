import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTeam, type Team } from "../api/team";

type Props = {
    onCreated?: (team: Team) => void;   // allow parent to update its list
    small?: boolean;                    // compact button if you want
};

export default function CreateTeamButton({ onCreated, small }: Props) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return alert("Team name is required.");
        setSubmitting(true);
        try {
            const team = await createTeam({ name: name.trim(), description: description.trim() || undefined });
            onCreated?.(team);
            // go to the new team page
            navigate(`/teams/${team.id}`);
            // reset
            setName(""); setDescription(""); setOpen(false);
        } catch (err) {
            alert("Failed to create team.");
        } finally {
            setSubmitting(false);
        }
    }

    if (!open) {
        return (
            <button onClick={() => setOpen(true)} style={{ padding: small ? "4px 8px" : "6px 12px" }}>
                + Create team
            </button>
        );
    }

    return (
        <form onSubmit={handleSubmit}
              style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 2fr auto",
                  gap: 8,
                  alignItems: "end",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: 10,
                  background: "#fff",
              }}>
            <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 12, color: "#6b7280" }}>Name*</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Platform Team" required />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 12, color: "#6b7280" }}>Description</span>
                <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="optional" />
            </label>
            <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" disabled={submitting}>{submitting ? "Creating…" : "Create"}</button>
                <button type="button" onClick={() => setOpen(false)}>Cancel</button>
            </div>
        </form>
    );
}
