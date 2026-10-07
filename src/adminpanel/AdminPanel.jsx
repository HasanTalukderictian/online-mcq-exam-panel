import { useState } from "react";
import Dashboard from "./Dashboard";
import Subjects from "./Subjects";
import Exams from "./Exams";
import Questions from "./Questions";
import ImportData from "./ImportData";
import Users from "./Users";
import Students from "./Students";
import Results from "./Results";
import Settings from "./Settings";
import "./css/admin.css";
import "./css/admin-extra.css";

const MENU = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "subjects", icon: "📚", label: "Subjects" },
    { id: "exams", icon: "📝", label: "Exams" },
    { id: "questions", icon: "❓", label: "Questions" },
    { id: "import", icon: "⬆️", label: "Import data" },
    { id: "users", icon: "👤", label: "Users" },
    { id: "students", icon: "👥", label: "Students" },
    { id: "results", icon: "🏆", label: "Results" },
    { id: "settings", icon: "⚙️", label: "Settings" },
];

function ComingSoon({ title }) {
    return (
        <div className="adm-card adm-soon">
            <div style={{ fontSize: 44 }}>🚧</div>
            <h2>{title}</h2>
            <p>This page will be added next.</p>
        </div>
    );
}

function AdminPanel({ user, token, theme, onToggleTheme, onLogout, onExit, onUserUpdate }) {
    const [page, setPage] = useState("dashboard");
    const [params, setParams] = useState({});
    const [open, setOpen] = useState(false);

    const u = user || {};
    const dark = theme === "dark";
    const current = MENU.find((m) => m.id === page) || MENU[0];
    const initial = (u.name ? u.name : "A").charAt(0).toUpperCase();

    // go to a page, optionally with a filter (e.g. go("exams", { subject_id: 3 }))
    const choose = (id, p) => {
        setPage(id);
        setParams(p || {});
        setOpen(false);
        window.scrollTo({ top: 0 });
    };

    const common = { token: token, onUnauthorized: onLogout, go: choose };

    let content;
    if (page === "dashboard") content = <Dashboard user={u} {...common} />;
    else if (page === "subjects") content = <Subjects {...common} />;
    else if (page === "exams") content = <Exams key={"e" + (params.subject_id || "all")} subjectId={params.subject_id} {...common} />;
    else if (page === "questions") content = <Questions key={"q" + (params.exam_id || "all")} examId={params.exam_id} {...common} />;
    else if (page === "import") content = <ImportData {...common} />;
    else if (page === "users") content = <Users token={token} me={u} onUnauthorized={onLogout} />;
    else if (page === "students") content = <Students token={token} onUnauthorized={onLogout} />;
    else if (page === "results") content = <Results token={token} onUnauthorized={onLogout} />;
    else if (page === "settings") content = <Settings token={token} user={u} onUnauthorized={onLogout} onUserUpdate={onUserUpdate} />;
    else content = <ComingSoon title={current.label} />;

    return (
        <div className="adm-shell">
            {/* Sidebar */}
            <aside className={"adm-side " + (open ? "open" : "")}>
                <div className="adm-brand"><i>✓</i> Exam Admin</div>

                <nav className="adm-menu">
                    {MENU.map((m) => (
                        <button key={m.id} type="button" className={page === m.id ? "on" : ""} onClick={() => choose(m.id)}>
                            <span>{m.icon}</span> {m.label}
                        </button>
                    ))}
                </nav>

                <div className="adm-side-foot">
                    <div className="adm-avatar">{initial}</div>
                    <div>
                        <b>{u.name}</b>
                        <small>{u.role}</small>
                    </div>
                </div>
            </aside>
            {open && <div className="adm-backdrop" onClick={() => setOpen(false)} />}

            <div className="adm-body">
                {/* Header */}
                <header className="adm-head">
                    <button type="button" className="adm-burger" onClick={() => setOpen(true)} aria-label="Open menu">☰</button>
                    <h1>{current.icon} {current.label}</h1>

                    <div className="adm-head-right">
                        <button
                            type="button"
                            className="theme-btn"
                            onClick={onToggleTheme}
                            aria-label={dark ? "Switch to day mode" : "Switch to night mode"}
                        >
                            <span>{dark ? "☀️" : "🌙"}</span>
                            <b>{dark ? "Day" : "Night"}</b>
                        </button>
                        <button type="button" className="nav-btn" onClick={onExit}>🌐 <b>View site</b></button>
                        <button type="button" className="nav-btn" onClick={onLogout}>Logout</button>
                    </div>
                </header>

                {/* Page content */}
                <main className="adm-main">{content}</main>

                {/* Footer */}
                <footer className="adm-foot">
                    <span>© {new Date().getFullYear()} Online Exam Portal. All rights reserved.</span>
                    <span>
                        Developed by{" "}
                        <a className="dev-link" href="https://hasan-portfilo.netlify.app/" target="_blank" rel="noopener noreferrer">
                            Hasan Talukder
                        </a>
                    </span>
                </footer>
            </div>
        </div>
    );
}

export default AdminPanel;