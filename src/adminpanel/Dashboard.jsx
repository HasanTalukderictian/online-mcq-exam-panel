import { useEffect, useState } from "react";
import { apiRequest, getData } from "./api";

function Dashboard({ user, token, go, onUnauthorized }) {
    const [stats, setStats] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const body = await apiRequest("/dashboard/stats", { token });
            setStats(getData(body));
        } catch (err) {
            if (err.status === 401) onUnauthorized();
            else setError(err.message);
        }
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    const s = stats || {};
    const cards = [
        { label: "Subjects", value: s.subjects, icon: "📚", c: "#7c3aed" },
        { label: "Exams", value: s.exams, icon: "📝", c: "#0ea5e9" },
        { label: "Questions", value: s.questions, icon: "❓", c: "#f59e0b" },
        { label: "Users", value: s.users, icon: "👤", c: "#14b8a6" },
        { label: "Active users", value: s.active_users, icon: "✅", c: "#22c55e" },
        { label: "Admins", value: s.admins, icon: "🛡️", c: "#ec4899" },
    ];

    const per = s.per_subject || [];
    const maxQ = per.reduce((m, x) => Math.max(m, x.questions_count), 0) || 1;

    const quick = [
        { id: "subjects", label: "Add subject", icon: "📚" },
        { id: "exams", label: "Add exam", icon: "📝" },
        { id: "questions", label: "Add question", icon: "❓" },
        { id: "import", label: "Import JSON", icon: "⬆️" },
        { id: "users", label: "Manage users", icon: "👤" },
    ];

    const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    return (
        <>
            <div className="adm-hello">
                <h2>Welcome back, {user.name} 👋</h2>
                <p>{today}</p>
            </div>

            {error && (
                <div className="adm-note bad">
                    Could not load stats: {error}{" "}
                    <button type="button" className="btn ghost sm" onClick={load}>Retry</button>
                </div>
            )}

            <div className="adm-cards">
                {cards.map((c) => (
                    <div className="adm-stat" key={c.label} style={{ "--c": c.c }}>
                        <div className="adm-stat-ico">{c.icon}</div>
                        <div>
                            <b>{loading ? "..." : c.value === undefined ? "-" : c.value}</b>
                            <small>{c.label}</small>
                        </div>
                    </div>
                ))}
            </div>

            <div className="adm-grid2">
                <div className="adm-card">
                    <h3>Quick actions</h3>
                    <div className="adm-quick">
                        {quick.map((x) => (
                            <button type="button" key={x.id} onClick={() => go(x.id)}>
                                <span>{x.icon}</span> {x.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="adm-card">
                    <h3>Questions per subject</h3>
                    {!loading && per.length === 0 && <p className="adm-muted">No subjects yet.</p>}
                    {per.map((x) => (
                        <div className="adm-bar" key={x.id}>
                            <span>{x.icon} {x.name} <small>({x.exams_count} exams)</small></span>
                            <div><i style={{ width: Math.round((x.questions_count / maxQ) * 100) + "%", background: x.color }} /></div>
                            <b>{x.questions_count}</b>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

export default Dashboard;