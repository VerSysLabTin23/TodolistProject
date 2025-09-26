// Event payload → Partial<Task> normalizer.
// Purpose:
// - Backends may emit different payload shapes (flat vs { task: {...} }).
// - This module extracts a safe `Partial<Task>` regardless of shape, while
//   validating types for each allowed field.
//
// Key ideas:
// - Narrow unknown values with small type guards (`isRecord`, `isPriority`).
// - Prefer explicit checks (typeof, union guards) over permissive casting.
// - Provide a fallback assignee (from the event envelope) when the payload
//   doesn't include `assigneeId` but context implies it.
//
// Guarantees:
// - Returned object only contains `Task` fields that were (a) present and
//   (b) type-correct. Everything else is `undefined` and thus safe to spread.

import type { Task } from "../api/task";
import type { TaskEvent } from "./ws";

// Narrow unknown into { [k: string]: unknown } to enable safe property access.
function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null;
}

// Whitelist allowed priority literals to avoid leaking arbitrary strings.
function isPriority(v: unknown): v is Task["priority"] {
    return v === "low" || v === "medium" || v === "high";
}

/** Extract a safe Partial<Task> from any object (flat or nested) */
function extractTaskPatch(source: unknown, fallbackAssignee?: number): Partial<Task> {
    const r = isRecord(source) ? source : {};

    // Field-by-field type checks: undefined means "no change"
    const title        = typeof r["title"]        === "string"  ? r["title"]        : undefined;
    const description  = typeof r["description"]  === "string"  ? r["description"]  : undefined;
    const due          = typeof r["due"]          === "string"  ? r["due"]          : undefined;
    const completed    = typeof r["completed"]    === "boolean" ? r["completed"]    : undefined;

    // Validate union literal
    const p = r["priority"];
    const priority = isPriority(p) ? p : undefined;

    // Prefer explicit assigneeId in payload, otherwise use fallback (from envelope)
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
