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

// --- Singleton WebSocket manager ---
let socket: WebSocket | null = null;
let currentStatus: Status = "closed";
let reconnectAttempts = 0;
let reconnectTimer: number | null = null;
const eventListeners = new Set<(e: TaskEvent) => void>();
const statusListeners = new Set<(s: Status) => void>();
let DEBUG = false;

function notifyStatus(s: Status) {
    currentStatus = s;
    if (DEBUG) {
        try { console.log("WS STATUS:", s); } catch { /* ignore */ }
    }
    statusListeners.forEach((fn) => {
        try { fn(s); } catch { /* ignore */ }
    });
}

function normalizeEvent(raw: any): TaskEvent | null {
    if (raw && typeof raw === "object" && "eventType" in raw) {
        return raw as TaskEvent;
    }
    if (raw && typeof raw === "object" && "type" in raw) {
        const type = String(raw.type);
        if (type.startsWith("task.")) {
            const data = raw.data ?? {};
            return {
                eventType: type as TaskEventType,
                taskId: Number(data.taskId ?? data.id ?? 0),
                teamId: Number(raw.teamId ?? data.teamId ?? 0),
                actorId: Number(raw.actorId ?? 0),
                creatorId: Number(data.creatorId ?? 0),
                assigneeId: (data.assigneeId ?? null) as number | null,
                timestamp: String(raw.timestamp ?? new Date().toISOString()),
                payload: {
                    title: data.title,
                    description: data.description,
                    priority: data.priority,
                    due: data.due,
                    completed: data.completed,
                    assigneeId: data.assigneeId,
                } as Record<string, unknown>,
            };
        }
    }
    return null;
}

function computeBackoffMs(attempt: number): number {
    const base = 1000; // 1s
    const max = 30000; // 30s
    const expo = Math.min(max, base * Math.pow(2, attempt));
    const jitter = Math.floor(Math.random() * 300);
    return expo + jitter;
}

function getBaseUrl(): string { return (import.meta.env.VITE_WS_URL ?? "/ws") as string; }

function ensureConnected() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return;
    }
    const base = getBaseUrl();
    const uid = readUserId();
    const token = localStorage.getItem("accessToken") ?? "";
    const qs = uid != null ? `userId=${encodeURIComponent(String(uid))}` : `token=${encodeURIComponent(token)}`;
    const url = `${base}?${qs}`;
    const protocols = token ? [ token ] : undefined;

    try {
        socket = protocols ? new WebSocket(url, protocols) : new WebSocket(url);
        notifyStatus("connecting");
    } catch {
        scheduleReconnect();
        return;
    }

    socket.onopen = () => {
        reconnectAttempts = 0;
        notifyStatus("connected");
    };
    socket.onmessage = (msg: MessageEvent<string>) => {
        try {
            const parsed = JSON.parse(msg.data);
            const evt = normalizeEvent(parsed);
            if (evt) {
                if (DEBUG) {
                    try { console.log("WS EVT:", evt); } catch { /* ignore */ }
                }
                eventListeners.forEach((fn) => {
                    try { fn(evt); } catch { /* ignore */ }
                });
            }
        } catch {
            notifyStatus("error");
        }
    };
    socket.onclose = () => {
        notifyStatus("closed");
        scheduleReconnect();
    };
    socket.onerror = () => {
        notifyStatus("error");
    };
}

function scheduleReconnect() {
    if (reconnectTimer != null) return;
    if (!navigator.onLine) return; // wait for online
    const delay = computeBackoffMs(reconnectAttempts++);
    reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        ensureConnected();
    }, delay) as unknown as number;
}

// React to network / visibility / auth token changes
window.addEventListener("online", () => ensureConnected());
window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") ensureConnected();
});
window.addEventListener("storage", (e) => {
    if (e.key === "accessToken") {
        // Reconnect with the new token
        try { socket?.close(); } catch { /* ignore */ }
        socket = null;
        ensureConnected();
    }
    if (e.key === "WS_DEBUG") {
        DEBUG = localStorage.getItem("WS_DEBUG") === "1";
    }
});
// Custom event fired by auth refresh flow
window.addEventListener("auth:token-refreshed", () => {
    try { socket?.close(); } catch { /* ignore */ }
    socket = null;
    ensureConnected();
});

// Initialize DEBUG flag on module load
try { DEBUG = localStorage.getItem("WS_DEBUG") === "1"; } catch { /* ignore */ }

export function connectTaskWS(opts: Options = {}) {
    // Register listeners only; ensure a single shared socket
    if (opts.onEvent) eventListeners.add(opts.onEvent);
    if (opts.onStatus) statusListeners.add(opts.onStatus);
    // Push current status immediately
    if (opts.onStatus) opts.onStatus(currentStatus);
    // Ensure connection
    ensureConnected();

    return {
        close() {
            if (opts.onEvent) eventListeners.delete(opts.onEvent);
            if (opts.onStatus) statusListeners.delete(opts.onStatus);
            // Do not close the shared socket here
        },
    };
}

/** Small React hook to show status in the UI if you want */
export function useWsStatus() {
    const [status, setStatus] = useState<Status>("closed");
    return { status, setStatus } as const;
}
