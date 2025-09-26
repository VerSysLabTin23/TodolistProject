// Global WebSocket lifecycle anchor.
// Purpose:
// - Establish and keep a single app-wide WebSocket connection alive.
// - This component mounts once near the root (e.g., under <BrowserRouter>).
// - It can host global diagnostics/heartbeats in the future.
//
// Design:
// - `useRealtime` with a no-op subscriber ensures the singleton WS is opened.
// - Unsubscribing occurs automatically on unmount via the hook cleanup.

import { useEffect } from "react";
import { useRealtime } from "./useRealtime";

// Keep the WS connection alive globally.
// Also a good place for global heartbeats or debug logs.
export default function RealtimeRoot() {
    useRealtime(() => {
        // no-op handler keeps the socket mounted
    });
    useEffect(() => {
        // Reserved for future diagnostics. Mount stability matters here.
    }, []);
    return null;
}
