// Top-level layout for all *authenticated* pages.
// Responsibilities:
// - Renders the persistent <Navbar /> on every private page
// - Provides a padded content container for child routes via <Outlet />
// - Establishes (and later cleans up) the WebSocket connection once,
//   so pages can subscribe to realtime task events without duplicating sockets.

import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import { connectTaskWS } from "../realtime/ws";
import { isAuthenticated } from "../auth/session";

export default function AppLayout() {
    useEffect(() => {
        // Only attempt a WS connection if the user is signed in.
        // (Guards like <RequireAuth /> already protect these routes.)
        if (!isAuthenticated()) return;

        // In dev, opt-in to verbose WS logging to help debugging.
        if (import.meta.env.DEV) {
            localStorage.setItem("WS_DEBUG", "1");
        }

        // Open a single app-level WebSocket connection.
        // We don't handle task messages here — individual pages/hooks do.
        // 'connectTaskWS' returns a tiny handle with 'close()' for cleanup.
        const sub = connectTaskWS({
            // Optional status callback for visibility in the console.
            onStatus: (status) => {
                console.log(`WebSocket status: ${status}`);
            },
        });

        // Clean up the socket when the layout unmounts (e.g., logout/navigation).
        return () => sub.close();
    }, []);

    return (
        <>
            {/* Global navigation bar shown on all private pages */}
            <Navbar />

            {/* Where nested routes render their page content */}
            <div style={{ padding: 16 }}>
                <Outlet />
            </div>
        </>
    );
}
