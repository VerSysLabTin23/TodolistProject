import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listUserTeams, type Team } from "../../api/team";

function useCurrentUserId(): number | null {
    return useMemo(() => {
        try {
            const raw = localStorage.getItem("currentUser");
            if (!raw) return null;
            const obj = JSON.parse(raw);
            return typeof obj?.id === "number" ? obj.id : null;
        } catch { return null; }
    }, []);
}

export default function TeamsPage() {
    const userId = useCurrentUserId();
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancel = false;
        async function load() {
            if (!userId) { setLoading(false); return; }
            try {
                const t = await listUserTeams(userId);
                if (!cancel) setTeams(t);
            } finally {
                if (!cancel) setLoading(false);
            }
        }
        load();
        return () => { cancel = true; };
    }, [userId]);

    if (loading) return <div>Loading…</div>;

    return (
        <section style={{ maxWidth: 900, margin: "0 auto" }}>
            <h1 style={{ marginBottom: 12 }}>My Teams</h1>
            {teams.length === 0 ? (
                <div style={{ color: "#6b7280" }}>
                    You are not a member of any team yet.
                </div>
            ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {teams.map((tm) => (
                        <li key={tm.id}
                            style={{
                                padding: "10px 12px",
                                border: "1px solid #e5e7eb",
                                borderRadius: 8,
                                marginBottom: 10,
                                background: "#fff",
                            }}>
                            <Link to={`/teams/${tm.id}`} style={{ textDecoration: "none" }}>
                                <strong>{tm.name}</strong>
                            </Link>
                            {tm.description ? (
                                <div style={{ fontSize: 12, color: "#6b7280" }}>{tm.description}</div>
                            ) : null}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
