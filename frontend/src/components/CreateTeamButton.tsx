// Simple navigational button that sends the user to the "Create Team" page.
// Used conditionally in the Navbar when the user is on a team-related route.

import { useNavigate } from "react-router-dom";

type Props = { small?: boolean };

export default function CreateTeamButton({ small }: Props) {
    const navigate = useNavigate();

    return (
        <button
            onClick={() => navigate("/teams/new")}      // push route programmatically
            style={{ height: small ? 32 : 36, padding: "0 12px", borderRadius: 8 }}
        >
            Create team
        </button>
    );
}
