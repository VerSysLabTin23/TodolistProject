// Public registration screen container.
// Purpose:
// - Present the page shell/title
// - Render the reusable <RegisterForm/> component
// - Provide a navigation link back to login
//
// Notes:
// - Registration flow (POST /auth/register, token handling if applicable)
//   should be encapsulated by <RegisterForm/>.

import { Link } from "react-router-dom";
import RegisterForm from "../components/RegisterForm";

export default function RegisterPage() {
    return (
        <>
            <h1>Register</h1>
            <RegisterForm />
            <p style={{ marginTop: 12 }}>
                Already have an account? <Link to="/">Login</Link>
            </p>
        </>
    );
}
