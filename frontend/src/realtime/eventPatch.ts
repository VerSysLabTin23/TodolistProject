import type { Task } from "../api/task";
import type { TaskEvent } from "./ws";

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null;
}

function isPriority(v: unknown): v is Task["priority"] {
    return v === "low" || v === "medium" || v === "high";
}

/** Extract a safe Partial<Task> from any object (flat or nested) */
function extractTaskPatch(source: unknown, fallbackAssignee?: number): Partial<Task> {
    const r = isRecord(source) ? source : {};

    const title        = typeof r["title"]        === "string"  ? r["title"]        : undefined;
    const description  = typeof r["description"]  === "string"  ? r["description"]  : undefined;
    const due          = typeof r["due"]          === "string"  ? r["due"]          : undefined;
    const completed    = typeof r["completed"]    === "boolean" ? r["completed"]    : undefined;

    const p = r["priority"];
    const priority = isPriority(p) ? p : undefined;

    const a = r["assigneeId"];
    const assigneeId =
        typeof a === "number" ? a :
            typeof fallbackAssignee === "number" ? fallbackAssignee : undefined;

    return { title, description, priority, due, assigneeId, completed };
}

/** Backend sometimes sends flat payload, sometimes { task: {...} }. Normalize it. */
export function patchFromEventPayload(evt: TaskEvent): Partial<Task> {
    const payload = evt.payload;
    if (isRecord(payload) && isRecord(payload["task"])) {
        return extractTaskPatch(payload["task"], evt.assigneeId ?? undefined);
    }
    return extractTaskPatch(payload, evt.assigneeId ?? undefined);
}
