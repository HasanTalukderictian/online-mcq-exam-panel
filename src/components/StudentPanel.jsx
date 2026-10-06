import { useEffect, useState } from "react";
import { apiRequest, pickList } from "../adminpanel/api";

const fmtT = (s) => Math.floor(s / 60) + "m " + (s % 60) + "s";
const fmtD = (iso) => {
    const d = new Date(iso);
    return (
        d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
        ", " +
        d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    );
};

function StudentPanel({ user, token, onOpen, onStart, onLogin, onUnauthorized }) {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(!!token);
    const [error, setError] = useState("");
    const [subject, setSubject] = useState("all");

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const body = await apiRequest("/student/attempts", { token });
            setRecords(pickList(body));
        } catch (err) {
            if (err.status === 401) onUnauthorized();
            else setError(err.message);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (token) load();
    }, [token]);

    if (!user) {
        return (
            <div className="sp">
                <div className="panel sp-empty">
                    <div style={{ fontSize: 48 }}>🔒</div>
                    <h2>Please log in</h2>
                    <p className="sub">Log in to see your exam results and progress.</p>
                    <button className="btn" onClick={onLogin}>Login</button>
                </div>
            </div>
        );
    }

    if (loading) {
        return <div className="sp"><div className="panel sp-empty">Loading your results...</div></div>;
    }

    if (error) {
        return (
            <div className="sp">
                <div className="panel sp-empty">
                    <p>Could not load your results: {error}</p>
                    <button className="btn" onClick={load}>Try again</button>
                </div>
            </div>
        );
    }

    if (!records.length) {
        return (
            <div className="sp">
                <div className="panel sp-empty">
                    <div style={{ fontSize: 48 }}>📊</div>
                    <h2>No exam records yet</h2>
                    <p className="sub">Your results will appear here after you finish an exam.</p>
                    <button className="btn" onClick={onStart}>Start an exam</button>
                </div>
            </div>
        );
    }

    const subjectNames = [...new Set(records.map((r) => r.subject))];
    const list = records.filter((r) => subject === "all" || r.subject === subject);
    const n = list.length;
    const avg = n ? Math.round(list.reduce((a, r) => a + r.percent, 0) / n) : 0;
    const best = n ? Math.max(...list.map((r) => r.percent)) : 0;
    const passRate = n ? Math.round((list.filter((r) => r.passed).length / n) * 100) : 0;

    const bySubject = Object.values(
        list.reduce((m, r) => {
            const x = m[r.subject] || (m[r.subject] = { name: r.subject, icon: r.icon, color: r.color, n: 0, sum: 0 });
            x.n++;
            x.sum += r.percent;
            return m;
        }, {})
    );

    return (
        <div className="sp">
            <div className="sp-head">
                <div>
                    <h1>Student Panel</h1>
                    <p className="sub" style={{ margin: 0 }}>Results of {user.name}</p>
                </div>
                <div className="sp-filters">
                    <select className="field" value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject">
                        <option value="all">All subjects</option>
                        {subjectNames.map((x) => <option key={x} value={x}>{x}</option>)}
                    </select>
                </div>
            </div>

            <div className="stats panel">
                <div><b>{n}</b><small>Exams taken</small></div>
                <div><b>{avg}%</b><small>Average score</small></div>
                <div><b style={{ color: "var(--ok)" }}>{best}%</b><small>Best score</small></div>
                <div><b>{passRate}%</b><small>Pass rate</small></div>
            </div>

            {bySubject.length > 0 && (
                <div className="panel" style={{ marginBottom: 20 }}>
                    <h3 style={{ margin: "0 0 14px" }}>Subject-wise performance</h3>
                    {bySubject.map((s) => {
                        const p = Math.round(s.sum / s.n);
                        return (
                            <div className="perf" key={s.name}>
                                <span className="perf-name">{s.icon} {s.name} <small>({s.n})</small></span>
                                <div className="perf-bar"><div style={{ width: p + "%", background: s.color }} /></div>
                                <b>{p}%</b>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="panel">
                <h3 style={{ margin: "0 0 12px" }}>Exam history ({n})</h3>
                {list.map((r) => (
                    <div className="rec" key={r.id}>
                        <div className="rec-main">
                            <b>{r.icon} {r.subject} · {r.exam}</b>
                            <small>{fmtD(r.date)} · {fmtT(r.time_taken)}</small>
                        </div>
                        <div className="rec-score">
                            <b>{r.correct}/{r.total}</b>
                            <span className={"badge " + (r.passed ? "pass" : "fail")}>
                                {r.percent}% · {r.passed ? "Passed" : "Failed"}
                            </span>
                        </div>
                        <div className="rec-act">
                            <button className="btn" onClick={() => onOpen(r.id)}>View</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default StudentPanel;