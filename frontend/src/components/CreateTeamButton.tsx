import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTeam, type Team } from "../api/team";
import { getAxiosErrorMessage } from "../api/auth";

type Props = {
    small?: boolean;
    /** Called after the team is successfully created */
    onCreated?: (team: Team) => void;
    /** Navigate to /teams/:id after creation (default true) */
    redirectToNew?: boolean;
};

export default function CreateTeamButton({
                                             small,
                                             onCreated,
                                             redirectToNew = true,
                                         }: Props) {
    const [busy, setBusy] = useState(false);
    const navigate = useNavigate();

    async function handleClick() {
        const name = prompt("Team name:");
        if (!name) return;

        const description = prompt("Description (optional)") || undefined;

        setBusy(true);
        try {
            const team = await createTeam({ name: name.trim(), description });
            onCreated?.(team);
            if (redirectToNew) navigate(`/teams/${team.id}`);
        } catch (e) {
            alert(getAxiosErrorMessage(e));
        } finally {
            setBusy(false);
        }
    }

    return (
        <button
            onClick={handleClick}
            disabled={busy}
            style={{
                height: small ? 32 : 36,
                padding: "0 12px",
                borderRadius: 8,
            }}
        >
            {busy ? "Creating…" : "Create team"}
        </button>
    );
}
