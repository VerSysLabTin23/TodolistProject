import { useEffect, useState } from "react";
import { connectTaskWS, type TaskEvent } from "../realtime/ws";

type Row = TaskEvent & { id: string };

export default function HistoryPage() {
    const [events, setEvents] = useState<Row[]>([]);
    const [status, setStatus] =
        useState<"connecting" | "connected" | "closed" | "error">("closed");

    useEffect(() => {
        const sub = connectTaskWS({
            onStatus: setStatus,
            onEvent: (evt: TaskEvent) => {
                setEvents((prev) => [

                    { ...evt, id: `${evt.eventType}-${evt.taskId}-${evt.timestamp}` },
                    ...prev.slice(0, 199),
                ]);
            },
        });
        return () => sub.close();
    }, []);

    return (
        <section style={{ maxWidth: 960, margin: "0 auto" }}>
            <h1 style={{ display: "flex", gap: 8, alignItems: "center" }}>
                Activity / History
                <span style={{ fontSize: 12, color: "#6b7280" }}>
          (ws: {status})
        </span>
            </h1>

            {events.length === 0 ? (
                <div style={{ color: "#6b7280", marginTop: 12 }}>
                    No activity in this session yet. Open another window and create/update a task to see events.
                </div>
            ) : (
                <ul style={{ listStyle: "none", padding: 0, marginTop: 12 }}>
                    {events.map((e) => (
                        <li key={e.id}
                            style={{
                                border: "1px solid #e5e7eb",
                                borderRadius: 8,
                                padding: 10,
                                marginBottom: 10,
                                background: "#fff",
                            }}>
                            <div style={{ fontWeight: 600 }}>{e.eventType}</div>
                            <div style={{ fontSize: 13, color: "#6b7280" }}>
                                task #{e.taskId} • team #{e.teamId} • actor {e.actorId}
                                {e.assigneeId != null ? ` • assignee ${e.assigneeId}` : ""} • {new Date(e.timestamp).toLocaleString()}
                            </div>
                            {/* payload preview */}
                            {e.payload ? (
                                <pre style={{ margin: "8px 0 0", fontSize: 12, whiteSpace: "pre-wrap" }}>
                                    {JSON.stringify(e.payload, null, 2)}
                                </pre>
                            ) : null}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
