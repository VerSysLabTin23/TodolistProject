import { useEffect, useRef } from "react";
import { connectTaskWS, type TaskEvent } from "./ws";

export function useRealtime(
    onEvent: (e: TaskEvent) => void,
    opts?: { throttleMs?: number; onStatus?: (s: "connecting" | "connected" | "closed" | "error") => void }
) {
    const timer = useRef<number | null>(null);
    const throttleMs = opts?.throttleMs ?? 150;

    useEffect(() => {
        const stop = connectTaskWS({
            onStatus: opts?.onStatus,
            onEvent: (e) => {
                if (timer.current !== null) return; // throttle
                timer.current = window.setTimeout(() => {
                    timer.current = null;
                    onEvent(e);
                }, throttleMs);
            },
        });
        return () => {
            if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; }
            stop.close();
        };
    }, [onEvent, throttleMs, opts?.onStatus]);
}
