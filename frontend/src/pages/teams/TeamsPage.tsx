// "My Teams" page.
// Purpose:
// - Resolve the current userId from localStorage.
// - Fetch and list teams where the user is a member.
// - Provide a shortcut to create a new team.
//
// Data flow:
// 1) On mount (and when navigation location.key changes), if userId exists → fetch teams.
// 2) Display placeholder if the user has no teams.
// 3) Each team item links to the team-scoped task view.
//
// Notes:
// - The `location.key` dependency ensures the list refreshes after returning from /teams/new.
// - LocalStorage parsing is guarded; invalid JSON results in `null` userId gracefully.

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { listUserTeams, type Team } from "../../api/team";

// Utility hook to retrieve the current user's id from localStorage.
// Returns `null` if missing or malformed. Memoized to avoid re-parsing.
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

    // Page-local state: teams + loading spinner.
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);

    // Track route changes to determine when to refresh (e.g., after creating a team).
    const location = useLocation();

    useEffect(() => {
        let cancel = false;
        async function load() {
            // If user is not resolved, stop loading to show the empty state instead of a spinner.
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
        // Re-run when coming back from CreateTeamPage (location.key changes upon navigation).
    }, [userId, location.key]);

    if (loading) return <div>Loading…</div>;

    return (
        <section style={{ maxWidth: 900, margin: "0 auto" }}>
            {/* Header with CTA to create a new team */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h1 style={{ margin: 0 }}>My Teams</h1>
                <Link to="/teams/new"><button>Create team</button></Link>
            </div>

            {/* List or empty placeholder */}
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
                            {/* Navigate to the team-scoped task board */}
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
