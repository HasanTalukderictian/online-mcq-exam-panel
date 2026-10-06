import { useEffect, useState } from "react";
import { apiRequest, pickList, fieldErrors } from "./api";
import { useToast, Toast } from "./ui";

const PER_PAGE = 10;

function Questions({ token, onUnauthorized, examId }) {
    const [exams, setExams] = useState([]);
    const [examFilter, setExamFilter] = useState(examId ? String(examId) : "all");
    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [page, setPage] = useState(1);
    const [q, setQ] = useState("");
    const [search, setSearch] = useState("");
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
        apiRequest("/exams", { token })
            .then((b) => setExams(pickList(b)))
            .catch((err) => {
                if (!expired(err)) setLoadError(err.message);
            });
    }, []);

    const load = async () => {
        setLoading(true);
        setLoadError("");
        try {
            let qs = "?per_page=" + PER_PAGE + "&page=" + page;
            if (examFilter !== "all") qs += "&exam_id=" + examFilter;
            if (search.trim()) qs += "&search=" + encodeURIComponent(search.trim());
            const body = await apiRequest("/questions" + qs, { token });
            setItems(pickList(body));
            if (body.meta) setMeta(body.meta);
        } catch (err) {
            if (!expired(err)) setLoadError(err.message);
        }
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, [examFilter, page, search]);

    const examLabel = (x) => (x.subject ? x.subject.name + " · " : "") + x.title;

    const openNew = () => {
        const first = exams[0] ? String(exams[0].id) : "";
        setForm({ id: null, exam_id: examFilter !== "all" ? examFilter : first, question: "", options: ["", "", "", ""], correct: 0, explanation: "" });
        setErrors({});
        setFormError("");
    };
    const openEdit = (x) => {
        const idx = x.options.indexOf(x.answer);
        setForm({
            id: x.id,
            exam_id: String(x.exam_id),
            question: x.question,
            options: x.options.slice(),
            correct: idx >= 0 ? idx : 0,
            explanation: x.explanation || "",
        });
        setErrors({});
        setFormError("");
    };

    const setOpt = (i, v) => setForm({ ...form, options: form.options.map((o, k) => (k === i ? v : o)) });
    const addOpt = () => {
        if (form.options.length < 6) setForm({ ...form, options: form.options.concat([""]) });
    };
    const delOpt = (i) => {
        if (form.options.length <= 2) return;
        let correct = form.correct;
        if (i === correct) correct = 0;
        else if (i < correct) correct = correct - 1;
        setForm({ ...form, options: form.options.filter((o, k) => k !== i), correct });
    };

    const submit = async (e) => {
        e.preventDefault();
        const opts = form.options.map((o) => o.trim());
        const er = {};
        if (!form.exam_id) er.exam_id = "Select an exam.";
        if (!form.question.trim()) er.question = "Write the question.";
        if (opts.some((o) => !o)) er.options = "Fill in every option.";
        else if (new Set(opts).size !== opts.length) er.options = "Options must all be different.";
        setErrors(er);
        if (Object.keys(er).length) return;

        const body = {
            exam_id: Number(form.exam_id),
            question: form.question.trim(),
            options: opts,
            answer: opts[form.correct],
            explanation: form.explanation.trim() || null,
        };
        setSaving(true);
        setFormError("");
        try {
            if (form.id) await apiRequest("/questions/" + form.id, { method: "PUT", token, body });
            else await apiRequest("/questions", { method: "POST", token, body });
            setForm(null);
            say("ok", form.id ? "Question updated." : "Question added.");
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

    const remove = async (x) => {
        if (!window.confirm("Delete this question?")) return;
        try {
            await apiRequest("/questions/" + x.id, { method: "DELETE", token });
            say("ok", "Question deleted.");
            load();
        } catch (err) {
            if (!expired(err)) say("bad", err.message);
        }
    };

    const runSearch = (e) => {
        e.preventDefault();
        setPage(1);
        setSearch(q);
    };

    return (
        <>
            <div className="adm-top">
                <div>
                    <h2>Questions</h2>
                    <p>{meta.total} question(s)</p>
                </div>
                <button type="button" className="btn" onClick={openNew} disabled={!exams.length}>+ Add question</button>
            </div>

            {loadError && (
                <div className="adm-note bad">
                    Could not load questions: {loadError}{" "}
                    <button type="button" className="btn ghost sm" onClick={load}>Retry</button>
                </div>
            )}

            <div className="adm-card">
                <form className="adm-tools" onSubmit={runSearch}>
                    <select className="field" value={examFilter} onChange={(e) => { setPage(1); setExamFilter(e.target.value); }}>
                        <option value="all">All exams</option>
                        {exams.map((x) => <option key={x.id} value={String(x.id)}>{examLabel(x)}</option>)}
                    </select>
                    <input className="field" placeholder="Search question" value={q} onChange={(e) => setQ(e.target.value)} />
                    <button className="btn ghost sm">Search</button>
                </form>

                {loading ? (
                    <p className="adm-muted">Loading questions...</p>
                ) : (
                    <>
                        {items.map((x, i) => (
                            <div className="adm-q" key={x.id}>
                                <div className="adm-q-main">
                                    <b>{(meta.current_page - 1) * PER_PAGE + i + 1}. {x.question}</b>
                                    <small className="adm-muted">{x.exam ? "Exam: " + x.exam.title : ""}</small>
                                    <div>
                                        {x.options.map((o, k) => (
                                            <span key={k} className={"opt-tag" + (o === x.answer ? " ok" : "")}>{String.fromCharCode(65 + k)}. {o}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="adm-acts">
                                    <button type="button" className="btn ghost sm" onClick={() => openEdit(x)}>Edit</button>
                                    <button type="button" className="btn bad sm" onClick={() => remove(x)}>Delete</button>
                                </div>
                            </div>
                        ))}
                        {!items.length && <p className="adm-muted" style={{ textAlign: "center" }}>No questions found.</p>}
                    </>
                )}

                {meta.last_page > 1 && (
                    <div className="adm-pager">
                        <button type="button" className="btn ghost sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
                        <span>Page {meta.current_page} of {meta.last_page}</span>
                        <button type="button" className="btn ghost sm" disabled={page >= meta.last_page} onClick={() => setPage(page + 1)}>Next →</button>
                    </div>
                )}
            </div>

            {form && (
                <div className="adm-overlay">
                    <form className="adm-modal wide" onSubmit={submit} noValidate>
                        <h3>{form.id ? "Edit question" : "New question"}</h3>
                        {formError && <div className="adm-note bad">{formError}</div>}

                        <label className="label" htmlFor="q-exam">Exam</label>
                        <select id="q-exam" className={"field" + (errors.exam_id ? " invalid" : "")} value={form.exam_id}
                            onChange={(e) => setForm({ ...form, exam_id: e.target.value })}>
                            <option value="">Select exam</option>
                            {exams.map((x) => <option key={x.id} value={String(x.id)}>{examLabel(x)}</option>)}
                        </select>
                        {errors.exam_id && <div className="f-err">{errors.exam_id}</div>}

                        <label className="label" htmlFor="q-text">Question</label>
                        <textarea id="q-text" rows={3} className={"field" + (errors.question ? " invalid" : "")} value={form.question} autoFocus
                            onChange={(e) => setForm({ ...form, question: e.target.value })} />
                        {errors.question && <div className="f-err">{errors.question}</div>}

                        <label className="label">Options <small className="adm-muted">(select the circle of the correct answer)</small></label>
                        {form.options.map((o, i) => (
                            <div className="adm-opt-row" key={i}>
                                <input type="radio" name="correct" checked={form.correct === i} onChange={() => setForm({ ...form, correct: i })}
                                    aria-label={"Option " + (i + 1) + " is correct"} />
                                <b>{String.fromCharCode(65 + i)}</b>
                                <input className="field" value={o} onChange={(e) => setOpt(i, e.target.value)} />
                                {form.options.length > 2 && (
                                    <button type="button" className="btn ghost sm" onClick={() => delOpt(i)} aria-label="Remove option">✕</button>
                                )}
                            </div>
                        ))}
                        {(errors.options || errors.answer) && <div className="f-err">{errors.options || errors.answer}</div>}
                        {form.options.length < 6 && (
                            <button type="button" className="btn ghost sm" onClick={addOpt}>+ Add option</button>
                        )}

                        <label className="label" htmlFor="q-exp">Explanation <small className="adm-muted">(optional)</small></label>
                        <textarea id="q-exp" rows={2} className="field" value={form.explanation}
                            onChange={(e) => setForm({ ...form, explanation: e.target.value })} />

                        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
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

export default Questions;