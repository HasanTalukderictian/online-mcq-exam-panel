// Talks to the Laravel API: POST /api/login, POST /api/logout
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

export async function loginRequest(email, password) {
    let res;
    try {
        res = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
    } catch {
        throw new Error("Cannot reach the server. Make sure the API is running.");
    }

    let body = {};
    try {
        body = await res.json();
    } catch {}

    if (!res.ok) {
        let firstError = "";
        if (body.errors) {
            const list = Object.values(body.errors)[0];
            if (Array.isArray(list) && list.length) firstError = list[0];
        }
        throw new Error(firstError || body.message || `Login failed (${res.status}).`);
    }

    // API shape: { success, message, data: { user, token, token_type } }
    const payload = body.data || body;
    if (!payload.token) throw new Error(body.message || "Unexpected response from the server.");

    return { user: payload.user, token: payload.token };
}

export async function logoutRequest(token) {
    try {
        await fetch(`${API_URL}/logout`, {
            method: "POST",
            headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        });
    } catch {}
}