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

declare global {
    interface Window {
        __DEBUG_WS__?: boolean;
    }
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
function firstNumber(values: unknown[], fallback = -1): number {
    for (const v of values) {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
    }
    return fallback;
}
function normalizeType(t: unknown): TaskEventType | null {
    if (typeof t !== "string" || !t) return null;
    let s = t.replace(/([a-z])([A-Z])/g, "$1.$2").replace(/[_\s]+/g, ".").toLowerCase();
    if (s === "taskcreated") s = "task.created";
    if (s === "taskupdated") s = "task.updated";
    if (s === "taskdeleted") s = "task.deleted";
    if (s === "taskcompleted") s = "task.completed";
    const ok = ["task.created", "task.updated", "task.deleted", "task.completed"] as const;
    return (ok as readonly string[]).includes(s) ? (s as TaskEventType) : null;
}

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
type BE1 = { type: string; data: BackendTask };
type BE2 = { eventType: string; payload: BackendTask };
type Incoming = BE1 | BE2;

function isBE1(m: unknown): m is BE1 {
    return typeof m === "object" && m !== null && "type" in (m as Record<string, unknown>) && "data" in (m as Record<string, unknown>);
}
function isBE2(m: unknown): m is BE2 {
    return typeof m === "object" && m !== null && "eventType" in (m as Record<string, unknown>) && "payload" in (m as Record<string, unknown>);
}
function adaptIncoming(raw: unknown): TaskEvent | null {
    let kind: string | null = null;
    let core: BackendTask = {};
    if (isBE1(raw)) { kind = raw.type; core = raw.data ?? {}; }
    else if (isBE2(raw)) { kind = raw.eventType; core = raw.payload ?? {}; }
    else return null;

    const eventType = normalizeType(kind);
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

/* ---------------- Singleton connection ---------------- */
type Subscriber = (e: TaskEvent) => void;
let ws: WebSocket | null = null;
const subs = new Set<Subscriber>();
const statusSubs = new Set<(s: Status) => void>();
let heartbeatId: number | null = null;
let stopped = false;
let attempts = 0;
let lastUrl = "";

function notifyStatus(s: Status) {
    statusSubs.forEach((fn) => fn(s));
}
function ensureOpen(url: string) {
    if (ws && ws.readyState === WebSocket.OPEN && url === lastUrl) return;
    if (ws && url !== lastUrl) { try { ws.close(); } catch { /* empty */ } ws = null; }

    lastUrl = url;
    stopped = false;

    const open = () => {
        if (stopped) return;
        notifyStatus("connecting");
        ws = new WebSocket(url);

        ws.onopen = () => {
            attempts = 0;
            notifyStatus("connected");
            heartbeatId = window.setInterval(() => {
                try {
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: "ping" }));
                    }
                } catch { /* ignore */ }
            }, 25_000);
        };

        ws.onmessage = (msg: MessageEvent<string>) => {
            if (typeof msg.data !== "string") return;
            try {
                const parsed: Incoming = JSON.parse(msg.data);
                const evt = adaptIncoming(parsed);
                if (window.__DEBUG_WS__) console.debug("[WS] IN:", parsed, "→", evt);
                if (evt) subs.forEach((fn) => fn(evt));
            } catch { /* ignore malformed frames */ }
        };

        ws.onerror = () => notifyStatus("error");

        ws.onclose = () => {
            if (heartbeatId !== null) { window.clearInterval(heartbeatId); heartbeatId = null; }
            notifyStatus("closed");
            if (stopped) return;
            const delay = Math.min(30_000, 1_000 * 2 ** attempts++);
            window.setTimeout(open, delay);
        };
    };

    open();
}

export function connectTaskWS(opts: Options = {}) {
    const base = opts.baseUrl ?? (import.meta.env.VITE_WS_URL ?? "/ws");
    const uid = opts.userId ?? readUserId();
    const token = opts.token ?? localStorage.getItem("accessToken") ?? "";

    const path = base.startsWith("/") ? base : `/${base}`;
    const params = new URLSearchParams();
    if (uid != null) params.set("userId", String(uid));
    if (token) params.set("token", token);                // <-- always include
    const url = `${path}?${params.toString()}`;

    if (opts.onStatus) statusSubs.add(opts.onStatus);
    ensureOpen(url);                                      // <-- pass relative URL

    if (opts.onEvent) subs.add(opts.onEvent);

    const onUnload = () => { try { ws?.close(); } catch { /* empty */ } };
    window.addEventListener("beforeunload", onUnload);

    return {
        close() {
            window.removeEventListener("beforeunload", onUnload);
            if (opts.onEvent) subs.delete(opts.onEvent);
            if (opts.onStatus) statusSubs.delete(opts.onStatus);
            if (subs.size === 0 && statusSubs.size === 0) {
                stopped = true;
                try { ws?.close(); } catch { /* empty */ }
                ws = null;
                if (heartbeatId !== null) { window.clearInterval(heartbeatId); heartbeatId = null; }
            }
        },
    };
}

/** Optional hook for displaying status */
export function useWsStatus() {
    const [status, setStatus] = useState<Status>("closed");
    return { status, setStatus } as const;
}
