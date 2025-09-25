import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
    getTeamById,
    listTeamMembers,
    adminUpdateTeam,
    adminAddMember,
    adminRemoveMember,
    adminSetMemberRole,
    type Team,
    type TeamMember,
    type TeamRole,
} from "../../api/team";

export default function TeamAdminDetailPage() {
    const { id } = useParams<{ id: string }>();
    const teamId = Number(id);

    const [team, setTeam] = useState<Team | null>(null);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    // add member form
    const [newUserId, setNewUserId] = useState("");
    const [newRole, setNewRole] = useState<TeamRole>("MEMBER");

    const roleOptions: TeamRole[] = ["OWNER", "ADMIN", "MEMBER"];

    // const memberById = useMemo(() => {
    //     const m = new Map<number, TeamMember>();
    //     members.forEach((u) => m.set(u.id, u));
    //     return m;
    // }, [members]);

    useEffect(() => {
        let cancel = false;
        async function load() {
            if (!Number.isFinite(teamId)) { setErr("Invalid team id"); setLoading(false); return; }
            setErr(null);
            try {
                const [t, ms] = await Promise.all([getTeamById(teamId), listTeamMembers(teamId)]);
                if (cancel) return;
                setTeam(t);
                setMembers(ms);
                setName(t.name);
                setDescription(t.description ?? "");
            } catch (e) {
                if (!cancel) setErr(e instanceof Error ? e.message : "Failed to load team");
            } finally {
                if (!cancel) setLoading(false);
            }
        }
        void load();
        return () => { cancel = true; };
    }, [teamId]);

    async function onSaveTeam() {
        try {
            const updated = await adminUpdateTeam(teamId, {
                name: name.trim() || team?.name,
                description: description.trim() || undefined,
            });
            setTeam(updated);
        } catch (e) {
            alert(e instanceof Error ? e.message : "Update failed");
        }
    }

    async function onAddMember(e: React.FormEvent) {
        e.preventDefault();
        const uid = Number(newUserId);
        if (!Number.isFinite(uid)) {
            alert("Enter numeric userId");
            return;
        }
        try {
            const added = await adminAddMember(teamId, uid, newRole);
            setMembers((prev) => {
                const exists = prev.some((m) => m.id === added.id);
                return exists ? prev.map((m) => (m.id === added.id ? added : m)) : [added, ...prev];
            });
            setNewUserId("");
            setNewRole("MEMBER");
        } catch (e) {
            alert(e instanceof Error ? e.message : "Add member failed");
        }
    }

    async function onRemoveMember(userId: number) {
        if (!confirm(`Remove user ${userId} from team?`)) return;
        try {
            await adminRemoveMember(teamId, userId);
            setMembers((prev) => prev.filter((m) => m.id !== userId));
        } catch (e) {
            alert(e instanceof Error ? e.message : "Remove failed");
        }
    }

    async function onChangeRole(userId: number, role: TeamRole) {
        try {
            const updated = await adminSetMemberRole(teamId, userId, role);
            setMembers((prev) => prev.map((m) => (m.id === userId ? updated : m)));
        } catch (e) {
            alert(e instanceof Error ? e.message : "Change role failed");
        }
    }

    if (loading) return <div>Loading…</div>;
    if (err) return <div style={{ color: "crimson" }}>{err}</div>;
    if (!team) return <div>Not found</div>;

    return (
        <section style={{ maxWidth: 900, margin: "0 auto" }}>
            <h1>Admin: Team #{team.id}</h1>

            {/* Team settings */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <strong>Team settings</strong>
                <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                    <label style={{ display: "grid", gap: 4 }}>
                        <span style={{ fontSize: 12, color: "#6b7280" }}>Name</span>
                        <input value={name} onChange={(e) => setName(e.target.value)} />
                    </label>
                    <label style={{ display: "grid", gap: 4 }}>
                        <span style={{ fontSize: 12, color: "#6b7280" }}>Description</span>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                    </label>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button onClick={onSaveTeam}>Save settings</button>
                    </div>
                </div>
            </div>

            {/* Members */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
                <strong>Members</strong>

                <form onSubmit={onAddMember} style={{ display: "flex", gap: 8, margin: "8px 0 12px" }}>
                    <input
                        placeholder="userId"
                        value={newUserId}
                        onChange={(e) => setNewUserId(e.target.value)}
                        style={{ width: 120 }}
                    />
                    <select value={newRole} onChange={(e) => setNewRole(e.target.value as TeamRole)}>
                        {roleOptions.map((r) => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                    <button type="submit">Add member</button>
                </form>

                {members.length === 0 ? (
                    <div style={{ color: "#6b7280" }}>No members.</div>
                ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                        {members.map((m) => (
                            <li key={m.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                                <div><strong>#{m.id}</strong></div>
                                <div>{m.username}</div>
                                <div>
                                    <select
                                        value={m.role}
                                        onChange={(e) => onChangeRole(m.id, e.target.value as TeamRole)}
                                    >
                                        {roleOptions.map((r) => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                    <button onClick={() => onRemoveMember(m.id)} style={{ color: "crimson" }}>Remove</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
