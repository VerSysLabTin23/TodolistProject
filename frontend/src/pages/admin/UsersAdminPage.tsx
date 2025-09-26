// Admin management screen for users (auth-service).
// Capabilities:
//   • list users
//   • create a new user (username, email, password, role, isAdmin flag)
//   • edit an existing user's fields (username/email/password/role/isAdmin)
//   • delete a user
//
// Notes:
//   - The "editing" state is a map keyed by user id, storing partial changes.
//   - We build a PATCH payload only with the fields the admin actually touched.

import { useEffect, useMemo, useState } from "react";
import {
    adminListUsers,
    adminCreateUser,
    adminUpdateUser,
    adminDeleteUser,
    type AdminUser,
} from "../../api/admin";

// Form state for creating new users
type NewUserForm = {
    username: string;
    email: string;
    password: string;
    role: string;     // "admin" | "user" (or other roles your backend supports)
    isAdmin: boolean; // Some backends prefer a boolean flag in addition/instead of 'role'
};

export default function UsersAdminPage() {
    // Data + status flags
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    // Create form default values
    const [createForm, setCreateForm] = useState<NewUserForm>({
        username: "",
        email: "",
        password: "",
        role: "user",
        isAdmin: false,
    });

    // Per-user edit buffer: { [userId]: { username?, email?, password?, role?, isAdmin? } }
    const [editing, setEditing] = useState<
        Record<number, Partial<AdminUser & { password?: string }>>
    >({});

    // Derive a stable order for display
    const sorted = useMemo(() => [...users].sort((a, b) => a.id - b.id), [users]);

    // Fetch users
    async function load() {
        setLoading(true);
        setErr(null);
        try {
            const u = await adminListUsers();
            setUsers(u);
        } catch (e) {
            setErr(e instanceof Error ? e.message : "Failed to load users");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
    }, []);

    // Create a new user
    async function onCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!createForm.username.trim() || !createForm.password) return;

        try {
            const created = await adminCreateUser({
                username: createForm.username.trim(),
                email: createForm.email.trim() || undefined,
                password: createForm.password,
                role: createForm.role || undefined,
                isAdmin: createForm.isAdmin,
            });
            // Prepend optimistically
            setUsers((prev) => [created, ...prev]);
            // Reset form
            setCreateForm({
                username: "",
                email: "",
                password: "",
                role: "user",
                isAdmin: false,
            });
        } catch (e) {
            alert(e instanceof Error ? e.message : "Create failed");
        }
    }

    // Save edits for a user
    async function onSave(u: AdminUser) {
        const patch = editing[u.id];
        if (!patch) return;

        // Only include fields actually changed
        const payload: {
            username?: string;
            email?: string;
            password?: string;
            role?: string;
            isAdmin?: boolean;
        } = {};

        if (typeof patch.username === "string") payload.username = patch.username;
        if (typeof patch.email === "string") payload.email = patch.email;
        if (typeof (patch as { password?: string }).password === "string")
            payload.password = (patch as { password?: string }).password;
        if (typeof patch.role === "string") payload.role = patch.role;
        if (typeof patch.isAdmin === "boolean") payload.isAdmin = patch.isAdmin;

        try {
            const updated = await adminUpdateUser(u.id, payload);
            // Replace in list
            setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
            // Clear edit buffer for this user
            setEditing((prev) => {
                const next = { ...prev };
                delete next[u.id];
                return next;
            });
        } catch (e) {
            alert(e instanceof Error ? e.message : "Update failed");
        }
    }

    // Delete user (with confirm)
    async function onDelete(u: AdminUser) {
        if (!confirm(`Delete user "${u.username}"?`)) return;
        try {
            await adminDeleteUser(u.id);
            setUsers((prev) => prev.filter((x) => x.id !== u.id));
        } catch (e) {
            alert(e instanceof Error ? e.message : "Delete failed");
        }
    }

    // Render states
    if (loading) return <div>Loading…</div>;
    if (err) return <div style={{ color: "crimson" }}>{err}</div>;

    return (
        <section style={{ maxWidth: 1000, margin: "0 auto" }}>
            <h1>Admin: Users</h1>

            {/* Create user card */}
            <form
                onSubmit={onCreate}
                style={{
                    display: "grid",
                    gap: 8,
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 16,
                }}
            >
                <strong>Create new user</strong>

                {/* Inputs in a compact grid */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
                        gap: 8,
                    }}
                >
                    <input
                        placeholder="username"
                        value={createForm.username}
                        onChange={(e) =>
                            setCreateForm((f) => ({ ...f, username: e.target.value }))
                        }
                    />
                    <input
                        placeholder="email (optional)"
                        value={createForm.email}
                        onChange={(e) =>
                            setCreateForm((f) => ({ ...f, email: e.target.value }))
                        }
                    />
                    <input
                        type="password"
                        placeholder="password"
                        value={createForm.password}
                        onChange={(e) =>
                            setCreateForm((f) => ({ ...f, password: e.target.value }))
                        }
                    />
                    <select
                        value={createForm.role}
                        onChange={(e) =>
                            setCreateForm((f) => ({ ...f, role: e.target.value }))
                        }
                    >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                    </select>

                    {/* Some backends use both role *and* a boolean isAdmin */}
                    <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                            type="checkbox"
                            checked={createForm.isAdmin}
                            onChange={(e) =>
                                setCreateForm((f) => ({ ...f, isAdmin: e.target.checked }))
                            }
                        />
                        <span style={{ fontSize: 12, color: "#6b7280" }}>isAdmin</span>
                    </label>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button type="submit">Create</button>
                </div>
            </form>

            {/* User list with inline editing controls */}
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {sorted.map((u) => (
                    <li
                        key={u.id}
                        style={{
                            background: "#fff",
                            border: "1px solid #e5e7eb",
                            borderRadius: 8,
                            padding: 12,
                            marginBottom: 10,
                        }}
                    >
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr 1fr 1fr auto auto",
                                gap: 8,
                                alignItems: "center",
                            }}
                        >
                            {/* Each input updates the editing buffer for that user */}
                            <input
                                defaultValue={u.username}
                                onChange={(e) =>
                                    setEditing((prev) => ({
                                        ...prev,
                                        [u.id]: { ...prev[u.id], username: e.target.value },
                                    }))
                                }
                            />
                            <input
                                defaultValue={u.email ?? ""}
                                onChange={(e) =>
                                    setEditing((prev) => ({
                                        ...prev,
                                        [u.id]: { ...prev[u.id], email: e.target.value },
                                    }))
                                }
                            />
                            <input
                                type="password"
                                placeholder="new password (optional)"
                                onChange={(e) =>
                                    setEditing((prev) => ({
                                        ...prev,
                                        [u.id]: { ...prev[u.id], password: e.target.value },
                                    }))
                                }
                            />
                            <select
                                defaultValue={u.role ?? (u.isAdmin ? "admin" : "user")}
                                onChange={(e) =>
                                    setEditing((prev) => ({
                                        ...prev,
                                        [u.id]: { ...prev[u.id], role: e.target.value },
                                    }))
                                }
                            >
                                <option value="user">user</option>
                                <option value="admin">admin</option>
                            </select>

                            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <input
                                    type="checkbox"
                                    defaultChecked={
                                        u.isAdmin === true ||
                                        (u.role?.toLowerCase?.() === "admin")
                                    }
                                    onChange={(e) =>
                                        setEditing((prev) => ({
                                            ...prev,
                                            [u.id]: {
                                                ...prev[u.id],
                                                isAdmin: e.target.checked,
                                            },
                                        }))
                                    }
                                />
                                <span style={{ fontSize: 12, color: "#6b7280" }}>isAdmin</span>
                            </label>

                            {/* Row actions */}
                            <div
                                style={{
                                    display: "flex",
                                    gap: 8,
                                    justifyContent: "flex-end",
                                }}
                            >
                                <button onClick={() => onSave(u)}>Save</button>
                                <button
                                    onClick={() => onDelete(u)}
                                    style={{ color: "crimson" }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}
