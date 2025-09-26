// import { useEffect, useState } from "react";
// import { createPortal } from "react-dom";
// import { getTask, setCompleted, deleteTask, type Task } from "../../api/task";
// import type { TaskEvent } from "../../realtime/ws";
// import { useRealtime } from "../../realtime/useRealtime";
// import { patchFromEventPayload } from "../../realtime/eventPatch";
//
// type Props = { taskId: number; onClose: () => void };
//
// export default function TaskQuickViewModal({ taskId, onClose }: Props) {
//     const [task, setTask] = useState<Task | null>(null);
//     const [error, setError] = useState<string | null>(null);
//
//     useEffect(() => {
//         let cancel = false;
//         (async () => {
//             try {
//                 const t = await getTask(taskId);
//                 if (!cancel) setTask(t);
//             } catch (e) {
//                 setError(e instanceof Error ? e.message : String(e));
//             }
//         })();
//         return () => { cancel = true; };
//     }, [taskId]);
//
//     useRealtime((evt: TaskEvent) => {
//         if (!task || evt.taskId !== task.id) return;
//         if (evt.eventType === "task.deleted") { onClose(); return; }
//         setTask(prev => prev ? { ...prev, ...patchFromEventPayload(evt) } : prev);
//     });
//
//     if (!task && !error) return null;
//
//     return createPortal(
//         <div style={backdrop}>
//             <div style={modal}>
//                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//                     <h3 style={{ margin: 0 }}>{task ? task.title : "Task"}</h3>
//                     <button onClick={onClose} style={btnLight}>×</button>
//                 </div>
//                 {error && <div style={{ color: "crimson" }}>{error}</div>}
//                 {task && (
//                     <>
//                         <p style={{ marginTop: 8 }}>{task.description || <i>No description</i>}</p>
//                         <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
//                             Priority: {task.priority ?? "—"} · Due: {task.due ?? "—"} · Completed: {task.completed ? "yes" : "no"}
//                         </div>
//                         <div style={{ display: "flex", gap: 8 }}>
//                             <button
//                                 onClick={async () => setTask(await setCompleted(task.id, !task.completed))}
//                                 style={btnPrimary}
//                             >
//                                 {task.completed ? "Mark Open" : "Mark Completed"}
//                             </button>
//                             <button
//                                 onClick={async () => { if (confirm("Delete task?")) { await deleteTask(task.id); onClose(); } }}
//                                 style={btnDanger}
//                             >
//                                 Delete
//                             </button>
//                             <a href={`/tasks/${task.id}`} style={{ marginLeft: "auto" }}>Open full page →</a>
//                         </div>
//                     </>
//                 )}
//             </div>
//         </div>,
//         document.body
//     );
// }
//
// const backdrop: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "grid", placeItems: "center", zIndex: 50 };
// const modal: React.CSSProperties = { width: "min(680px, 92vw)", background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 10px 30px rgba(0,0,0,.25)" };
// const btnLight: React.CSSProperties = { background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 10px", cursor: "pointer" };
// const btnPrimary: React.CSSProperties = { background: "#2563eb", border: "1px solid #1d4ed8", color: "#fff", borderRadius: 8, padding: "6px 10px", cursor: "pointer" };
// const btnDanger: React.CSSProperties = { background: "#fee2e2", border: "1px solid #dc2626", color: "#991b1b", borderRadius: 8, padding: "6px 10px", cursor: "pointer" };
