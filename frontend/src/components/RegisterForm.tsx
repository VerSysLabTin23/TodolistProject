// Simple registration form that posts to /auth/register.
// On success, informs the user and redirects to the login page.
//
// Note: registration does not sign the user in automatically; they must
// log in after registering (by design for this project).

import { useState } from "react";
import { register, getAxiosErrorMessage } from "../api/auth";
import { useNavigate } from "react-router-dom";

export default function RegisterForm() {
    // Controlled form state
    const [form, setForm] = useState({
        username: "",
        email: "",
        password: "",
        firstName: "",
        lastName: "",
    });

    // Submit button state
    const [submitting, setSubmitting] = useState(false);

    const navigate = useNavigate();

    /** Keep state in sync with inputs */
    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
    }

    /** POST the form and redirect to login on success */
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const user = await register(form); // calls /api/auth/register under the hood
            alert(`Registered as ${user.username}`);
            navigate("/");                     // back to login
        } catch (error: unknown) {
            alert(getAxiosErrorMessage(error)); // friendly message from Axios error
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 8, maxWidth: 360 }}>
            <input
                name="username"
                placeholder="Username"
                value={form.username}
                onChange={handleChange}
                required
            />
            <input
                name="email"
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
                required
            />
            <input
                type="password"
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                required
            />
            <input
                name="firstName"
                placeholder="First Name"
                value={form.firstName}
                onChange={handleChange}
            />
            <input
                name="lastName"
                placeholder="Last Name"
                value={form.lastName}
                onChange={handleChange}
            />
            <button type="submit" disabled={submitting}>
                {submitting ? "Registering..." : "Register"}
            </button>
        </form>
    );
}
