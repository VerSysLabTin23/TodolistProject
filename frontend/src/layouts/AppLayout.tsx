import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import { connectTaskWS } from "../realtime/ws";
import { isAuthenticated } from "../auth/session";

export default function AppLayout() {
    useEffect(() => {
        if (!isAuthenticated()) return;
        
        // Enable debug mode in localStorage to see WebSocket logs
        if (import.meta.env.DEV) {
            localStorage.setItem("WS_DEBUG", "1");
        }
        
        // Connect WebSocket but don't handle events here - individual pages will handle them
        const sub = connectTaskWS({
            onStatus: (status) => {
                console.log(`WebSocket status: ${status}`);
            }
        });
        
        return () => sub.close();
    }, []);

    return (
        <>
            <Navbar />
            <div style={{ padding: 16 }}>
                <Outlet />
            </div>
        </>
    );
}
