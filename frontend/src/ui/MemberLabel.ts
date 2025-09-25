import type { TeamMember } from "../api/team";

export function memberLabel(m?: Pick<TeamMember, "username" | "id" | "role">): string {
    if (!m) return "Unassigned";
    // show username + optional role tag
    const role = m.role?.toLowerCase();
    return role ? `${m.username} (${role})` : m.username;
}
