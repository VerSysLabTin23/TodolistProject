import { useEffect } from "react";
import { useRealtime } from "./useRealtime";

// Keep the WS connection alive globally.
// Also a good place for global heartbeats or debug logs.
export default function RealtimeRoot() {
    useRealtime(() => {
        // no-op handler keeps the socket mounted
    });
    useEffect(() => {
        // nothing here; just ensure mount is stable
    }, []);
    return null;
}
