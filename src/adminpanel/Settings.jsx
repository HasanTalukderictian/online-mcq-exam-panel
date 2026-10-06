import { useEffect, useState } from "react";
import { apiRequest, getData, pickList, fieldErrors } from "./api";
import { useToast, Toast } from "./ui";
import "./css/settings.css";

const TABS = [
    { id: "profile", label: "👤 Profile" },
    { id: "password", label: "🔑 Password" },
    {
        id: "site", label: "🌐 Site info", su: true,
        title: "Site info", desc: "Shown on the landing page, header and footer.",
        fields: [
            { key: "site_name", label: "Site name", type: "text", required: true },
            { key: "site_tagline", label: "Tagline", type: "text" },
            { key: "hero_title", label: "Home page title", type: "text", hint: "The big gradient title on the home page." },
            { key: "hero_text", label: "Home page description", type: "textarea" },
            { key: "footer_text", label: "Footer text", type: "text" },
            { key: "contact_email", label: "Contact email", type: "email" },
            { key: "contact_phone", label: "Contact phone", type: "text" },
        ],
    },
    {
        id: "registration", label: "📝 Registration", su: true,
        title: "Registration", desc: "Control who can sign up.",
        fields: [
            { key: "registration_open", label: "Allow new students to sign up", type: "toggle" },
            { key: "require_approval", label: "Students must be approved by an admin", type: "toggle",
              hint: "New accounts stay inactive until you activate them on the Students page." },
        ],
    },
    {
        id: "exam", label: "⚙️ Exam rules", su: true,
        title: "Exam rules", desc: "Applies to exams that students start from now on.",
        fields: [
            { key: "shuffle_questions", label: "Shuffle question order", type: "toggle" },
            { key: "shuffle_options", label: "Shuffle the options of each question", type: "toggle" },
            { key: "show_answers", label: "Show correct answers after the exam", type: "toggle",
              hint: "If off, students only see which of their answers were right or wrong." },
            { key: "negative_marking", label: "Negative marking (per wrong answer)", type: "number", min: 0, max: 5, step: 0.05,
              hint: "0 = off. Example: 0.25 removes a quarter mark for every wrong answer." },
            { key: "default_duration", label: "Default exam duration (seconds)", type: "number", min: 10, max: 14400, step: 10 },
            { key: "default_pass_mark", label: "Default pass mark (%)", type: "number", min: 1, max: 100, step: 1 },
        ],
    },
    {
        id: "maintenance", label: "🛠 Maintenance", su: true,
        title: "Maintenance", desc: "Pause new exams. Students who are already taking an exam can still submit.",
        fields: [
            { key: "maintenance_mode", label: "Close exams temporarily", type: "toggle" },
            { key: "maintenance_message", label: "Message for students", type: "textarea" },
        ],
    },
    { id: "danger", label: "⚠️ Danger zone", su: true },
];

function Toggle({ checked, onChange, label, hint }) {
    return (
        <label className="set-toggle">
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
            <span className="sw" />
            <span className="tx"><b>{label}</b>{hint ? <small>{hint}</small> : null}</span>
        </label>
    );
}

/* ---------- generic form for the site-wide tabs ---------- */
function SettingsForm({ tab, values, token, onSaved, onUnauthorized, say }) {
    const [form, setForm] = useState(() => {
        const o = {};
        tab.fields.forEach((f) => {
            const v = values[f.key];
            o[f.key] = v === undefined || v === null ? (f.type === "toggle" ? false : "") : v;
        });
        return o;
    });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const set = (k, v) => {
        setForm({ ...form, [k]: v });
        setErrors({ ...errors, [k]: "" });
    };

    const submit = async (e) => {
        e.preventDefault();
        const er = {};
        const body = {};
        tab.fields.forEach((f) => {
            let v = form[f.key];
            if (f.type === "number") {
                v = Number(v);
                if (Number.isNaN(v) || v < f.min || v > f.max) er[f.key] = "Enter a number from " + f.min + " to " + f.max + ".";
            }
            if (f.required && !String(v).trim()) er[f.key] = "This field is required.";
            body[f.key] = v;
        });
        setErrors(er);
        if (Object.keys(er).length) return;

        setSaving(true);
        try {
            const res = await apiRequest("/admin/settings", { method: "PUT", token, body });
            onSaved(getData(res).values);
            say("ok", "Settings saved.");
        } catch (err) {
            if (err.status === 401) onUnauthorized();
            else {
                const fe = fieldErrors(err);
                setErrors(fe);
                say("bad", Object.keys(fe).length ? "Please fix the highlighted fields." : err.message);
            }
        }
        setSaving(false);
    };

    return (
        <form className="adm-card set-card" onSubmit={submit} noValidate>
            <h3>{tab.title}</h3>
            <p className="adm-muted">{tab.desc}</p>

            {tab.fields.map((f) => {
                if (f.type === "toggle") {
                    return <Toggle key={f.key} label={f.label} hint={f.hint} checked={!!form[f.key]} onChange={(v) => set(f.key, v)} />;
                }
                return (
                    <div className="set-field" key={f.key}>
                        <label className="label" htmlFor={"f-" + f.key}>{f.label}</label>
                        {f.type === "textarea" ? (
                            <textarea id={"f-" + f.key} rows={3} className={"field" + (errors[f.key] ? " invalid" : "")}
                                value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} />
                        ) : (
                            <input id={"f-" + f.key} type={f.type} min={f.min} max={f.max} step={f.step}
                                className={"field" + (errors[f.key] ? " invalid" : "")}
                                value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} />
                        )}
                        {f.hint && <small className="adm-muted">{f.hint}</small>}
                        {errors[f.key] && <div className="f-err">{errors[f.key]}</div>}
                    </div>
                );
            })}

            <button className="btn" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
        </form>
    );
}

/* ---------- own profile ---------- */
function ProfileTab({ user, token, onUserUpdate, onUnauthorized, say }) {
    const [form, setForm] = useState({ name: user.name || "", email: user.email || "", phone: user.phone || "" });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const set = (k, v) => {
        setForm({ ...form, [k]: v });
        setErrors({ ...errors, [k]: "" });
    };

    const submit = async (e) => {
        e.preventDefault();
        const er = {};
        if (!form.name.trim()) er.name = "Enter your name.";
        if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) er.email = "Enter a valid email.";
        if (form.phone.trim() && !/^\+?[0-9][0-9\s-]{6,18}$/.test(form.phone.trim())) er.phone = "Enter a valid phone number.";
        setErrors(er);
        if (Object.keys(er).length) return;

        setSaving(true);
        try {
            const res = await apiRequest("/account", {
                method: "PUT",
                token,
                body: { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() || null },
            });
            onUserUpdate(getData(res));
            say("ok", "Profile updated.");
        } catch (err) {
            if (err.status === 401) onUnauthorized();
            else {
                const fe = fieldErrors(err);
                setErrors(fe);
                say("bad", Object.keys(fe).length ? "Please fix the highlighted fields." : err.message);
            }
        }
        setSaving(false);
    };

    return (
        <form className="adm-card set-card" onSubmit={submit} noValidate>
            <h3>My profile</h3>
            <p className="adm-muted">Your role: <b>{user.role}</b></p>

            <div className="set-field">
                <label className="label" htmlFor="p-name">Name</label>
                <input id="p-name" className={"field" + (errors.name ? " invalid" : "")} value={form.name} onChange={(e) => set("name", e.target.value)} />
                {errors.name && <div className="f-err">{errors.name}</div>}
            </div>
            <div className="set-field">
                <label className="label" htmlFor="p-email">Email</label>
                <input id="p-email" type="email" className={"field" + (errors.email ? " invalid" : "")} value={form.email} onChange={(e) => set("email", e.target.value)} />
                {errors.email && <div className="f-err">{errors.email}</div>}
            </div>
            <div className="set-field">
                <label className="label" htmlFor="p-phone">Phone</label>
                <input id="p-phone" className={"field" + (errors.phone ? " invalid" : "")} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                {errors.phone && <div className="f-err">{errors.phone}</div>}
            </div>

            <button className="btn" disabled={saving}>{saving ? "Saving..." : "Save profile"}</button>
        </form>
    );
}

/* ---------- change password ---------- */
function PasswordTab({ token, onUnauthorized, say }) {
    const blank = { current_password: "", password: "", password_confirmation: "", logout_others: true };
    const [form, setForm] = useState(blank);
    const [errors, setErrors] = useState({});
    const [show, setShow] = useState(false);
    const [saving, setSaving] = useState(false);

    const set = (k, v) => {
        setForm({ ...form, [k]: v });
        setErrors({ ...errors, [k]: "" });
    };
    const type = show ? "text" : "password";

    const submit = async (e) => {
        e.preventDefault();
        const er = {};
        if (!form.current_password) er.current_password = "Enter your current password.";
        if (form.password.length < 6) er.password = "Use at least 6 characters.";
        if (form.password !== form.password_confirmation) er.password_confirmation = "Passwords do not match.";
        setErrors(er);
        if (Object.keys(er).length) return;

        setSaving(true);
        try {
            await apiRequest("/account/password", { method: "PUT", token, body: form });
            setForm(blank);
            say("ok", "Password changed.");
        } catch (err) {
            if (err.status === 401) onUnauthorized();
            else {
                const fe = fieldErrors(err);
                setErrors(fe);
                say("bad", Object.keys(fe).length ? "Please fix the highlighted fields." : err.message);
            }
        }
        setSaving(false);
    };

    return (
        <form className="adm-card set-card" onSubmit={submit} noValidate>
            <h3>Change password</h3>
            <p className="adm-muted">Use a strong password that you do not use anywhere else.</p>

            <div className="set-field">
                <label className="label" htmlFor="pw-cur">Current password</label>
                <input id="pw-cur" type={type} autoComplete="current-password" className={"field" + (errors.current_password ? " invalid" : "")}
                    value={form.current_password} onChange={(e) => set("current_password", e.target.value)} />
                {errors.current_password && <div className="f-err">{errors.current_password}</div>}
            </div>
            <div className="set-field">
                <label className="label" htmlFor="pw-new">New password</label>
                <input id="pw-new" type={type} autoComplete="new-password" className={"field" + (errors.password ? " invalid" : "")}
                    value={form.password} onChange={(e) => set("password", e.target.value)} />
                {errors.password && <div className="f-err">{errors.password}</div>}
            </div>
            <div className="set-field">
                <label className="label" htmlFor="pw-conf">Confirm new password</label>
                <input id="pw-conf" type={type} autoComplete="new-password" className={"field" + (errors.password_confirmation ? " invalid" : "")}
                    value={form.password_confirmation} onChange={(e) => set("password_confirmation", e.target.value)} />
                {errors.password_confirmation && <div className="f-err">{errors.password_confirmation}</div>}
            </div>

            <label className="adm-switch" style={{ margin: "4px 0" }}>
                <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show passwords
            </label>
            <label className="adm-switch" style={{ margin: "4px 0 18px" }}>
                <input type="checkbox" checked={form.logout_others} onChange={(e) => set("logout_others", e.target.checked)} />
                Log me out from my other devices
            </label>

            <button className="btn" disabled={saving}>{saving ? "Saving..." : "Change password"}</button>
        </form>
    );
}

/* ---------- danger zone ---------- */
function DangerTab({ token, onUnauthorized, say }) {
    const [exams, setExams] = useState([]);
    const [examId, setExamId] = useState("");
    const [c1, setC1] = useState("");
    const [c2, setC2] = useState("");
    const [busy, setBusy] = useState("");

    useEffect(() => {
        apiRequest("/exams", { token })
            .then((b) => setExams(pickList(b)))
            .catch(() => setExams([]));
    }, []);

    const run = async (kind, path, message) => {
        if (!window.confirm(message)) return;
        setBusy(kind);
        try {
            const res = await apiRequest(path, { method: "DELETE", token, body: { confirm: "DELETE" } });
            say("ok", res.message || "Done.");
            if (kind === "all") setC1("");
            else setC2("");
        } catch (err) {
            if (err.status === 401) onUnauthorized();
            else say("bad", err.message);
        }
        setBusy("");
    };

    return (
        <div className="set-card">
            <div className="adm-card danger-card">
                <h3>Delete all student results</h3>
                <p className="adm-muted">Removes every exam result. Students can take every exam again. Accounts are not deleted.</p>
                <div className="danger-row">
                    <input className="field" placeholder='Type DELETE to confirm' value={c1} onChange={(e) => setC1(e.target.value)} />
                    <button type="button" className="btn bad" disabled={c1 !== "DELETE" || busy === "all"}
                        onClick={() => run("all", "/admin/danger/results", "This permanently deletes EVERY student result. Continue?")}>
                        {busy === "all" ? "Deleting..." : "Delete all results"}
                    </button>
                </div>
            </div>

            <div className="adm-card danger-card">
                <h3>Reset one exam</h3>
                <p className="adm-muted">Removes all results of one exam so every student can take it again.</p>
                <select className="field" style={{ marginBottom: 10 }} value={examId} onChange={(e) => setExamId(e.target.value)}>
                    <option value="">Select exam</option>
                    {exams.map((x) => (
                        <option key={x.id} value={String(x.id)}>{(x.subject ? x.subject.name + " · " : "") + x.title}</option>
                    ))}
                </select>
                <div className="danger-row">
                    <input className="field" placeholder='Type DELETE to confirm' value={c2} onChange={(e) => setC2(e.target.value)} />
                    <button type="button" className="btn bad" disabled={!examId || c2 !== "DELETE" || busy === "one"}
                        onClick={() => run("one", "/admin/danger/exams/" + examId + "/results", "This permanently deletes all results of the selected exam. Continue?")}>
                        {busy === "one" ? "Deleting..." : "Reset exam"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ---------- page ---------- */
function Settings({ token, user, onUnauthorized, onUserUpdate }) {
    const isSuper = user.role === "superadmin";
    const tabs = TABS.filter((t) => !t.su || isSuper);
    const [tabId, setTabId] = useState("profile");
    const [values, setValues] = useState(null);
    const [error, setError] = useState("");
    const [toast, say] = useToast();

    useEffect(() => {
        if (!isSuper) return;
        apiRequest("/admin/settings", { token })
            .then((b) => setValues(getData(b).values))
            .catch((err) => {
                if (err.status === 401) onUnauthorized();
                else setError(err.message);
            });
    }, []);

    const tab = tabs.find((t) => t.id === tabId) || tabs[0];
    const shared = { token, onUnauthorized, say };

    let body;
    if (tab.id === "profile") body = <ProfileTab user={user} onUserUpdate={onUserUpdate} {...shared} />;
    else if (tab.id === "password") body = <PasswordTab {...shared} />;
    else if (tab.id === "danger") body = <DangerTab {...shared} />;
    else if (error) body = <div className="adm-note bad">Could not load settings: {error}</div>;
    else if (!values) body = <p className="adm-muted">Loading settings...</p>;
    else body = <SettingsForm key={tab.id} tab={tab} values={values} onSaved={setValues} {...shared} />;

    return (
        <>
            <div className="adm-top">
                <div>
                    <h2>Settings</h2>
                    <p>{isSuper ? "Your account and the whole site." : "Your account."}</p>
                </div>
            </div>

            <div className="set-wrap">
                <nav className="adm-card set-tabs">
                    {tabs.map((t) => (
                        <button key={t.id} type="button" className={t.id === tab.id ? "on" : ""} onClick={() => setTabId(t.id)}>
                            {t.label}
                        </button>
                    ))}
                </nav>
                <div className="set-body">{body}</div>
            </div>

            <Toast toast={toast} />
        </>
    );
}

export default Settings;