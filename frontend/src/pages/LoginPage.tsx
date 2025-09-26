// Public login screen container.
// Purpose:
// - Present the page shell/title
// - Render the reusable <LoginForm/> component
// - Provide a navigation link to registration
//
// Notes:
// - All authentication logic (posting credentials, token persistence, error display)
//   is encapsulated by <LoginForm/>.

import LoginForm from "../components/LoginForm";
import { Link } from "react-router-dom";

export default function LoginPage() {
    return (
        <>
            <h1>Login</h1>
            <LoginForm />
            <p style={{ marginTop: 12 }}>
                No account? <Link to="/register">Sign up</Link>
            </p>
        </>
    );
}
