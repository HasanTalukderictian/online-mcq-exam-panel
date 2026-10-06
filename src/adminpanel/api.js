import { API_URL } from "../components/Auth/Auth";

export class ApiError extends Error {
    constructor(message, status, errors) {
        super(message);
        this.status = status;
        this.errors = errors || {};
    }
}

// Calls the Laravel API with the Bearer token. Returns the parsed JSON body.
export async function apiRequest(path, options = {}) {
    const method = options.method || "GET";
    const headers = { Accept: "application/json" };
    if (options.body) headers["Content-Type"] = "application/json";
    if (options.token) headers.Authorization = "Bearer " + options.token;

    let res;
    try {
        res = await fetch(API_URL + path, {
            method,
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
        });
    } catch {
        throw new ApiError("Cannot reach the server. Make sure the API is running.", 0);
    }

    let data = {};
    try {
        data = await res.json();
    } catch {}

    if (!res.ok) {
        throw new ApiError(data.message || "Request failed (" + res.status + ").", res.status, data.errors);
    }
    return data;
}

// { success, message, data } -> data
export const getData = (body) => (body && body.data !== undefined ? body.data : body);

// list can be [..] or { data: [..] }
export const pickList = (body) => {
    const d = getData(body);
    if (Array.isArray(d)) return d;
    if (d && Array.isArray(d.data)) return d.data;
    return [];
};

// Laravel 422 errors -> { field: "first message" }
export const fieldErrors = (err) => {
    const out = {};
    const e = (err && err.errors) || {};
    Object.keys(e).forEach((k) => {
        const v = e[k];
        out[k] = Array.isArray(v) ? v[0] : String(v);
    });
    return out;
};