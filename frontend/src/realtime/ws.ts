import { useState } from "react";

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
    baseUrl?: string;       // default /ws (proxied)
    userId?: number | null; // default from localStorage.currentUser.id
    token?: string | null;  // optional fallback
}

/* ---- optional debug flag without any-cast ---- */
declare global {
    interface Window {
        __DEBUG_WS__?: boolean;
    }
}

/* ---------------- helpers ---------------- */
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

function firstNumber(values: unknown[], fallback = -1): number {
    for (const v of values) {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
    }
    return fallback;
}

/** Normalize backend type → our TaskEventType */
function normalizeType(t: unknown): TaskEventType | null {
    if (typeof t !== "string" || !t) return null;
    // camelCase/PascalCase → dot
    let s = t.replace(/([a-z])([A-Z])/g, "$1.$2");
    // underscores / spaces → dot
    s = s.replace(/[_\s]+/g, ".").toLowerCase();
    // common variants
    if (s === "taskcreated") s = "task.created";
    if (s === "taskupdated") s = "task.updated";
    if (s === "taskdeleted") s = "task.deleted";
    if (s === "taskcompleted") s = "task.completed";
    // only allow the four we handle
    return (["task.created","task.updated","task.deleted","task.completed"] as const)
        .includes(s as TaskEventType) ? (s as TaskEventType) : null;
}

/* ---- backend message shapes ---- */
type BackendTask = {
    id?: number;
    taskId?: number;
    teamId?: number;
    actorId?: number;
    creatorId?: number;
    assigneeId?: number | null;
    timestamp?: string;
    task?: { id?: number; teamId?: number; creatorId?: number; assigneeId?: number | null } & Record<string, unknown>;
} & Record<string, unknown>;

type BackendEventPrimary = { type: string; data: BackendTask };     // main {type,data}
type BackendEventAlt     = { eventType: string; payload: BackendTask }; // alt {eventType,payload}
type IncomingMessage     = BackendEventPrimary | BackendEventAlt;

function isPrimary(m: unknown): m is BackendEventPrimary {
    return typeof m === "object" && m !== null && "type" in (m as Record<string, unknown>) && "data" in (m as Record<string, unknown>);
}
function isAlt(m: unknown): m is BackendEventAlt {
    return typeof m === "object" && m !== null && "eventType" in (m as Record<string, unknown>) && "payload" in (m as Record<string, unknown>);
}

/** Normalize backend message into TaskEvent */
function adaptIncoming(raw: unknown): TaskEvent | null {
    let eventTypeRaw: string | null = null;
    let core: BackendTask = {};

    if (isPrimary(raw)) {
        eventTypeRaw = raw.type;
        core = raw.data ?? {};
    } else if (isAlt(raw)) {
        eventTypeRaw = raw.eventType;
        core = raw.payload ?? {};
    } else {
        return null;
    }

    const eventType = normalizeType(eventTypeRaw);
    if (!eventType) return null;

    const t = (typeof core.task === "object" && core.task) ? core.task : core;

    const taskId = firstNumber([t?.id, core.taskId], -1);
    const teamId = firstNumber([t?.teamId, core.teamId], -1);
    const actorId = firstNumber([core.actorId], -1);
    const creatorId = firstNumber([t?.creatorId, core.creatorId], -1);
    const assigneeIdRaw = t?.assigneeId ?? core.assigneeId;
    const timestamp = typeof core.timestamp === "string" ? core.timestamp : new Date().toISOString();

    return {
        eventType,
        taskId,
        teamId,
        actorId,
        creatorId,
        assigneeId: assigneeIdRaw === undefined ? undefined : firstNumber([assigneeIdRaw]),
        timestamp,
        payload: core as Record<string, unknown>,
    };
}

/* ---------------- public API with reconnect/heartbeat ---------------- */
export function connectTaskWS(opts: Options = {}) {
    const base = opts.baseUrl ?? (import.meta.env.VITE_WS_URL ?? "/ws");
    const uid = opts.userId ?? readUserId();
    const token = opts.token ?? localStorage.getItem("accessToken") ?? "";
    const qs = uid != null ? `userId=${encodeURIComponent(String(uid))}` : `token=${encodeURIComponent(token)}`;
    const url = `${base}?${qs}`;

    let ws: WebSocket | null = null;
    let stopped = false;
    let attempts = 0;
    let heartbeatId: number | null = null;

    const open = () => {
        if (stopped) return;
        opts.onStatus?.("connecting");
        ws = new WebSocket(url);

        ws.onopen = () => {
            attempts = 0;
            opts.onStatus?.("connected");

            // heartbeat every 25s to keep proxies from idling out
            heartbeatId = window.setInterval(() => {
                try {
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: "ping" }));
                    }
                } catch {
                    /* ignore */
                }
            }, 25_000);
        };

        ws.onmessage = (msg: MessageEvent<string>) => {
            if (typeof msg.data !== "string") return;
            try {
                const parsed: IncomingMessage = JSON.parse(msg.data);
                const evt = adaptIncoming(parsed);
                if (window.__DEBUG_WS__) console.debug("[WS] IN:", parsed, "→", evt);
                if (evt) opts.onEvent?.(evt);
            } catch {
                /* ignore malformed frames */
            }
        };

        ws.onerror = () => {
            opts.onStatus?.("error");
        };

        ws.onclose = () => {
            if (heartbeatId !== null) { window.clearInterval(heartbeatId); heartbeatId = null; }
            opts.onStatus?.("closed");
            if (stopped) return;
            // reconnect with capped exponential backoff
            const delay = Math.min(30_000, 1_000 * 2 ** attempts++);
            window.setTimeout(open, delay);
        };
    };

    open();

    return {
        close() {
            stopped = true;
            if (heartbeatId !== null) { window.clearInterval(heartbeatId); heartbeatId = null; }
            try { ws?.close(); } catch { /* ignore */ }
        },
    };
}

/** Optional React hook for showing connection status */
export function useWsStatus() {
    const [status, setStatus] = useState<Status>("closed");
    return { status, setStatus } as const;
}
