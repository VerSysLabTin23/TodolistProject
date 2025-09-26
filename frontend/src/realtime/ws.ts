// WebSocket client for task events (singleton).
// Purpose:
// - Provide a resilient, shared WS connection for the entire app.
// - Normalize diverse backend message formats into a common TaskEvent.
// - Expose a small subscription API (events + status) and auto-reconnect.
//
// Design choices:
// - Singleton socket shared by all subscribers to avoid multiple connections.
// - Backoff reconnection (exponential up to 30s).
// - Heartbeat ping every 25s to keep idle connections alive.
// - URL construction includes userId and token as query parameters.
// - Input adaptation supports both {type, data} and {eventType, payload}.
//
// Security:
// - Token is read from localStorage (or provided via Options) and appended as
//   a query parameter. If a header-based auth is preferred, the server and
//   client must be adjusted accordingly.

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

/* ---------- Utilities: user & event normalization ---------- */

// Pull userId from currentUser in localStorage; tolerate missing/invalid JSON.
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

// First finite number from a set of candidates; used to map BE variant fields.
function firstNumber(values: unknown[], fallback = -1): number {
    for (const v of values) {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
    }
    return fallback;
}

// Accept multiple naming conventions (camelCase, snake_case, flat)
// and canonicalize to the four allowed TaskEventType variants.
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

/* ---------- Backend variants & adaptation ---------- */

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

// Convert incoming wire message into a canonical TaskEvent or null if invalid.
// - Chooses the right object (`task` nested vs. flat) as the key source.
// - Picks the first available ID for taskId/teamId across variants.
// - Ensures we always emit a timestamp (server-provided or local fallback).
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

// Subscriber registries
type Subscriber = (e: TaskEvent) => void;
let ws: WebSocket | null = null;
const subs = new Set<Subscriber>();
const statusSubs = new Set<(s: Status) => void>();

// Connection lifecycle flags
let heartbeatId: number | null = null;
let stopped = false;
let attempts = 0;
let lastUrl = "";

// Notify all status listeners; used on open/close/error transitions.
function notifyStatus(s: Status) {
    statusSubs.forEach((fn) => fn(s));
}

// Ensure a socket to a given URL is open (or already connecting/open).
// - Closes any existing socket if the URL target changes.
// - Handles onopen/onmessage/onerror/onclose, including backoff reconnect.
function ensureOpen(url: string) {
    if (
        ws &&
        (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) &&
        url === lastUrl
    ) {
        return;
    }
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
            // Keep the connection alive on idle intermediaries (proxies/load balancers).
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
            // Exponential backoff: cap at 30s to avoid overly long blackout periods.
            const delay = Math.min(30_000, 1_000 * 2 ** attempts++);
            window.setTimeout(open, delay);
        };
    };

    open();
}

/**
 * Connect (or subscribe) to the task WebSocket.
 * - Uses a relative base (default `/ws`) so dev proxy/gateway can route.
 * - Includes userId and token query params for backend authorization.
 * - Returns a handle with `close()` that removes this caller's subscriptions;
 *   if no subscribers remain, the socket is closed.
 */
export function connectTaskWS(opts: Options = {}) {
    const base = opts.baseUrl ?? (import.meta.env.VITE_WS_URL ?? "/ws");
    const uid = opts.userId ?? readUserId();
    const token = opts.token ?? localStorage.getItem("accessToken") ?? "";

    const path = base.startsWith("/") ? base : `/${base}`;
    const params = new URLSearchParams();
    if (uid != null) params.set("userId", String(uid));
    if (token) params.set("token", token);                // <-- always include
    const url = `${path}?${params.toString()}`;

    // Register status subscriber if provided (before attempting connect).
    if (opts.onStatus) statusSubs.add(opts.onStatus);

    // Ensure a socket to the computed URL is open (or connecting).
    ensureOpen(url);

    // Register event subscriber if provided.
    if (opts.onEvent) subs.add(opts.onEvent);

    // Clean shutdown on page unload (best-effort).
    const onUnload = () => { try { ws?.close(); } catch { /* empty */ } };
    window.addEventListener("beforeunload", onUnload);

    return {
        close() {
            window.removeEventListener("beforeunload", onUnload);
            if (opts.onEvent) subs.delete(opts.onEvent);
            if (opts.onStatus) statusSubs.delete(opts.onStatus);

            // If nobody is listening anymore, stop the socket and clear heartbeat.
            if (subs.size === 0 && statusSubs.size === 0) {
                stopped = true;
                try { ws?.close(); } catch { /* empty */ }
                ws = null;
                if (heartbeatId !== null) { window.clearInterval(heartbeatId); heartbeatId = null; }
            }
        },
    };
}
