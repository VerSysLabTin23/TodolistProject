// React hook to subscribe to task WebSocket events with optional throttling.
// Purpose:
// - Provide a declarative subscription API for components/pages.
// - Apply a lightweight throttle to reduce re-renders during event bursts.
//
// API:
//   useRealtime(handler, { throttleMs?, onStatus? })
//
// Behavior:
// - Opens (or reuses) the singleton WS via connectTaskWS().
// - Buffers incoming events with a simple timer so that rapid sequences
//   coalesce into at most one callback per `throttleMs` window.
// - On unmount: clears timer, removes event/status subscribers, and (if last)
//   closes the socket.
//
// Notes:
// - `onEvent` identity is a dependency; pass a stable reference (useCallback)
//   in heavy components to avoid tearing down the connection unnecessarily.

import { useEffect, useRef } from "react";
import { connectTaskWS, type TaskEvent } from "./ws";

export function useRealtime(
    onEvent: (e: TaskEvent) => void,
    opts?: { throttleMs?: number; onStatus?: (s: "connecting" | "connected" | "closed" | "error") => void }
) {
    const timer = useRef<number | null>(null);
    const throttleMs = opts?.throttleMs ?? 150;

    useEffect(() => {
        // Establish (or reuse) the shared WS connection and register subscribers.
        const stop = connectTaskWS({
            onStatus: opts?.onStatus,
            onEvent: (e) => {
                // Basic throttle: drop frames while a timer is active, then deliver the latest.
                if (timer.current !== null) return;
                timer.current = window.setTimeout(() => {
                    timer.current = null;
                    onEvent(e);
                }, throttleMs);
            },
        });

        // Cleanup: clear pending timer and unregister from the WS singleton.
        return () => {
            if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; }
            stop.close();
        };
    }, [onEvent, throttleMs, opts?.onStatus]);
}
