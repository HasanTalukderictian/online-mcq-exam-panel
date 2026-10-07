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



// multipart upload (do not set Content-Type: the browser adds the boundary)
export async function apiUpload(path, formData, token) {
    let res;
    try {
        res = await fetch(API_URL + path, {
            method: "POST",
            headers: { Accept: "application/json", Authorization: "Bearer " + token },
            body: formData,
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

// download a file that needs the Bearer token
export async function apiDownload(path, token, filename) {
    let res;
    try {
        res = await fetch(API_URL + path, { headers: { Authorization: "Bearer " + token } });
    } catch {
        throw new ApiError("Cannot reach the server. Make sure the API is running.", 0);
    }
    if (!res.ok) throw new ApiError("Download failed (" + res.status + ").", res.status);

    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
}