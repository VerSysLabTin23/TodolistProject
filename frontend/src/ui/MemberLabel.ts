// Presentation helper for team member names.
// Purpose:
// - Convert a (possibly partial) TeamMember into a concise display string.
// - Show the username, and append the role in parentheses if present.
// - Default to "Unassigned" when no member object is provided.
//
// Examples:
//   memberLabel({ username: "alice", role: "OWNER" }) → "alice (owner)"
//   memberLabel({ username: "bob" })                  → "bob"
//   memberLabel()                                      → "Unassigned"

import type { TeamMember } from "../api/team";

export function memberLabel(m?: Pick<TeamMember, "username" | "id" | "role">): string {
    if (!m) return "Unassigned";
    // Show username + optional role tag (normalized to lowercase for consistency)
    const role = m.role?.toLowerCase();
    return role ? `${m.username} (${role})` : m.username;
}
