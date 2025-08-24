import { useState } from "react";
import { register, getAxiosErrorMessage } from "../api/auth";
import { useNavigate } from "react-router-dom";

export default function RegisterForm() {
    const [form, setForm] = useState({
        username: "",
        email: "",
        password: "",
        firstName: "",
        lastName: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const user = await register(form); // <- USED
            alert(`Registered as ${user.username}`);
            navigate("/"); // go to login
        } catch (error: unknown) {
            alert(getAxiosErrorMessage(error)); // <- USES error
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <h2>Register</h2>
            <input name="username" placeholder="Username" value={form.username} onChange={handleChange} />
            <input name="email" placeholder="Email" value={form.email} onChange={handleChange} />
            <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} />
            <input name="firstName" placeholder="First Name" value={form.firstName} onChange={handleChange} />
            <input name="lastName" placeholder="Last Name" value={form.lastName} onChange={handleChange} />
            <button type="submit" disabled={submitting}>
                {submitting ? "Registering..." : "Register"}
            </button>
        </form>
    );
}
