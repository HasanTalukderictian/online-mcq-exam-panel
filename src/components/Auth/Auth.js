// Talks to the Laravel API: POST /api/login, /api/register, /api/logout
export const API_URL = "http://127.0.0.1:8000/api"; // change this when you deploy

const KEY = "auth_session_v1";

export const getAuth = () => {
    try {
        const raw = localStorage.getItem(KEY) || sessionStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null; // { user, token }
    } catch {
        return null;
    }
};

export const clearAuth = () => {
    try {
        localStorage.removeItem(KEY);
        sessionStorage.removeItem(KEY);
    } catch {}
};

export const saveAuth = ({ user, token }, remember = true) => {
    clearAuth();
    try {
        const store = remember ? localStorage : sessionStorage;
        store.setItem(KEY, JSON.stringify({ user, token }));
    } catch {}
};

// after the user edits their profile: keep the saved copy in sync
export const updateStoredUser = (user) => {
    try {
        [localStorage, sessionStorage].forEach((store) => {
            const raw = store.getItem(KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            store.setItem(KEY, JSON.stringify({...data, user }));
        });
    } catch {}
};

// Shared by login and register. Errors carry `.fields` (Laravel 422 messages per field).
async function postAuth(path, payload, failText) {
    let res;
    try {
        res = await fetch(API_URL + path, {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
    } catch {
        throw new Error("Cannot reach the server. Make sure the API is running.");
    }

    let body = {};
    try {
        body = await res.json();
    } catch {}

    if (!res.ok) {
        const fields = {};
        if (body.errors) {
            Object.keys(body.errors).forEach((k) => {
                const v = body.errors[k];
                fields[k] = Array.isArray(v) ? v[0] : String(v);
            });
        }
        const keys = Object.keys(fields);
        const first = keys.length ? fields[keys[0]] : "";
        const err = new Error(first || body.message || failText + " (" + res.status + ").");
        err.fields = fields;
        throw err;
    }

    // API shape: { success, message, data: { user, token, token_type } }
    const data = body.data || body;

    // sign up is waiting for admin approval: no token yet
    if (data.pending) return { pending: true, message: body.message || "Account created.", user: data.user };

    if (!data.token) throw new Error(body.message || "Unexpected response from the server.");
    return { user: data.user, token: data.token };
}

export const loginRequest = (email, password) => postAuth("/login", { email, password }, "Login failed");

export const registerRequest = (form) => postAuth("/register", form, "Sign up failed");

export async function logoutRequest(token) {
    try {
        await fetch(API_URL + "/logout", {
            method: "POST",
            headers: { Accept: "application/json", Authorization: "Bearer " + token },
        });
    } catch {}
}