import { useState } from "react";
import { useNavigate } from "react-router-dom";

type Props = {
    small?: boolean;
};

export default function CreateTeamButton({ small }: Props) {
    const [busy] = useState(false);
    const navigate = useNavigate();

    return (
        <button
            onClick={() => navigate("/teams/new")}
            disabled={busy}
            style={{ height: small ? 32 : 36, padding: "0 12px", borderRadius: 8 }}
        >
            Create team
        </button>
    );
}
