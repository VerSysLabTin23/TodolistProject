import { useMemo, useState } from "react";
import "./index.css";

type Priority = "Low" | "Medium" | "High";
type Task = {
    id: string;
    title: string;
    priority: Priority;
    deadline?: string; // ISO yyyy-mm-dd
    done: boolean;
};

function uid() {
    return Math.random().toString(36).slice(2);
}

export default function App() {
    const [tasks, setTasks] = useState<Task[]>([
        {id: uid(), title: "Connect UI to mock API", priority: "Medium", done: false, deadline: undefined},
        {id: uid(), title: "Draft team overview", priority: "Low", done: false, deadline: "2025-09-30"},
    ]);
    const [showArchive, setShowArchive] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // form state
    const [title, setTitle] = useState("");
    const [priority, setPriority] = useState<Priority>("Medium");
    const [deadline, setDeadline] = useState<string>("");

    const active = useMemo(() => tasks.filter(t => !t.done), [tasks]);
    const archived = useMemo(() => tasks.filter(t => t.done), [tasks]);

    function addTask() {
        if (!title.trim()) return;
        const t: Task = {id: uid(), title: title.trim(), priority, deadline: deadline || undefined, done: false};
        setTasks(prev => [t, ...prev]);
        // reset + close
        setTitle("");
        setPriority("Medium");
        setDeadline("");
        setShowModal(false);
    }

    function markDone(id: string) {
        setTasks(prev => prev.map(t => (t.id === id ? {...t, done: true} : t)));
    }

    function restore(id: string) {
        setTasks(prev => prev.map(t => (t.id === id ? {...t, done: false} : t)));
    }

    function remove(id: string) {
        setTasks(prev => prev.filter(t => t.id !== id));
    }

    const list = showArchive ? archived : active;

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",   // centers content horizontally
                gap: "20px",             // space between sections
                padding: "20px",
                width: "100vw",          // This makes the container take up the full width of the viewport
                minHeight: "100vh"       // Optional: This makes the container take up the full height of the viewport
            }}
        >
            <header style={{textAlign: "center"}}>
                <div style={{fontWeight: "bold", fontSize: "24px", marginBottom: "10px"}}>
                    Task Prototype
                </div>
                <div style={{display: "flex", gap: "10px", justifyContent: "center"}}>
                    <button onClick={() => setShowArchive(a => !a)}>
                        {showArchive ? "← Back to Active" : `Archive (${archived.length})`}
                    </button>
                    <button onClick={() => setShowModal(true)}>＋ Create Task</button>
                </div>
            </header>

            <section style={{textAlign: "center", width: "100%", maxWidth: "500px"}}>
                <h2>{showArchive ? "Archived tasks" : "My tasks"}</h2>
                {!showArchive && <div style={{color: "gray", marginBottom: "10px"}}>{active.length} open</div>}

                {list.length === 0 ? (
                    <div style={{marginTop: "10px"}}>
                        {showArchive ? "No archived tasks yet." : "No tasks yet. Create your first task."}
                    </div>
                ) : (
                    <ul style={{listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "12px"}}>
                        {list.map(t => (
                            <li
                                key={t.id}
                                style={{
                                    background: "#1a2030",
                                    padding: "12px",
                                    borderRadius: "8px",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: "8px"
                                }}
                            >
                                <div>
                                    <span style={{fontWeight: "bold", marginRight: "6px"}}>{t.priority}</span>
                                    {t.title}
                                    {t.deadline && <div style={{
                                        color: "gray",
                                        fontSize: "12px"
                                    }}>Due {new Date(t.deadline).toLocaleDateString()}</div>}
                                </div>
                                <div style={{display: "flex", gap: "8px"}}>
                                    {!showArchive ? (
                                        <>
                                            <button disabled>Assign</button>
                                            <button onClick={() => markDone(t.id)}>Mark done</button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => restore(t.id)}>Restore</button>
                                            <button onClick={() => remove(t.id)}>Delete</button>
                                        </>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {showModal && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.6)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center"
                    }}
                >
                    <div
                        style={{
                            background: "#141824",
                            padding: "20px",
                            borderRadius: "8px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                            width: "400px"
                        }}
                    >
                        <div style={{display: "flex", justifyContent: "space-between"}}>
                            <h3>Create Task</h3>
                            <button onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        <label>
                            Title
                            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Short task name"
                                   style={{width: "100%"}}/>
                        </label>

                        <label>
                            Priority
                            <select value={priority} onChange={e => setPriority(e.target.value as Priority)}
                                    style={{width: "100%"}}>
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                            </select>
                        </label>

                        <label>
                            Deadline
                            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                                   style={{width: "100%"}}/>
                        </label>

                        <div>
                            <button disabled>Assign user</button>
                            <span style={{color: "gray"}}>— disabled, backend not wired yet</span>
                        </div>

                        <div style={{display: "flex", justifyContent: "flex-end", gap: "8px"}}>
                            <button onClick={() => setShowModal(false)}>Cancel</button>
                            <button onClick={addTask} disabled={!title.trim()}>Create</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}