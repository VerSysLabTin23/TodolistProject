// 404 / Not Found page.
// Purpose:
// - Provide a friendly message for unknown routes
// - Offer a safe path back into the authenticated area
//
// Notes:
// - Link targets /welcome (private area). If the user is not authenticated,
//   route guards should redirect to the login screen as needed.

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
