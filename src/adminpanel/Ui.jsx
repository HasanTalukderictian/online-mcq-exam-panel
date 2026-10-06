import { useRef, useState } from "react";

// Small toast message (bottom right)
export function useToast() {
    const [toast, setToast] = useState(null);
    const timer = useRef(null);
    const say = (type, text) => {
        setToast({ type, text });
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setToast(null), 4000);
    };
    return [toast, say];
}

export function Toast({ toast }) {
    return toast ? <div className={"adm-toast " + toast.type}>{toast.text}</div> : null;
}

export const fmtTime = (t) => {
    const m = Math.floor(t / 60);
    const s = t % 60;
    if (m && s) return m + "m " + s + "s";
    if (m) return m + " min";
    return s + "s";
};