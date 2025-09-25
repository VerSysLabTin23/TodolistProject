import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminListAllTeams, type Team } from "../../api/team";

export default function TeamsAdminPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        let cancel = false;
        async function load() {
            setErr(null);
            try {
                const t = await adminListAllTeams();
                if (!cancel) setTeams(t);
            } catch (e) {
                if (!cancel) setErr(e instanceof Error ? e.message : "Failed to load teams");
            } finally {
                if (!cancel) setLoading(false);
            }
        }
        void load();
        return () => { cancel = true; };
    }, []);

    if (loading) return <div>Loading…</div>;
    if (err) return <div style={{ color: "crimson" }}>{err}</div>;

    return (
        <section style={{ maxWidth: 900, margin: "0 auto" }}>
            <h1>Admin: Teams</h1>
            {teams.length === 0 ? (
                <div style={{ color: "#6b7280" }}>No teams.</div>
            ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {teams.map((tm) => (
                        <li key={tm.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <div><strong>{tm.name}</strong></div>
                                    {tm.description ? <div style={{ fontSize: 12, color: "#6b7280" }}>{tm.description}</div> : null}
                                </div>
                                <Link to={`/admin/teams/${tm.id}`}><button>Manage</button></Link>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
