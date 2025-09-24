// import { useEffect, useRef, useState } from "react";

import {useState} from "react";

export type TaskEventType =
    | "task.created"
    | "task.updated"
    | "task.deleted"
    | "task.completed";

export interface TaskEvent {
    eventType: TaskEventType;
    taskId: number;
    teamId: number;
    actorId: number;
    creatorId: number;
    assigneeId?: number | null;
    timestamp: string;
    payload?: Record<string, unknown>;
}

type Status = "connecting" | "connected" | "closed" | "error";

export interface Options {
    onEvent?: (e: TaskEvent) => void;
    onStatus?: (s: Status) => void;
    baseUrl?: string;       // default /ws
}

function readAccessToken(): string | null {
    return localStorage.getItem("accessToken");
}

export function connectTaskWS(opts: Options = {}) {
    const base = opts.baseUrl ?? (import.meta.env.VITE_WS_URL ?? "/ws");
    const token = readAccessToken();

    // Use raw JWT as subprotocol. Spaces are not allowed in subprotocol values.
    const protocols: string[] = token ? [token] : [];
    const ws = new WebSocket(base, protocols);
    opts.onStatus?.("connecting");

    ws.onopen = () => opts.onStatus?.("connected");
    ws.onmessage = (msg: MessageEvent<string>) => {
        try {
            const parsed = JSON.parse(msg.data);
            if (parsed && typeof parsed === "object" && "eventType" in parsed) {
                opts.onEvent?.(parsed as TaskEvent);
            }
        } catch {
            opts.onStatus?.("error");
        }
    };
    ws.onclose  = () => opts.onStatus?.("closed");
    ws.onerror  = () => opts.onStatus?.("error");

    return { close() { try { ws.close(); } catch { /* ignore */ } } };
}

/** Small React hook to show status in the UI if you want */
export function useWsStatus() {
    const [status, setStatus] = useState<Status>("closed");
    return { status, setStatus } as const;
}
