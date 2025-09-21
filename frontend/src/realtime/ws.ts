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
    userId?: number | null; // default from localStorage.currentUser.id
    token?: string | null;  // optional fallback
}

function readUserId(): number | null {
    try {
        const raw = localStorage.getItem("currentUser");
        if (!raw) return null;
        const obj = JSON.parse(raw);
        return typeof obj?.id === "number" ? obj.id : null;
    } catch {
        return null;
    }
}

export function connectTaskWS(opts: Options = {}) {
    const base = opts.baseUrl ?? (import.meta.env.VITE_WS_URL ?? "/ws");
    const uid = opts.userId ?? readUserId();
    const token = opts.token ?? localStorage.getItem("accessToken") ?? "";

    // Prefer userId, fallback to token if needed by backend
    const qs =
        uid != null
            ? `userId=${encodeURIComponent(String(uid))}`
            : `token=${encodeURIComponent(token)}`;

    const url = `${base}?${qs}`;

    const ws = new WebSocket(url);
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

    return {
        close() {
            try { ws.close(); } catch { /* ignore */ }
        },
    };
}

/** Small React hook to show status in the UI if you want */
export function useWsStatus() {
    const [status, setStatus] = useState<Status>("closed");
    return { status, setStatus } as const;
}
