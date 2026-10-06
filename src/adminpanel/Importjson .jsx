import { useState } from "react";
import { apiRequest, getData } from "./api";

// Accepts the whole subjects object, one subject block, or a pasted JS file
function parseInput(text) {
    let raw = text.trim().replace(/^export\s+const\s+\w+\s*=\s*/, "").replace(/[;,\s]+$/, "");
    if (raw && raw[0] !== "{" && raw[0] !== "[") raw = "{" + raw + "}";
    raw = raw.replace(/,(\s*[}\]])/g, "$1");
    return JSON.parse(raw);
}

function ImportJson({ token, onUnauthorized }) {
    const [text, setText] = useState("");
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null);

    const run = async () => {
        setMsg(null);
        let data;
        try {
            data = parseInput(text);
        } catch (err) {
            setMsg({ type: "bad", text: "Invalid JSON: " + err.message });
            return;
        }
        // a single subject object -> send as a list
        const subjects = data && data.exams ? [data] : data;

        setBusy(true);
        try {
            const body = await apiRequest("/import", { method: "POST", token, body: { subjects } });
            const c = getData(body) || {};
            setMsg({
                type: "ok",
                text:
                    "Imported " + (c.subjects || 0) + " new subject(s), " + (c.exams || 0) + " exam(s), " +
                    (c.questions || 0) + " question(s)." +
                    (c.skipped_exams ? " Skipped " + c.skipped_exams + " exam(s) that already exist." : ""),
            });
            setText("");
        } catch (err) {
            if (err.status === 401) onUnauthorized();
            else setMsg({ type: "bad", text: err.message });
        }
        setBusy(false);
    };

    const onFile = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => setText(String(r.result));
        r.readAsText(f);
        e.target.value = "";
    };

    return (
        <>
            <div className="adm-top">
                <div>
                    <h2>Import JSON</h2>
                    <p>Add subjects, exams and questions in one go. Existing subjects are reused and existing exams are skipped.</p>
                </div>
            </div>

            <div className="adm-card">
                {msg && <div className={"adm-note " + msg.type}>{msg.text}</div>}
                <textarea
                    className="field adm-code"
                    rows={14}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={'{\n  "ict": {\n    "name": "ICT", "icon": "💻", "color": "#11998e",\n    "exams": [\n      { "name": "Exam 1", "time": 120,\n        "questions": [\n          { "question": "RAM is a type of?", "options": ["Memory", "Storage", "Processor", "Display"], "answer": "Memory" }\n        ] }\n    ]\n  }\n}'}
                />
                <p className="adm-muted" style={{ fontSize: 13 }}>
                    <code>time</code> is in seconds. <code>answer</code> must match one option exactly.
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button type="button" className="btn" disabled={busy || !text.trim()} onClick={run}>{busy ? "Importing..." : "Import"}</button>
                    <label className="btn ghost" style={{ cursor: "pointer" }}>
                        Choose .json file
                        <input type="file" accept=".json,.txt" onChange={onFile} style={{ display: "none" }} />
                    </label>
                </div>
            </div>
        </>
    );
}

export default ImportJson;