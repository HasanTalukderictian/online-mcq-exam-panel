import { useEffect, useState } from "react";
import { apiRequest } from "./api";

const ROLES = ["user", "admin", "superadmin"];
const blank = { id: null, name: "", email: "", password: "", password_confirmation: "", role: "user", active: true };

// The list can come as [..], {data:[..]}, {data:{data:[..]}} or {users:[..]}
const pickList = (b) => {
    if (Array.isArray(b)) return b;
    if (!b) return [];
    const tries = [b.data, b.users, b.data && b.data.data, b.data && b.data.users];
    for (let i = 0; i < tries.length; i++) {
        if (Array.isArray(tries[i])) return tries[i];
    }
    return [];
};

const isActive = (u) => (u.active !== undefined ? !!u.active : u.is_active !== false);
const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";

function Users({ token, me, onUnauthorized }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState("");
    const [q, setQ] = useState("");
    const [role, setRole] = useState("all");
    const [form, setForm] = useState(null);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);
    const [showPw, setShowPw] = useState(false);
    const [toast, setToast] = useState(null);

    const say = (type, text) => {
        setToast({ type, text });
        setTimeout(() => setToast(null), 4000);
    };
    // true when the token is no longer valid
    const expired = (err) => {
        if (err.status === 401) {
            onUnauthorized();
            return true;
        }
        return false;
    };

    const load = async () => {
        setLoading(true);
        setListError("");
        try {
            const body = await apiRequest("/users", { token });
            setUsers(pickList(body));
        } catch (err) {
            if (!expired(err)) setListError(err.message);
        }
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    const openCreate = () => {
        setForm({ ...blank });
        setErrors({});
        setFormError("");
        setShowPw(false);
    };
    const openEdit = (u) => {
        setForm({ id: u.id, name: u.name || "", email: u.email || "", password: "", password_confirmation: "", role: u.role || "user", active: isActive(u) });
        setErrors({});
        setFormError("");
        setShowPw(false);
    };

    const submit = async (e) => {
        e.preventDefault();
        const creating = !form.id;
        const er = {};
        if (!form.name.trim()) er.name = "Enter the name.";
        if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) er.email = "Enter a valid email.";
        if (creating && !form.password) er.password = "Enter a password.";
        if (form.password && form.password.length < 6) er.password = "Use at least 6 characters.";
        if (form.password !== form.password_confirmation) er.password_confirmation = "Passwords do not match.";
        setErrors(er);
        if (Object.keys(er).length) return;

        const body = { name: form.name.trim(), email: form.email.trim(), role: form.role, active: form.active };
        if (form.password) {
            body.password = form.password;
            body.password_confirmation = form.password_confirmation;
        }

        setSaving(true);
        setFormError("");
        try {
            if (creating) await apiRequest("/users", { method: "POST", token, body });
            else await apiRequest("/users/" + form.id, { method: "PUT", token, body });
            setForm(null);
            say("ok", creating ? "User created." : "User updated.");
            load();
        } catch (err) {
            if (expired(err)) return;
            const fe = {};
            Object.keys(err.errors || {}).forEach((k) => {
                const v = err.errors[k];
                fe[k] = Array.isArray(v) ? v[0] : String(v);
            });
            setErrors(fe);
            setFormError(Object.keys(fe).length ? "Please fix the highlighted fields." : err.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (u) => {
        try {
            await apiRequest("/users/" + u.id, {
                method: "PUT",
                token,
                body: { name: u.name, email: u.email, role: u.role, active: !isActive(u) },
            });
            say("ok", isActive(u) ? "User deactivated." : "User activated.");
            load();
        } catch (err) {
            if (!expired(err)) say("bad", err.message);
        }
    };

    const remove = async (u) => {
        if (!window.confirm('Delete "' + u.name + '"? This cannot be undone.')) return;
        try {
            await apiRequest("/users/" + u.id, { method: "DELETE", token });
            say("ok", "User deleted.");
            load();
        } catch (err) {
            if (!expired(err)) say("bad", err.message);
        }
    };

    const list = users.filter(
        (u) =>
            (role === "all" || u.role === role) &&
            (!q.trim() || ((u.name || "") + " " + (u.email || "")).toLowerCase().includes(q.trim().toLowerCase()))
    );

    const cards = [
        { label: "Total users", value: users.length, icon: "👥", c: "#7c3aed" },
        { label: "Admins", value: users.filter((u) => u.role !== "user").length, icon: "🛡️", c: "#0ea5e9" },
        { label: "Active", value: users.filter(isActive).length, icon: "✅", c: "#14b8a6" },
        { label: "Inactive", value: users.filter((u) => !isActive(u)).length, icon: "⛔", c: "#ec4899" },
    ];

    return (
        <>
            <div className="adm-top">
                <div>
                    <h2>Users</h2>
                    <p>Create and manage user accounts and roles.</p>
                </div>
                <button type="button" className="btn" onClick={openCreate}>+ New user</button>
            </div>

            <div className="adm-cards">
                {cards.map((c) => (
                    <div className="adm-stat" key={c.label} style={{ "--c": c.c }}>
                        <div className="adm-stat-ico">{c.icon}</div>
                        <div><b>{c.value}</b><small>{c.label}</small></div>
                    </div>
                ))}
            </div>

            {listError && (
                <div className="adm-note bad">
                    Could not load the user list: {listError}{" "}
                    <button type="button" className="btn ghost sm" onClick={load}>Retry</button>
                </div>
            )}

            <div className="adm-card">
                <div className="adm-tools">
                    <input className="field" placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
                    <select className="field" value={role} onChange={(e) => setRole(e.target.value)}>
                        <option value="all">All roles</option>
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>

                {loading ? (
                    <p className="adm-muted">Loading users...</p>
                ) : (
                    <div className="adm-tbl-wrap">
                        <table className="adm-tbl">
                            <thead>
                                <tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th /></tr>
                            </thead>
                            <tbody>
                                {list.map((u) => {
                                    const isMe = me && u.id === me.id;
                                    return (
                                        <tr key={u.id}>
                                            <td>
                                                <div className="adm-user">
                                                    <div className="adm-avatar">{(u.name || "?").charAt(0).toUpperCase()}</div>
                                                    <div><b>{u.name}</b><small>{u.email}</small></div>
                                                </div>
                                            </td>
                                            <td><span className="badge role">{u.role}</span></td>
                                            <td>
                                                <span className={"badge " + (isActive(u) ? "pass" : "gray")}>
                                                    {isActive(u) ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td>{fmtDate(u.created_at)}</td>
                                            <td>
                                                <div className="adm-acts">
                                                    <button type="button" className="btn sm" onClick={() => openEdit(u)}>Edit</button>
                                                    <button type="button" className="btn ghost sm" disabled={isMe} onClick={() => toggleActive(u)}>
                                                        {isActive(u) ? "Deactivate" : "Activate"}
                                                    </button>
                                                    <button type="button" className="btn bad sm" disabled={isMe} onClick={() => remove(u)}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {!list.length && (
                                    <tr><td colSpan={5} className="adm-muted" style={{ textAlign: "center" }}>No users found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {form && (
                <div className="adm-overlay">
                    <form className="adm-modal" onSubmit={submit} noValidate>
                        <h3>{form.id ? "Edit user" : "New user"}</h3>
                        <p className="sub">{form.id ? "Leave the password blank to keep it unchanged." : "Fill in the account details."}</p>

                        {formError && <div className="adm-note bad">{formError}</div>}

                        <label className="label" htmlFor="u-name">Name</label>
                        <input id="u-name" className={"field" + (errors.name ? " invalid" : "")} value={form.name} autoFocus
                            onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        {errors.name && <div className="f-err">{errors.name}</div>}

                        <label className="label" htmlFor="u-email">Email</label>
                        <input id="u-email" type="email" className={"field" + (errors.email ? " invalid" : "")} value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        {errors.email && <div className="f-err">{errors.email}</div>}

                        <div className="f-row">
                            <div>
                                <label className="label" htmlFor="u-pass">Password</label>
                                <input id="u-pass" type={showPw ? "text" : "password"} autoComplete="new-password"
                                    className={"field" + (errors.password ? " invalid" : "")} value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })} />
                                {errors.password && <div className="f-err">{errors.password}</div>}
                            </div>
                            <div>
                                <label className="label" htmlFor="u-pass2">Confirm password</label>
                                <input id="u-pass2" type={showPw ? "text" : "password"} autoComplete="new-password"
                                    className={"field" + (errors.password_confirmation ? " invalid" : "")} value={form.password_confirmation}
                                    onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} />
                                {errors.password_confirmation && <div className="f-err">{errors.password_confirmation}</div>}
                            </div>
                        </div>
                        <label className="adm-switch" style={{ margin: "10px 0 0" }}>
                            <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} /> Show passwords
                        </label>

                        <label className="label" htmlFor="u-role">Role</label>
                        <select id="u-role" className={"field" + (errors.role ? " invalid" : "")} value={form.role}
                            onChange={(e) => setForm({ ...form, role: e.target.value })}>
                            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                        {errors.role && <div className="f-err">{errors.role}</div>}

                        <label className="adm-switch">
                            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                            Account is active
                        </label>

                        <div style={{ display: "flex", gap: 10 }}>
                            <button type="button" className="btn ghost" style={{ flex: 1 }} onClick={() => setForm(null)}>Cancel</button>
                            <button className="btn" style={{ flex: 1 }} disabled={saving}>
                                {saving ? "Saving..." : form.id ? "Save changes" : "Create user"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {toast && <div className={"adm-toast " + toast.type}>{toast.text}</div>}
        </>
    );
}

export default Users;