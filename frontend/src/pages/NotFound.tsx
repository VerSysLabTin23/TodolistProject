import { Link } from "react-router-dom";

export default function NotFoundPage() {
    return (
        <section style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
    <h1>404 — Not Found</h1>
    <p>The page you’re looking for doesn’t exist.</p>
    <p><Link to="/welcome">Go to Welcome</Link></p>
    </section>
);
}

