// Minimal layout used for *public* auth pages (Login, Register, etc.).
// Unlike AppLayout, it does not render the Navbar or open a WebSocket.
// It simply provides a consistent padded container and an <Outlet />.

import { Outlet } from "react-router-dom";

export default function AuthLayout() {
    return (
        <div style={{ padding: 16 }}>
            {/* The child route (Login / Register) will render here */}
            <Outlet />
        </div>
    );
}
