import { useState } from "react";
import { loginRequest, saveAuth } from "../Auth/Auth";

const Icon = ({ d }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {d}
    </svg>
);
const mail = <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>;
const lock = <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>;
const eye = <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>;
const eyeOff = <><path d="M3 3l18 18" /><path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.6 6.7A16.6 16.6 0 0 0 2 12s3.5 6 10 6a9.7 9.7 0 0 0 4.3-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>;

function Login({ onSuccess, onSwitch, reason }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [show, setShow] = useState(false);
    const [remember, setRemember] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e) => {
        e.preventDefault();
        if (!email.trim() || !password) return setError("Please enter your email and password.");
        setLoading(true);
        setError("");
        try {
            const data = await loginRequest(email.trim(), password);
            saveAuth(data, remember);
            onSuccess(data.user, data.token);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="auth">
            <aside className="auth-side">
                <div className="auth-logo"><i>✓</i> Online Exam Portal</div>
                <h2>Welcome back 👋</h2>
                <p>Sign in to take timed MCQ exams, track your results and keep improving.</p>
                <ul>
                    <li>Timed exams with instant results</li>
                    <li>Your history and progress in one place</li>
                    <li>Download your result as a PDF</li>
                </ul>
                <span className="auth-orb o1" /><span className="auth-orb o2" />
            </aside>

            <form className="auth-form" onSubmit={submit} noValidate>
                <h1>Sign in</h1>
                <p className="sub">Enter your account details to continue.</p>

                {reason && <div className="auth-note">📝 Please sign in to take your exam.</div>}
                {error && <div className="auth-error" role="alert">⚠️ {error}</div>}

                <label className="label" htmlFor="email">Email</label>
                <div className="auth-input">
                    <Icon d={mail} />
                    <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(""); }}
                        autoFocus
                    />
                </div>

                <label className="label" htmlFor="password">Password</label>
                <div className="auth-input">
                    <Icon d={lock} />
                    <input
                        id="password"
                        type={show ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Your password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    />
                    <button type="button" className="auth-eye" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
                        <Icon d={show ? eyeOff : eye} />
                    </button>
                </div>

                <label className="auth-remember">
                    <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Keep me signed in
                </label>

                <button className="btn full" disabled={loading}>
                    {loading ? <><span className="spin" /> Signing in...</> : "Sign in"}
                </button>

                {onSwitch && (
                    <p className="auth-switch">
                        New here?{" "}
                        <button type="button" className="link-btn" onClick={onSwitch}>Create an account</button>
                    </p>
                )}
            </form>
        </div>
    );
}

export default Login;