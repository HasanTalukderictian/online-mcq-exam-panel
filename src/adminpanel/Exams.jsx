import { useEffect, useState } from "react";
import { apiRequest, pickList, fieldErrors } from "./api";
import { useToast, Toast, fmtTime } from "./ui";

function Exams({ token, onUnauthorized, go, subjectId }) {
    const [subjects, setSubjects] = useState([]);
    const [items, setItems] = useState([]);
    const [filter, setFilter] = useState(subjectId ? String(subjectId) : "all");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [form, setForm] = useState(null);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);
    const [toast, say] = useToast();

    const expired = (err) => {
        if (err.status === 401) {
            onUnauthorized();
            return true;
        }
        return false;
    };

    useEffect(() => {
        apiRequest("/subjects", { token })
            .then((b) => setSubjects(pickList(b)))
            .catch((err) => {
                if (!expired(err)) setLoadError(err.message);
            });
    }, []);

    const load = async () => {
        setLoading(true);
        setLoadError("");
        try {
            const qs = filter === "all" ? "" : "?subject_id=" + filter;
            const body = await apiRequest("/exams" + qs, { token });
            setItems(pickList(body));
        } catch (err) {
            if (!expired(err)) setLoadError(err.message);
        }
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, [filter]);

    const openNew = () => {
        const first = subjects[0] ? String(subjects[0].id) : "";
        setForm({ id: null, subject_id: filter !== "all" ? filter : first, title: "", duration: 120, pass_mark: 60, active: true });
        setErrors({});
        setFormError("");
    };
    const openEdit = (x) => {
        setForm({ id: x.id, subject_id: String(x.subject_id), title: x.title, duration: x.duration, pass_mark: x.pass_mark, active: !!x.active });
        setErrors({});
        setFormError("");
    };

    const submit = async (e) => {
        e.preventDefault();
        const er = {};
        const duration = Number(form.duration);
        const pass = Number(form.pass_mark);
        if (!form.subject_id) er.subject_id = "Select a subject.";
        if (!form.title.trim()) er.title = "Enter the exam name.";
        if (!(duration >= 10)) er.duration = "At least 10 seconds.";
        if (!(pass >= 1 && pass <= 100)) er.pass_mark = "Between 1 and 100.";
        setErrors(er);
        if (Object.keys(er).length) return;

        const body = { subject_id: Number(form.subject_id), title: form.title.trim(), duration, pass_mark: pass, active: form.active };
        setSaving(true);
        setFormError("");
        try {
            if (form.id) await apiRequest("/exams/" + form.id, { method: "PUT", token, body });
            else await apiRequest("/exams", { method: "POST", token, body });
            setForm(null);
            say("ok", form.id ? "Exam updated." : "Exam created.");
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

    const toggle = async (x) => {
        try {
            await apiRequest("/exams/" + x.id, { method: "PUT", token, body: { active: !x.active } });
            say("ok", x.active ? "Exam hidden." : "Exam is visible now.");
            load();
        } catch (err) {
            if (!expired(err)) say("bad", err.message);
        }
    };

    const remove = async (x) => {
        if (!window.confirm('Delete "' + x.title + '" with all its questions? This cannot be undone.')) return;
        try {
            await apiRequest("/exams/" + x.id, { method: "DELETE", token });
            say("ok", "Exam deleted.");
            load();
        } catch (err) {
            if (!expired(err)) say("bad", err.message);
        }
    };

    return (
        <>
            <div className="adm-top">
                <div>
                    <h2>Exams</h2>
                    <p>Exam 1, Exam 2 ... for each subject.</p>
                </div>
                <div className="adm-acts">
                    <select className="field" style={{ width: "auto" }} value={filter} onChange={(e) => setFilter(e.target.value)}>
                        <option value="all">All subjects</option>
                        {subjects.map((s) => <option key={s.id} value={String(s.id)}>{s.icon} {s.name}</option>)}
                    </select>
                    <button type="button" className="btn" onClick={openNew} disabled={!subjects.length}>+ New exam</button>
                </div>
            </div>

            {loadError && (
                <div className="adm-note bad">
                    Could not load exams: {loadError}{" "}
                    <button type="button" className="btn ghost sm" onClick={load}>Retry</button>
                </div>
            )}

            <div className="adm-card">
                {loading ? (
                    <p className="adm-muted">Loading exams...</p>
                ) : (
                    <div className="adm-tbl-wrap">
                        <table className="adm-tbl">
                            <thead>
                                <tr><th>Subject</th><th>Exam</th><th>Duration</th><th>Pass</th><th>Questions</th><th>Status</th><th /></tr>
                            </thead>
                            <tbody>
                                {items.map((x) => (
                                    <tr key={x.id}>
                                        <td>{x.subject ? x.subject.icon + " " + x.subject.name : "-"}</td>
                                        <td><b>{x.title}</b></td>
                                        <td>{fmtTime(x.duration)}</td>
                                        <td>{x.pass_mark}%</td>
                                        <td>{x.questions_count}</td>
                                        <td><span className={"badge " + (x.active ? "pass" : "gray")}>{x.active ? "Active" : "Hidden"}</span></td>
                                        <td>
                                            <div className="adm-acts">
                                                <button type="button" className="btn sm" onClick={() => go("questions", { exam_id: x.id })}>Questions</button>
                                                <button type="button" className="btn ghost sm" onClick={() => openEdit(x)}>Edit</button>
                                                <button type="button" className="btn ghost sm" onClick={() => toggle(x)}>{x.active ? "Hide" : "Show"}</button>
                                                <button type="button" className="btn bad sm" onClick={() => remove(x)}>Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {!items.length && (
                                    <tr><td colSpan={7} className="adm-muted" style={{ textAlign: "center" }}>No exams found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {form && (
                <div className="adm-overlay">
                    <form className="adm-modal" onSubmit={submit} noValidate>
                        <h3>{form.id ? "Edit exam" : "New exam"}</h3>
                        {formError && <div className="adm-note bad">{formError}</div>}

                        <label className="label" htmlFor="x-subject">Subject</label>
                        <select id="x-subject" className={"field" + (errors.subject_id ? " invalid" : "")} value={form.subject_id}
                            onChange={(e) => setForm({ ...form, subject_id: e.target.value })}>
                            <option value="">Select subject</option>
                            {subjects.map((s) => <option key={s.id} value={String(s.id)}>{s.icon} {s.name}</option>)}
                        </select>
                        {errors.subject_id && <div className="f-err">{errors.subject_id}</div>}

                        <label className="label" htmlFor="x-title">Exam name</label>
                        <input id="x-title" className={"field" + (errors.title ? " invalid" : "")} placeholder="Exam 1" value={form.title} autoFocus
                            onChange={(e) => setForm({ ...form, title: e.target.value })} />
                        {errors.title && <div className="f-err">{errors.title}</div>}

                        <div className="f-row">
                            <div>
                                <label className="label" htmlFor="x-dur">Duration (seconds)</label>
                                <input id="x-dur" type="number" min="10" className={"field" + (errors.duration ? " invalid" : "")} value={form.duration}
                                    onChange={(e) => setForm({ ...form, duration: e.target.value })} />
                                {errors.duration ? <div className="f-err">{errors.duration}</div> : <small className="adm-muted">120 = 2 min, 600 = 10 min</small>}
                            </div>
                            <div>
                                <label className="label" htmlFor="x-pass">Pass mark (%)</label>
                                <input id="x-pass" type="number" min="1" max="100" className={"field" + (errors.pass_mark ? " invalid" : "")} value={form.pass_mark}
                                    onChange={(e) => setForm({ ...form, pass_mark: e.target.value })} />
                                {errors.pass_mark && <div className="f-err">{errors.pass_mark}</div>}
                            </div>
                        </div>

                        <label className="adm-switch">
                            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                            Visible to students
                        </label>

                        <div style={{ display: "flex", gap: 10 }}>
                            <button type="button" className="btn ghost" style={{ flex: 1 }} onClick={() => setForm(null)}>Cancel</button>
                            <button className="btn" style={{ flex: 1 }} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
                        </div>
                    </form>
                </div>
            )}

            <Toast toast={toast} />
        </>
    );
}

export default Exams;