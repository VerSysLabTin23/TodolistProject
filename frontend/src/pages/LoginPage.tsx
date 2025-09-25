import LoginForm from "../components/LoginForm";
import {Link} from "react-router-dom";

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