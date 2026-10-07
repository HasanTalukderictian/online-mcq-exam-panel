import { useState, useEffect, useRef } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import StartScreen from "./components/StartScreen";
import QuizScreen from "./components/QuizScreen";
import ResultScreen from "./components/ResultScreen";
import StudentPanel from "./components/StudentPanel";
import Login from "./components/Common/Login";
import Register from "./components/Common/Register";
import AdminPanel from "./adminpanel/AdminPanel";

import { apiRequest, getData } from "./adminpanel/api";
import { getAuth, clearAuth, logoutRequest, updateStoredUser } from "./components/Auth/Auth";
import { isAdminUser } from "./components/Auth/roles";
import "./css/exam.css";

const SCREEN_KEY = "app_screen_v1";
const ADMIN_PAGE_KEY = "admin_page_v1"; // same key as in AdminPanel.jsx

// Which page to show when the app starts (also after a refresh)
const initialScreen = () => {
    const a = getAuth();
    let saved = "";
    try {
        saved = sessionStorage.getItem(SCREEN_KEY) || "";
    } catch {}

    // first time in this tab: an admin opens the dashboard, everybody else the home page
    if (!saved) return a && isAdminUser(a.user) ? "admin" : "start";

    // an exam in progress cannot be resumed after a refresh
    if (saved === "quiz") return "start";
    // result pages need data that is gone after a refresh: go to the history instead
    if (saved === "result" || saved === "detail") return a ? "panel" : "start";
    if (saved === "admin" && !(a && isAdminUser(a.user))) return "start";
    if ((saved === "login" || saved === "register") && a) return "start";

    return ["start", "login", "register", "panel", "admin"].includes(saved) ? saved : "start";
};

const DEFAULT_SITE = {
    site_name: "Online Exam Portal",
    site_tagline: "",
    hero_title: "ONLINE MCQ TEST",
    hero_text:
        "Boost your exam preparation with dynamic MCQ tests across multiple subjects. Evaluate your skills with a live timer, question palette and instant results.",
    footer_text: "",
    contact_email: "",
    contact_phone: "",
    registration_open: true,
    maintenance_mode: false,
    maintenance_message: "",
};

// API attempt -> props for ResultScreen
const toResult = (a) => {
    const items = a.items || [];
    return {
        questions: items.map((i) => ({
            question: i.q,
            // when answers are hidden, a right answer is the student's own answer
            answer: i.ans !== null && i.ans !== undefined ? i.ans : i.ok ? i.sel : null,
        })),
        answers: Object.fromEntries(items.map((i, idx) => [idx, i.sel]).filter((p) => p[1])),
        timeUp: !!a.time_up,
        taken: a.time_taken,
        passMark: a.pass_mark || 60,
        serverPercent: a.percent,
        serverPassed: a.passed,
        score: a.score,
        penalty: a.penalty || 0,
        showAnswers: a.show_answers !== false,
        subjectName: a.subject + " - " + a.exam,
    };
};

function App() {
    const [auth, setAuth] = useState(getAuth); // { user, token } or null
    const [screen, setScreen] = useState(initialScreen);
    const [leaveAsk, setLeaveAsk] = useState(false);
    const [pending, setPending] = useState("start");
    const [pendingExam, setPendingExam] = useState(null); // exam a guest wanted to start
    const [theme, setTheme] = useState(() => {
        try {
            return (
                localStorage.getItem("theme") ||
                (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
            );
        } catch {
            return "light";
        }
    });

    // site settings (public API)
    const [site, setSite] = useState(DEFAULT_SITE);

    // landing page data (public API)
    const [catalog, setCatalog] = useState({ loading: true, error: "", subjects: [], stats: null });

    // exam in progress / results
    const [session, setSession] = useState(null);
    const [starting, setStarting] = useState(false);
    const [startError, setStartError] = useState("");
    const [result, setResult] = useState(null);
    const [record, setRecord] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [pendingSubmit, setPendingSubmit] = useState(null);
    const submittingRef = useRef(false);

    const token = auth ? auth.token : null;

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        try { localStorage.setItem("theme", theme); } catch {}
    }, [theme]);

    // remember the current page, so a refresh keeps you here
    useEffect(() => {
        try { sessionStorage.setItem(SCREEN_KEY, screen); } catch {}
    }, [screen]);

    // an exam cannot be resumed, so warn before the page is refreshed or closed
    useEffect(() => {
        if (screen !== "quiz") return undefined;
        const warn = (e) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [screen]);

    useEffect(() => {
        apiRequest("/public/settings")
            .then((b) => setSite({ ...DEFAULT_SITE, ...(getData(b) || {}) }))
            .catch(() => {});
    }, []);

    useEffect(() => {
        document.title = site.site_name;
    }, [site.site_name]);

    const loadCatalog = async () => {
        setCatalog((c) => ({ ...c, loading: true, error: "" }));
        try {
            const body = await apiRequest("/public/subjects", { token });
            const d = getData(body) || {};
            setCatalog({ loading: false, error: "", subjects: d.subjects || [], stats: d.stats || null });
        } catch (err) {
            setCatalog({ loading: false, error: err.message, subjects: [], stats: null });
        }
    };

    // load on start, and again after login/logout (to get the "completed" flags)
    useEffect(() => {
        loadCatalog();
    }, [token]);

    const forgetAdminPage = () => {
        try { sessionStorage.removeItem(ADMIN_PAGE_KEY); } catch {}
    };

    const forceLogout = () => {
        clearAuth();
        forgetAdminPage();
        setAuth(null);
        setScreen("login");
    };

    const updateUser = (user) => {
        updateStoredUser(user);
        setAuth((a) => (a ? { ...a, user } : a));
    };

    /* ---------- start an exam ---------- */
    const startExam = async (examId, tok) => {
        setStarting(true);
        setStartError("");
        try {
            const body = await apiRequest("/student/exams/" + examId, { token: tok });
            const e = getData(body);
            setSession({ id: e.id, name: e.name, subject: e.subject, time: e.time, questions: e.questions });
            setScreen("quiz");
            window.scrollTo({ top: 0 });
        } catch (err) {
            if (err.status === 401) forceLogout();
            else {
                setStartError(err.message);
                if (err.status === 409) loadCatalog();
            }
        }
        setStarting(false);
    };

    // Start button: guests must sign up first (we remember which exam they wanted)
    const handleStart = (examId) => {
        if (!auth) {
            setPendingExam(examId);
            setScreen(site.registration_open ? "register" : "login");
            window.scrollTo({ top: 0 });
            return;
        }
        startExam(examId, auth.token);
    };

    // after sign up OR login
    const handleLogin = (user, tok) => {
        setAuth({ user, token: tok });
        window.scrollTo({ top: 0 });

        if (isAdminUser(user)) {
            setPendingExam(null);
            forgetAdminPage(); // a fresh login starts on the dashboard
            setScreen("admin");
            return;
        }
        setScreen("start");
        if (pendingExam) {
            const id = pendingExam;
            setPendingExam(null);
            startExam(id, tok); // go straight into the exam they chose
        }
    };

    /* ---------- finish an exam (server checks the answers) ---------- */
    const sendSubmit = async (data) => {
        if (submittingRef.current) return;
        submittingRef.current = true;
        setSubmitting(true);
        setSubmitError("");
        try {
            const body = await apiRequest("/student/exams/" + data.examId + "/submit", {
                method: "POST",
                token,
                body: data.body,
            });
            setResult(toResult(getData(body)));
            setPendingSubmit(null);
            setSession(null);
            setScreen("result");
            window.scrollTo({ top: 0 });
            loadCatalog();
        } catch (err) {
            if (err.status === 401) forceLogout();
            else if (err.status === 409) {
                setPendingSubmit(null);
                setSubmitError(err.message);
            } else setSubmitError(err.message);
        }
        submittingRef.current = false;
        setSubmitting(false);
    };

    const handleFinish = (answers, timeUp, taken) => {
        const payload = {};
        session.questions.forEach((q, i) => {
            if (answers[i]) payload[q.id] = answers[i];
        });
        const data = { examId: session.id, body: { answers: payload, time_taken: taken, time_up: timeUp } };
        setPendingSubmit(data);
        sendSubmit(data);
    };

    /* ---------- navigation ---------- */
    const navigate = (target) => {
        if (target === "admin" && !(auth && isAdminUser(auth.user))) target = "start";
        if (target !== "login" && target !== "register") setPendingExam(null);

        if (target === "exam") {
            setScreen("start");
            setTimeout(() => {
                const el = document.getElementById("exam-section");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 80);
        } else {
            setScreen(target);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };
    const go = (target) => {
        if (screen === "quiz") {
            setPending(target);
            setLeaveAsk(true);
        } else {
            navigate(target);
        }
    };
    const confirmLeave = () => {
        setLeaveAsk(false);
        setSession(null);
        navigate(pending);
    };

    const logout = () => {
        if (auth) logoutRequest(auth.token);
        clearAuth();
        forgetAdminPage();
        setAuth(null);
        setSession(null);
        setPendingExam(null);
        setScreen("start");
        window.scrollTo({ top: 0 });
    };

    // open one past result (Student Panel -> View)
    const openRecord = async (id) => {
        try {
            const body = await apiRequest("/student/attempts/" + id, { token });
            setRecord(toResult(getData(body)));
            setScreen("detail");
            window.scrollTo({ top: 0 });
        } catch (err) {
            if (err.status === 401) forceLogout();
            else window.alert(err.message);
        }
    };

    /* ---------- Admin dashboard (own header, sidebar, footer) ---------- */
    if (screen === "admin" && auth && isAdminUser(auth.user)) {
        return (
            <AdminPanel
                user={auth.user}
                token={auth.token}
                theme={theme}
                onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
                onLogout={logout}
                onExit={() => setScreen("start")}
                onUserUpdate={updateUser}
            />
        );
    }

    const userName = auth ? auth.user.name : "";

    return (
        <div className="site">
            <Header
                screen={screen}
                onNav={go}
                user={auth && auth.user}
                onLogout={logout}
                theme={theme}
                onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
                site={site}
            />
            <main className="wrap">
                {screen === "start" && (
                    <StartScreen
                        catalog={catalog}
                        user={auth && auth.user}
                        site={site}
                        onStart={handleStart}
                        starting={starting}
                        startError={startError}
                        onLogin={() => go("login")}
                        onRetry={loadCatalog}
                    />
                )}
                {screen === "login" && (
                    <Login
                        onSuccess={handleLogin}
                        onSwitch={site.registration_open ? () => go("register") : undefined}
                        reason={!!pendingExam}
                    />
                )}
                {screen === "register" && site.registration_open && (
                    <Register onSuccess={handleLogin} onSwitch={() => go("login")} reason={!!pendingExam} />
                )}
                {screen === "register" && !site.registration_open && (
                    <div className="panel loading-box">
                        <h2>Sign up is closed</h2>
                        <p>New accounts are not being accepted right now.</p>
                        <button className="btn" onClick={() => go("login")}>Go to sign in</button>
                    </div>
                )}
                {screen === "quiz" && session && (
                    <QuizScreen
                        questions={session.questions}
                        subjectName={session.subject + " - " + session.name}
                        candidate={userName}
                        timeLimit={session.time}
                        onFinish={handleFinish}
                    />
                )}
                {screen === "result" && result && (
                    <ResultScreen {...result} candidate={userName} onRestart={() => go("start")} />
                )}
                {screen === "panel" && (
                    <StudentPanel
                        user={auth && auth.user}
                        token={token}
                        onOpen={openRecord}
                        onStart={() => go("start")}
                        onLogin={() => go("login")}
                        onUnauthorized={forceLogout}
                    />
                )}
                {screen === "detail" && record && (
                    <ResultScreen
                        {...record}
                        candidate={userName}
                        onRestart={() => setScreen("panel")}
                        restartLabel="Back to Student Panel"
                    />
                )}
            </main>
            <Footer site={site} />

            {leaveAsk && (
                <div className="overlay">
                    <div className="modal" role="dialog" aria-modal="true">
                        <h3>Leave the exam?</h3>
                        <p>Your exam is still running. If you leave now, your answers will be lost and the exam will end.</p>
                        <div className="row">
                            <button className="btn ghost" onClick={() => setLeaveAsk(false)}>Stay in exam</button>
                            <button className="btn bad" onClick={confirmLeave}>Leave exam</button>
                        </div>
                    </div>
                </div>
            )}

            {submitting && (
                <div className="overlay">
                    <div className="modal" role="status">
                        <h3>Submitting...</h3>
                        <p>Please wait while your answers are checked.</p>
                    </div>
                </div>
            )}

            {submitError && !submitting && (
                <div className="overlay">
                    <div className="modal" role="alertdialog" aria-modal="true">
                        <h3>Could not submit</h3>
                        <p>{submitError}</p>
                        <div className="row">
                            <button
                                className="btn ghost"
                                onClick={() => {
                                    setSubmitError("");
                                    setPendingSubmit(null);
                                    setSession(null);
                                    setScreen("start");
                                }}
                            >
                                Go home
                            </button>
                            {pendingSubmit && (
                                <button className="btn" onClick={() => sendSubmit(pendingSubmit)}>Try again</button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;