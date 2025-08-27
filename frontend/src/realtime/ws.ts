// Types for the realtime task events coming from the server
export type TaskEventType = "task.created" | "task.updated" | "task.deleted" | "task.completed";

export interface TaskEvent {
    eventType: TaskEventType;
    taskId: number;
    teamId: number;
    actorId: number;
    creatorId: number;
    assigneeId?: number | null;
    timestamp: string;
    // Avoid `any`: generic JSON payload with unknown fields
    payload?: Record<string, unknown>;
}

export interface Options {
    onEvent?: (e: TaskEvent) => void;
    onStatus?: (s: "connecting" | "connected" | "closed" | "error") => void;
    // allow overrides for testing
    token?: string | null;
    baseUrl?: string;
}

/**
 * Opens a single WebSocket connection and notifies via callbacks.
 * Authentication token is passed as a query parameter by default.
 * If your backend expects a different auth method, adjust here.
 */
export function connectTaskWS(opts: Options = {}) {
    const token = opts.token ?? localStorage.getItem("accessToken");
    const base =
        opts.baseUrl ??
        ((import.meta.env.VITE_WS_URL as string | undefined) ?? "/ws"); // typed, no `any`

    // Common patterns: ?token=... OR Sec-WebSocket-Protocol.
    // Using query param here (matches earlier backend note).
    const url = `${base}?token=${encodeURIComponent(token ?? "")}`;

    const ws: WebSocket = new WebSocket(url); // prefer const (never reassigned)
    opts.onStatus?.("connecting");

    ws.onopen = () => {
        opts.onStatus?.("connected");
    };

    // MessageEvent<string>: server sends JSON text
    ws.onmessage = (msg: MessageEvent<string>) => {
        try {
            const parsed: unknown = JSON.parse(msg.data);

            // minimal shape check before casting
            if (parsed && typeof parsed === "object" && "eventType" in parsed) {
                opts.onEvent?.(parsed as TaskEvent);
            }
        } catch {
            // not empty: surface a soft error signal (and keep the connection)
            opts.onStatus?.("error");
            // optional: console.debug("WS parse error", err);
        }
    };

    ws.onclose = () => {
        opts.onStatus?.("closed");
    };

    ws.onerror = () => {
        opts.onStatus?.("error");
    };

    return {
        close(): void {
            try {
                ws.close();
            } catch {
                /* intentionally ignore close errors to keep teardown clean */
            }
        },
    };
}
