import { useEffect, useState } from "react";
import { apiRequest, pickList, fieldErrors } from "./api";
import { useToast, Toast } from "./ui";

const blank = { id: null, name: "", icon: "📚", color: "#667eea", sort_order: 0, active: true };

function Subjects({ token, onUnauthorized, go }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [q, setQ] = useState("");
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

    const load = async () => {
        setLoading(true);
        setLoadError("");
        try {
            const body = await apiRequest("/subjects", { token });
            setItems(pickList(body));
        } catch (err) {
            if (!expired(err)) setLoadError(err.message);
        }
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    const openNew = () => {
        setForm({ ...blank, sort_order: items.length + 1 });
        setErrors({});
        setFormError("");
    };
    const openEdit = (s) => {
        setForm({ id: s.id, name: s.name, icon: s.icon || "📚", color: s.color || "#667eea", sort_order: s.sort_order || 0, active: !!s.active });
        setErrors({});
        setFormError("");
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            setErrors({ name: "Enter the subject name." });
            return;
        }
        const body = {
            name: form.name.trim(),
            icon: form.icon || "📚",
            color: form.color,
            sort_order: Number(form.sort_order) || 0,
            active: form.active,
        };
        setSaving(true);
        setFormError("");
        try {
            if (form.id) await apiRequest("/subjects/" + form.id, { method: "PUT", token, body });
            else await apiRequest("/subjects", { method: "POST", token, body });
            setForm(null);
            say("ok", form.id ? "Subject updated." : "Subject created.");
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

    const toggle = async (s) => {
        try {
            await apiRequest("/subjects/" + s.id, { method: "PUT", token, body: { active: !s.active } });
            say("ok", s.active ? "Subject hidden." : "Subject is visible now.");
            load();
        } catch (err) {
            if (!expired(err)) say("bad", err.message);
        }
    };

    const remove = async (s) => {
        if (!window.confirm('Delete "' + s.name + '" with all its exams and questions? This cannot be undone.')) return;
        try {
            await apiRequest("/subjects/" + s.id, { method: "DELETE", token });
            say("ok", "Subject deleted.");
            load();
        } catch (err) {
            if (!expired(err)) say("bad", err.message);
        }
    };

    const list = items.filter((s) => !q.trim() || s.name.toLowerCase().includes(q.trim().toLowerCase()));

    return (
        <>
            <div className="adm-top">
                <div>
                    <h2>Subjects</h2>
                    <p>Create and manage subjects.</p>
                </div>
                <button type="button" className="btn" onClick={openNew}>+ New subject</button>
            </div>

            {loadError && (
                <div className="adm-note bad">
                    Could not load subjects: {loadError}{" "}
                    <button type="button" className="btn ghost sm" onClick={load}>Retry</button>
                </div>
            )}

            <div className="adm-card">
                <div className="adm-tools">
                    <input className="field" placeholder="Search subject" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>

                {loading ? (
                    <p className="adm-muted">Loading subjects...</p>
                ) : (
                    <div className="adm-tbl-wrap">
                        <table className="adm-tbl">
                            <thead>
                                <tr><th>Subject</th><th>Exams</th><th>Status</th><th /></tr>
                            </thead>
                            <tbody>
                                {list.map((s) => (
                                    <tr key={s.id}>
                                        <td><span className="dot" style={{ background: s.color }} /> {s.icon} <b>{s.name}</b></td>
                                        <td>{s.exams_count}</td>
                                        <td><span className={"badge " + (s.active ? "pass" : "gray")}>{s.active ? "Active" : "Hidden"}</span></td>
                                        <td>
                                            <div className="adm-acts">
                                                <button type="button" className="btn sm" onClick={() => go("exams", { subject_id: s.id })}>Exams</button>
                                                <button type="button" className="btn ghost sm" onClick={() => openEdit(s)}>Edit</button>
                                                <button type="button" className="btn ghost sm" onClick={() => toggle(s)}>{s.active ? "Hide" : "Show"}</button>
                                                <button type="button" className="btn bad sm" onClick={() => remove(s)}>Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {!list.length && (
                                    <tr><td colSpan={4} className="adm-muted" style={{ textAlign: "center" }}>No subjects found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {form && (
                <div className="adm-overlay">
                    <form className="adm-modal" onSubmit={submit} noValidate>
                        <h3>{form.id ? "Edit subject" : "New subject"}</h3>
                        {formError && <div className="adm-note bad">{formError}</div>}

                        <label className="label" htmlFor="s-name">Name</label>
                        <input id="s-name" className={"field" + (errors.name ? " invalid" : "")} value={form.name} autoFocus
                            onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        {errors.name && <div className="f-err">{errors.name}</div>}

                        <div className="f-row">
                            <div>
                                <label className="label" htmlFor="s-icon">Icon (emoji)</label>
                                <input id="s-icon" className="field" maxLength={4} value={form.icon}
                                    onChange={(e) => setForm({ ...form, icon: e.target.value })} />
                            </div>
                            <div>
                                <label className="label" htmlFor="s-color">Color</label>
                                <input id="s-color" type="color" className={"field" + (errors.color ? " invalid" : "")} style={{ padding: 4, height: 46 }}
                                    value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
                                {errors.color && <div className="f-err">{errors.color}</div>}
                            </div>
                        </div>

                        <label className="label" htmlFor="s-order">Sort order</label>
                        <input id="s-order" type="number" min="0" className="field" value={form.sort_order}
                            onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />

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

export default Subjects;