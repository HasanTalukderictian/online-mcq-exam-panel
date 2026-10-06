import { useEffect, useState } from "react";
import { apiRequest, getData, pickList, fieldErrors } from "./api";
import { useToast, Toast, fmtTime } from "./ui";
import "../adminpanel/css/students.css";

const PER_PAGE = 10;

const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";
const fmtDateTime = (d) =>
    d ? new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "-";

function Students({ token, onUnauthorized }) {
    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [summary, setSummary] = useState(null);
    const [page, setPage] = useState(1);
    const [q, setQ] = useState("");
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    const [edit, setEdit] = useState(null);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    const [detail, setDetail] = useState(null); // { loading, error, student, attempts }
    const [review, setReview] = useState(null); // { loading, error, attempt }
    const [toast, say] = useToast();

    const expired = (err) => {
        if (err.status === 401) {
            onUnauthorized();
            return true;
        }
        return false;
    };

    /* ---------- list ---------- */
    const load = async () => {
        setLoading(true);
        setLoadError("");
        try {
            let qs = "?per_page=" + PER_PAGE + "&page=" + page;
            if (search.trim()) qs += "&search=" + encodeURIComponent(search.trim());
            if (status !== "all") qs += "&active=" + (status === "active" ? "1" : "0");
            const body = await apiRequest("/admin/students" + qs, { token });
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
    }, [page, search, status]);

    const runSearch = (e) => {
        e.preventDefault();
        setPage(1);
        setSearch(q);
    };

    /* ---------- detail ---------- */
    const openDetail = async (s) => {
        setDetail({ loading: true, error: "", student: s, attempts: [] });
        try {
            const body = await apiRequest("/admin/students/" + s.id, { token });
            const d = getData(body);
            setDetail({ loading: false, error: "", student: d.student, attempts: d.attempts || [] });
        } catch (err) {
            if (expired(err)) return;
            setDetail({ loading: false, error: err.message, student: s, attempts: [] });
        }
    };

    const resetAttempt = async (a) => {
        const msg = "Delete this result (" + a.subject + " · " + a.exam + ")? The student will be able to take this exam again.";
        if (!window.confirm(msg)) return;
        try {
            await apiRequest("/admin/attempts/" + a.id, { method: "DELETE", token });
            say("ok", "Result deleted. The student can retake this exam.");
            openDetail(detail.student);
            load();
        } catch (err) {
            if (!expired(err)) say("bad", err.message);
        }
    };

    /* ---------- review one result ---------- */
    const openReview = async (a) => {
        setReview({ loading: true, error: "", attempt: null });
        try {
            const body = await apiRequest("/admin/attempts/" + a.id, { token });
            setReview({ loading: false, error: "", attempt: getData(body) });
        } catch (err) {
            if (expired(err)) return;
            setReview({ loading: false, error: err.message, attempt: null });
        }
    };

    /* ---------- edit ---------- */
    const openEdit = (s) => {
        setEdit({
            id: s.id,
            name: s.name || "",
            email: s.email || "",
            phone: s.phone || "",
            university: s.university || "",
            degree: s.degree || "",
            password: "",
            active: !!s.active,
        });
        setErrors({});
        setFormError("");
    };

    const submit = async (e) => {
        e.preventDefault();
        const er = {};
        if (!edit.name.trim()) er.name = "Enter the name.";
        if (!/^\S+@\S+\.\S+$/.test(edit.email.trim())) er.email = "Enter a valid email.";
        if (edit.phone.trim() && !/^\+?[0-9][0-9\s-]{6,18}$/.test(edit.phone.trim())) er.phone = "Enter a valid phone number.";
        if (edit.password && edit.password.length < 6) er.password = "Use at least 6 characters.";
        setErrors(er);
        if (Object.keys(er).length) return;

        const body = {
            name: edit.name.trim(),
            email: edit.email.trim(),
            phone: edit.phone.trim() || null,
            university: edit.university.trim() || null,
            degree: edit.degree.trim() || null,
            active: edit.active,
        };
        if (edit.password) body.password = edit.password;

        setSaving(true);
        setFormError("");
        try {
            await apiRequest("/admin/students/" + edit.id, { method: "PUT", token, body });
            setEdit(null);
            say("ok", "Student updated.");
            load();
        } catch (err) {
            if (expired(err)) return;
            const fe = fieldErrors(err);
            setErrors(fe);
            setFormError(Object.keys(fe).length ? "Please fix the highlighted fields." : err.message);
        } finally {
            setSaving(false);
        }
    };

    /* ---------- status / delete ---------- */
    const toggle = async (s) => {
        try {
            await apiRequest("/admin/students/" + s.id, { method: "PUT", token, body: { active: !s.active } });
            say("ok", s.active ? "Student deactivated." : "Student activated.");
            load();
        } catch (err) {
            if (!expired(err)) say("bad", err.message);
        }
    };

    const remove = async (s) => {
        if (!window.confirm('Delete "' + s.name + '" and all of their results? This cannot be undone.')) return;
        try {
            await apiRequest("/admin/students/" + s.id, { method: "DELETE", token });
            say("ok", "Student deleted.");
            if (items.length === 1 && page > 1) setPage(page - 1);
            else load();
        } catch (err) {
            if (!expired(err)) say("bad", err.message);
        }
    };

    const cards = [
        { label: "Total students", value: summary ? summary.total : "-", icon: "👥", c: "#7c3aed" },
        { label: "Active", value: summary ? summary.active : "-", icon: "✅", c: "#14b8a6" },
        { label: "Inactive", value: summary ? summary.inactive : "-", icon: "⛔", c: "#ec4899" },
        { label: "Exams taken", value: summary ? summary.attempts : "-", icon: "🏆", c: "#f59e0b" },
    ];

    return (
        <>
            <div className="adm-top">
                <div>
                    <h2>Students</h2>
                    <p>Students who signed up from the website.</p>
                </div>
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
                    Could not load students: {loadError}{" "}
                    <button type="button" className="btn ghost sm" onClick={load}>Retry</button>
                </div>
            )}

            <div className="adm-card">
                <form className="adm-tools" onSubmit={runSearch}>
                    <input className="field" style={{ minWidth: 260 }} placeholder="Search name, email, phone or university"
                        value={q} onChange={(e) => setQ(e.target.value)} />
                    <select className="field" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
                        <option value="all">All status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                    <button className="btn ghost sm">Search</button>
                </form>

                {loading ? (
                    <p className="adm-muted">Loading students...</p>
                ) : (
                    <div className="adm-tbl-wrap">
                        <table className="adm-tbl">
                            <thead>
                                <tr>
                                    <th>Student</th><th>Phone</th><th>University</th><th>Exams</th>
                                    <th>Average</th><th>Joined</th><th>Status</th><th />
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((s) => (
                                    <tr key={s.id}>
                                        <td>
                                            <div className="adm-user">
                                                <div className="adm-avatar">{(s.name || "?").charAt(0).toUpperCase()}</div>
                                                <div><b>{s.name}</b><small>{s.email}</small></div>
                                            </div>
                                        </td>
                                        <td>{s.phone || "-"}</td>
                                        <td>
                                            {s.university || "-"}
                                            {s.degree ? <span className="td-sub">{s.degree}</span> : null}
                                        </td>
                                        <td>{s.attempts_count}</td>
                                        <td>{s.avg_percent === null ? "-" : s.avg_percent + "%"}</td>
                                        <td>{fmtDate(s.created_at)}</td>
                                        <td>
                                            <span className={"badge " + (s.active ? "pass" : "gray")}>{s.active ? "Active" : "Inactive"}</span>
                                        </td>
                                        <td>
                                            <div className="adm-acts">
                                                <button type="button" className="btn sm" onClick={() => openDetail(s)}>View</button>
                                                <button type="button" className="btn ghost sm" onClick={() => openEdit(s)}>Edit</button>
                                                <button type="button" className="btn ghost sm" onClick={() => toggle(s)}>
                                                    {s.active ? "Deactivate" : "Activate"}
                                                </button>
                                                <button type="button" className="btn bad sm" onClick={() => remove(s)}>Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {!items.length && (
                                    <tr><td colSpan={8} className="adm-muted" style={{ textAlign: "center" }}>No students found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {meta.last_page > 1 && (
                    <div className="adm-pager">
                        <button type="button" className="btn ghost sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
                        <span>Page {meta.current_page} of {meta.last_page} · {meta.total} students</span>
                        <button type="button" className="btn ghost sm" disabled={page >= meta.last_page} onClick={() => setPage(page + 1)}>Next →</button>
                    </div>
                )}
            </div>

            {/* ---------- Student detail ---------- */}
            {detail && (
                <div className="adm-overlay">
                    <div className="adm-modal xl">
                        <div className="adm-modal-head">
                            <div>
                                <h3>{detail.student.name}</h3>
                                <p className="sub" style={{ margin: 0 }}>{detail.student.email}</p>
                            </div>
                            <button type="button" className="adm-x" onClick={() => setDetail(null)} aria-label="Close">✕</button>
                        </div>

                        <div className="st-info">
                            <div><small>Phone</small><b>{detail.student.phone || "-"}</b></div>
                            <div><small>University</small><b>{detail.student.university || "-"}</b></div>
                            <div><small>Degree</small><b>{detail.student.degree || "-"}</b></div>
                            <div><small>Joined</small><b>{fmtDate(detail.student.created_at)}</b></div>
                            <div><small>Exams taken</small><b>{detail.student.attempts_count}</b></div>
                            <div>
                                <small>Average score</small>
                                <b>{detail.student.avg_percent === null ? "-" : detail.student.avg_percent + "%"}</b>
                            </div>
                        </div>

                        <h4 style={{ margin: "0 0 10px" }}>Exam results</h4>
                        {detail.loading && <p className="adm-muted">Loading results...</p>}
                        {detail.error && <div className="adm-note bad">{detail.error}</div>}
                        {!detail.loading && !detail.error && !detail.attempts.length && (
                            <p className="adm-muted">This student has not taken any exam yet.</p>
                        )}
                        {detail.attempts.length > 0 && (
                            <div className="adm-tbl-wrap">
                                <table className="adm-tbl">
                                    <thead>
                                        <tr><th>Exam</th><th>Score</th><th>Result</th><th>Time</th><th>Date</th><th /></tr>
                                    </thead>
                                    <tbody>
                                        {detail.attempts.map((a) => (
                                            <tr key={a.id}>
                                                <td>{a.icon} {a.subject} · <b>{a.exam}</b></td>
                                                <td>{a.correct}/{a.total} ({a.percent}%)</td>
                                                <td><span className={"badge " + (a.passed ? "pass" : "fail")}>{a.passed ? "Passed" : "Failed"}</span></td>
                                                <td>{fmtTime(a.time_taken)}</td>
                                                <td>{fmtDateTime(a.date)}</td>
                                                <td>
                                                    <div className="adm-acts">
                                                        <button type="button" className="btn sm" onClick={() => openReview(a)}>Review</button>
                                                        <button type="button" className="btn bad sm" onClick={() => resetAttempt(a)}>Reset</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ---------- Answer review ---------- */}
            {review && (
                <div className="adm-overlay" style={{ zIndex: 55 }}>
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

            {/* ---------- Edit ---------- */}
            {edit && (
                <div className="adm-overlay">
                    <form className="adm-modal" onSubmit={submit} noValidate>
                        <h3>Edit student</h3>
                        <p className="sub">Leave the password blank to keep it unchanged.</p>
                        {formError && <div className="adm-note bad">{formError}</div>}

                        <label className="label" htmlFor="e-name">Name</label>
                        <input id="e-name" className={"field" + (errors.name ? " invalid" : "")} value={edit.name} autoFocus
                            onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                        {errors.name && <div className="f-err">{errors.name}</div>}

                        <label className="label" htmlFor="e-email">Email</label>
                        <input id="e-email" type="email" className={"field" + (errors.email ? " invalid" : "")} value={edit.email}
                            onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
                        {errors.email && <div className="f-err">{errors.email}</div>}

                        <div className="f-row">
                            <div>
                                <label className="label" htmlFor="e-phone">Phone</label>
                                <input id="e-phone" className={"field" + (errors.phone ? " invalid" : "")} value={edit.phone}
                                    onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
                                {errors.phone && <div className="f-err">{errors.phone}</div>}
                            </div>
                            <div>
                                <label className="label" htmlFor="e-degree">Degree</label>
                                <input id="e-degree" className={"field" + (errors.degree ? " invalid" : "")} value={edit.degree}
                                    onChange={(e) => setEdit({ ...edit, degree: e.target.value })} />
                                {errors.degree && <div className="f-err">{errors.degree}</div>}
                            </div>
                        </div>

                        <label className="label" htmlFor="e-uni">University</label>
                        <input id="e-uni" className={"field" + (errors.university ? " invalid" : "")} value={edit.university}
                            onChange={(e) => setEdit({ ...edit, university: e.target.value })} />
                        {errors.university && <div className="f-err">{errors.university}</div>}

                        <label className="label" htmlFor="e-pass">New password <small className="adm-muted">(optional)</small></label>
                        <input id="e-pass" type="password" autoComplete="new-password" className={"field" + (errors.password ? " invalid" : "")}
                            value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} />
                        {errors.password && <div className="f-err">{errors.password}</div>}

                        <label className="adm-switch">
                            <input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />
                            Account is active
                        </label>

                        <div style={{ display: "flex", gap: 10 }}>
                            <button type="button" className="btn ghost" style={{ flex: 1 }} onClick={() => setEdit(null)}>Cancel</button>
                            <button className="btn" style={{ flex: 1 }} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
                        </div>
                    </form>
                </div>
            )}

            <Toast toast={toast} />
        </>
    );
}

export default Students;