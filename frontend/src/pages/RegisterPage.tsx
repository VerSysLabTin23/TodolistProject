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