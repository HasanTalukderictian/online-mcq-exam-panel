import { useEffect, useState } from "react";
import { apiRequest, getData, pickList } from "./api";
import { API_URL } from "../components/Auth/Auth";
import { useToast, Toast, fmtTime } from "./ui";
import "./css/students.css";
import "./css/results.css";

const PER_PAGE = 10;

const fmtDateTime = (d) =>
    d ? new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "-";

function Results({ token, onUnauthorized }) {
    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [summary, setSummary] = useState(null);
    const [page, setPage] = useState(1);

    // filters
    const [q, setQ] = useState("");
    const [search, setSearch] = useState("");
    const [subject, setSubject] = useState("all");
    const [exam, setExam] = useState("all");
    const [status, setStatus] = useState("all");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");

    const [subjects, setSubjects] = useState([]);
    const [exams, setExams] = useState([]);

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [review, setReview] = useState(null); // { loading, error, attempt }
    const [exporting, setExporting] = useState(false);
    const [toast, say] = useToast();

    const expired = (err) => {
        if (err.status === 401) {
            onUnauthorized();
            return true;
        }
        return false;
    };

    // current filters as a query string
    const params = () => {
        const p = new URLSearchParams();
        if (search.trim()) p.set("search", search.trim());
        if (subject !== "all") p.set("subject_id", subject);
        if (exam !== "all") p.set("exam_id", exam);
        if (status !== "all") p.set("status", status);
        if (from) p.set("from", from);
        if (to) p.set("to", to);
        return p;
    };

    /* ---------- dropdown data ---------- */
    useEffect(() => {
        apiRequest("/subjects", { token })
            .then((b) => setSubjects(pickList(b)))
            .catch((err) => {
                if (!expired(err)) setLoadError(err.message);
            });
    }, []);

    useEffect(() => {
        const qs = subject === "all" ? "" : "?subject_id=" + subject;
        apiRequest("/exams" + qs, { token })
            .then((b) => setExams(pickList(b)))
            .catch(() => setExams([]));
    }, [subject]);

    /* ---------- results ---------- */
    const load = async () => {
        setLoading(true);
        setLoadError("");
        try {
            const p = params();
            p.set("per_page", PER_PAGE);
            p.set("page", page);
            const body = await apiRequest("/admin/results?" + p.toString(), { token });
            setItems(pickList(body));
            if (body.meta) setMeta(body.meta);
            if (body.summary) setSummary(body.summary);
        } catch (err) {
            if (!expired(err)) setLoadError(err.message);
        }
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, [page, search, subject, exam, status, from, to]);

    const runSearch = (e) => {
        e.preventDefault();
        setPage(1);
        setSearch(q);
    };

    const changeSubject = (v) => {
        setPage(1);
        setSubject(v);
        setExam("all");
    };
    const change = (setter) => (v) => {
        setPage(1);
        setter(v);
    };

    const filtersOn = search || subject !== "all" || exam !== "all" || status !== "all" || from || to;
    const resetFilters = () => {
        setQ("");
        setSearch("");
        setSubject("all");
        setExam("all");
        setStatus("all");
        setFrom("");
        setTo("");
        setPage(1);
    };

    /* ---------- review ---------- */
    const openReview = async (r) => {
        setReview({ loading: true, error: "", attempt: null });
        try {
            const body = await apiRequest("/admin/attempts/" + r.id, { token });
            setReview({ loading: false, error: "", attempt: getData(body) });
        } catch (err) {
            if (expired(err)) return;
            setReview({ loading: false, error: err.message, attempt: null });
        }
    };

    /* ---------- delete ---------- */
    const remove = async (r) => {
        const msg =
            "Delete the result of " + r.student.name + " (" + r.subject + " · " + r.exam + ")? " +
            "The student will be able to take this exam again.";
        if (!window.confirm(msg)) return;
        try {
            await apiRequest("/admin/attempts/" + r.id, { method: "DELETE", token });
            say("ok", "Result deleted. The student can retake this exam.");
            if (items.length === 1 && page > 1) setPage(page - 1);
            else load();
        } catch (err) {
            if (!expired(err)) say("bad", err.message);
        }
    };

    /* ---------- export CSV ---------- */
    const exportCsv = async () => {
        setExporting(true);
        try {
            const res = await fetch(API_URL + "/admin/results/export?" + params().toString(), {
                headers: { Accept: "text/csv", Authorization: "Bearer " + token },
            });
            if (res.status === 401) {
                onUnauthorized();
                return;
            }
            if (!res.ok) throw new Error("Export failed (" + res.status + ").");
            const blob = await res.blob();
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "results-" + new Date().toISOString().slice(0, 10) + ".csv";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(a.href);
            say("ok", "CSV downloaded.");
        } catch (err) {
            say("bad", err.message);
        }
        setExporting(false);
    };

    const cards = [
        { label: "Results", value: summary ? summary.total : "-", icon: "🏆", c: "#7c3aed" },
        { label: "Passed", value: summary ? summary.passed : "-", icon: "✅", c: "#14b8a6" },
        { label: "Failed", value: summary ? summary.failed : "-", icon: "❌", c: "#ec4899" },
        { label: "Average score", value: summary ? summary.avg_percent + "%" : "-", icon: "🎯", c: "#6366f1" },
    ];

    return (
        <>
            <div className="adm-top">
                <div>
                    <h2>Results</h2>
                    <p>Exam results of all students.</p>
                </div>
                <button type="button" className="btn ghost" onClick={exportCsv} disabled={exporting}>
                    {exporting ? "Preparing..." : "⬇ Export CSV"}
                </button>
            </div>

            <div className="adm-cards">
                {cards.map((c) => (
                    <div className="adm-stat" key={c.label} style={{ "--c": c.c }}>
                        <div className="adm-stat-ico">{c.icon}</div>
                        <div><b>{c.value}</b><small>{c.label}</small></div>
                    </div>
                ))}
            </div>

            {loadError && (
                <div className="adm-note bad">
                    Could not load results: {loadError}{" "}
                    <button type="button" className="btn ghost sm" onClick={load}>Retry</button>
                </div>
            )}

            <div className="adm-card">
                <form className="adm-filters" onSubmit={runSearch}>
                    <div className="fl wide">
                        <label>Student</label>
                        <input className="field" placeholder="Name, email, phone or university" value={q}
                            onChange={(e) => setQ(e.target.value)} />
                    </div>
                    <div className="fl">
                        <label>Subject</label>
                        <select className="field" value={subject} onChange={(e) => changeSubject(e.target.value)}>
                            <option value="all">All subjects</option>
                            {subjects.map((s) => <option key={s.id} value={String(s.id)}>{s.icon} {s.name}</option>)}
                        </select>
                    </div>
                    <div className="fl">
                        <label>Exam</label>
                        <select className="field" value={exam} onChange={(e) => change(setExam)(e.target.value)}>
                            <option value="all">All exams</option>
                            {exams.map((x) => (
                                <option key={x.id} value={String(x.id)}>
                                    {(subject === "all" && x.subject ? x.subject.name + " · " : "") + x.title}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="fl">
                        <label>Result</label>
                        <select className="field" value={status} onChange={(e) => change(setStatus)(e.target.value)}>
                            <option value="all">Passed and failed</option>
                            <option value="passed">Passed</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>
                    <div className="fl">
                        <label>From</label>
                        <input type="date" className="field" value={from} max={to || undefined}
                            onChange={(e) => change(setFrom)(e.target.value)} />
                    </div>
                    <div className="fl">
                        <label>To</label>
                        <input type="date" className="field" value={to} min={from || undefined}
                            onChange={(e) => change(setTo)(e.target.value)} />
                    </div>
                    <div className="fl btns">
                        <button className="btn sm">Search</button>
                        {filtersOn ? <button type="button" className="btn ghost sm" onClick={resetFilters}>Clear</button> : null}
                    </div>
                </form>

                {loading ? (
                    <p className="adm-muted">Loading results...</p>
                ) : (
                    <div className="adm-tbl-wrap">
                        <table className="adm-tbl">
                            <thead>
                                <tr>
                                    <th>Student</th><th>University</th><th>Exam</th><th>Score</th>
                                    <th>Result</th><th>Time</th><th>Date</th><th />
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((r) => (
                                    <tr key={r.id}>
                                        <td>
                                            <div className="adm-user">
                                                <div className="adm-avatar">{(r.student.name || "?").charAt(0).toUpperCase()}</div>
                                                <div><b>{r.student.name}</b><small>{r.student.email}</small></div>
                                            </div>
                                        </td>
                                        <td>
                                            {r.student.university || "-"}
                                            {r.student.degree ? <span className="td-sub">{r.student.degree}</span> : null}
                                        </td>
                                        <td>{r.icon} {r.subject}<span className="td-sub">{r.exam}</span></td>
                                        <td>
                                            <b>{r.correct}/{r.total}</b>
                                            <span className="td-sub">{r.percent}%</span>
                                        </td>
                                        <td>
                                            <span className={"badge " + (r.passed ? "pass" : "fail")}>{r.passed ? "Passed" : "Failed"}</span>
                                        </td>
                                        <td>
                                            {fmtTime(r.time_taken)}
                                            {r.time_up ? <span className="td-sub">time up</span> : null}
                                        </td>
                                        <td>{fmtDateTime(r.date)}</td>
                                        <td>
                                            <div className="adm-acts">
                                                <button type="button" className="btn sm" onClick={() => openReview(r)}>Review</button>
                                                <button type="button" className="btn bad sm" onClick={() => remove(r)}>Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {!items.length && (
                                    <tr><td colSpan={8} className="adm-muted" style={{ textAlign: "center" }}>No results found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {meta.last_page > 1 && (
                    <div className="adm-pager">
                        <button type="button" className="btn ghost sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
                        <span>Page {meta.current_page} of {meta.last_page} · {meta.total} results</span>
                        <button type="button" className="btn ghost sm" disabled={page >= meta.last_page} onClick={() => setPage(page + 1)}>Next →</button>
                    </div>
                )}
            </div>

            {/* ---------- Answer review ---------- */}
            {review && (
                <div className="adm-overlay">
                    <div className="adm-modal xl">
                        <div className="adm-modal-head">
                            <div>
                                <h3>Answer review</h3>
                                {review.attempt && (
                                    <p className="sub" style={{ margin: 0 }}>
                                        {review.attempt.student} · {review.attempt.subject} · {review.attempt.exam} ·{" "}
                                        {review.attempt.correct}/{review.attempt.total} ({review.attempt.percent}%)
                                    </p>
                                )}
                            </div>
                            <button type="button" className="adm-x" onClick={() => setReview(null)} aria-label="Close">✕</button>
                        </div>

                        {review.loading && <p className="adm-muted">Loading...</p>}
                        {review.error && <div className="adm-note bad">{review.error}</div>}
                        {review.attempt && (review.attempt.items || []).map((it, i) => {
                            const state = !it.sel ? "skip" : it.sel === it.ans ? "right" : "wrong";
                            return (
                                <div className={"rv-item " + state} key={i}>
                                    <p><b>{i + 1}. {it.q}</b></p>
                                    <p>Student answer: <b>{it.sel || "Not answered"}</b></p>
                                    {state !== "right" && <p>Correct answer: <b style={{ color: "var(--ok)" }}>{it.ans}</b></p>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <Toast toast={toast} />
        </>
    );
}

export default Results;