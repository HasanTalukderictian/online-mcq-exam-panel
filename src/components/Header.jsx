import { isAdminUser } from "./Auth/roles";

const labels = {
    start: "Home",
    quiz: "Exam in progress",
    result: "Result",
    panel: "Student Panel",
    detail: "Record details",
    login: "Sign in",
    register: "Sign up",
};

function Header({ screen, theme, onToggleTheme, onNav, user, onLogout, site }) {
    const dark = theme === "dark";
    const inPanel = screen === "panel" || screen === "detail";
    return (
        <header className="site-header">
            <div className="site-header-in">
                <button type="button" className="logo" onClick={() => onNav("start")} title="Go to Home">
                    <i>✓</i> {site.site_name}
                </button>
                <div className="head-right">
                    <span className={"status " + (screen === "quiz" ? "live" : "")}>{labels[screen]}</span>
                    <button type="button" className={"nav-btn " + (screen === "quiz" ? "on" : "")} onClick={() => onNav("exam")}>
                        📝 <b>Exam</b>
                    </button>
                    <button type="button" className={"nav-btn " + (inPanel ? "on" : "")} onClick={() => onNav("panel")}>
                        📊 <b>Student Panel</b>
                    </button>

                    {user ? (
                        <>
                            {isAdminUser(user) && (
                                <button type="button" className="nav-btn" onClick={() => onNav("admin")}>
                                    🛠 <b>Dashboard</b>
                                </button>
                            )}
                            <span className="user-chip" title={user.email}>👤 <b>{user.name}</b></span>
                            <button type="button" className="nav-btn" onClick={onLogout}>Logout</button>
                        </>
                    ) : (
                        <>
                            <button type="button" className={"nav-btn " + (screen === "login" ? "on" : "")} onClick={() => onNav("login")}>
                                🔑 <b>Login</b>
                            </button>
                            {site.registration_open && (
                                <button type="button" className={"nav-btn solid " + (screen === "register" ? "on" : "")} onClick={() => onNav("register")}>
                                    ✍️ <b>Sign up</b>
                                </button>
                            )}
                        </>
                    )}

                    <button
                        type="button"
                        className="theme-btn"
                        onClick={onToggleTheme}
                        aria-label={dark ? "Switch to day mode" : "Switch to night mode"}
                        title={dark ? "Day mode" : "Night mode"}
                    >
                        <span>{dark ? "☀️" : "🌙"}</span>
                        <b>{dark ? "Day" : "Night"}</b>
                    </button>
                </div>
            </div>
        </header>
    );
}

export default Header;