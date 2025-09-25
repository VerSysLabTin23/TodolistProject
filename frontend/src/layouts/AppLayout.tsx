import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import { connectTaskWS } from "../realtime/ws";
import { isAuthenticated } from "../auth/session";

export default function AppLayout() {
    useEffect(() => {
        if (!isAuthenticated()) return;
        const sub = connectTaskWS({});
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
