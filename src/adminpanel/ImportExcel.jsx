import { useRef, useState } from "react";
import { apiUpload, apiDownload, getData } from "./api";
import { fmtTime } from "./ui";

const MAX_MB = 5;

function ImportExcel({ token, onUnauthorized }) {
    const [file, setFile] = useState(null);
    const [report, setReport] = useState(null);
    const [done, setDone] = useState(null);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState("");
    const [drag, setDrag] = useState(false);
    const inputRef = useRef(null);

    const fail = (err) => {
        if (err.status === 401) {
            onUnauthorized();
            return;
        }
        const fileErr = err.errors && err.errors.file ? err.errors.file[0] : "";
        setError(fileErr || err.message);
    };

    const pick = (f) => {
        if (!f) return;
        if (!/\.(xlsx|xls|csv)$/i.test(f.name)) {
            setError("Please choose an .xlsx, .xls or .csv file.");
            return;
        }
        if (f.size > MAX_MB * 1024 * 1024) {
            setError("The file is too big (max " + MAX_MB + " MB).");
            return;
        }
        setFile(f);
        setReport(null);
        setDone(null);
        setError("");
    };

    const send = async (dry) => {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("dry_run", dry ? "1" : "0");
        const body = await apiUpload("/admin/import/excel", fd, token);
        return getData(body);
    };

    const check = async () => {
        setBusy("check");
        setError("");
        try {
            setReport(await send(true));
        } catch (err) {
            fail(err);
        }
        setBusy("");
    };

    const run = async () => {
        setBusy("import");
        setError("");
        try {
            const r = await send(false);
            setDone(r);
            setReport(null);
            setFile(null);
        } catch (err) {
            fail(err);
        }
        setBusy("");
    };

    const template = async () => {
        try {
            await apiDownload("/admin/import/template", token, "exam-import-template.xlsx");
        } catch (err) {
            fail(err);
        }
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDrag(false);
        pick(e.dataTransfer.files[0]);
    };

    const cards = report
        ? [
              { label: "New subjects", value: report.subjects_new, icon: "📚", c: "#7c3aed" },
              { label: "New exams", value: report.exams_new, icon: "📝", c: "#0ea5e9" },
              { label: "Questions", value: report.questions, icon: "❓", c: "#f59e0b" },
              { label: "Exams skipped", value: report.exams_skipped, icon: "⏭️", c: "#14b8a6" },
          ]
        : [];

    return (
        <>
            <div className="adm-top">
                <div>
                    <h2>Import from Excel</h2>
                    <p>Add subjects, exams and questions from one Excel file.</p>
                </div>
                <button type="button" className="btn ghost" onClick={template}>⬇ Download template</button>
            </div>

            {done && (
                <div className="adm-note ok">
                    ✅ Import finished: {done.subjects_new} new subject(s), {done.exams_new} exam(s) and {done.questions} question(s) added.
                    {done.exams_skipped ? " " + done.exams_skipped + " exam(s) already existed and were skipped." : ""}
                    {done.errors_count ? " " + done.errors_count + " row(s) had problems and were left out." : ""}
                </div>
            )}
            {error && <div className="adm-note bad">{error}</div>}

            <div className="adm-card">
                <label
                    className={"dropzone" + (drag ? " over" : "")}
                    onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                    onDragLeave={() => setDrag(false)}
                    onDrop={onDrop}
                >
                    <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" onChange={(e) => { pick(e.target.files[0]); e.target.value = ""; }} />
                    <div className="dz-ico">📄</div>
                    {file ? (
                        <>
                            <b>{file.name}</b>
                            <small>{(file.size / 1024).toFixed(1)} KB · click to choose another file</small>
                        </>
                    ) : (
                        <>
                            <b>Drop your Excel file here, or click to choose</b>
                            <small>.xlsx, .xls or .csv · max {MAX_MB} MB</small>
                        </>
                    )}
                </label>

                <div className="imp-actions">
                    <button type="button" className="btn" disabled={!file || busy !== ""} onClick={check}>
                        {busy === "check" ? "Checking..." : "1. Check file"}
                    </button>
                    <span className="adm-muted">Nothing is saved until you press Import.</span>
                </div>
            </div>

            {report && (
                <>
                    <div className="adm-cards" style={{ marginTop: 16 }}>
                        {cards.map((c) => (
                            <div className="adm-stat" key={c.label} style={{ "--c": c.c }}>
                                <div className="adm-stat-ico">{c.icon}</div>
                                <div><b>{c.value}</b><small>{c.label}</small></div>
                            </div>
                        ))}
                    </div>

                    <div className="adm-card" style={{ marginBottom: 16 }}>
                        <h3>What will be imported</h3>
                        {report.exams.length === 0 ? (
                            <p className="adm-muted">No valid question found in this file.</p>
                        ) : (
                            <div className="adm-tbl-wrap">
                                <table className="adm-tbl">
                                    <thead>
                                        <tr><th>Subject</th><th>Exam</th><th>Questions</th><th>Duration</th><th>Pass</th><th>Status</th></tr>
                                    </thead>
                                    <tbody>
                                        {report.exams.map((e, i) => (
                                            <tr key={i}>
                                                <td>{e.subject}</td>
                                                <td><b>{e.title}</b></td>
                                                <td>{e.questions}</td>
                                                <td>{fmtTime(e.duration)}</td>
                                                <td>{e.pass_mark}%</td>
                                                <td>
                                                    <span className={"badge " + (e.status === "new" ? "pass" : "gray")}>
                                                        {e.status === "new" ? "New" : "Already exists, skipped"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {report.errors_count > 0 && (
                        <div className="adm-card" style={{ marginBottom: 16 }}>
                            <h3 style={{ color: "var(--bad)" }}>{report.errors_count} row(s) have a problem and will be left out</h3>
                            <ul className="err-list">
                                {report.errors.map((e, i) => (
                                    <li key={i}><b>Row {e.row}:</b> {e.message}</li>
                                ))}
                            </ul>
                            {report.errors_count > report.errors.length && (
                                <p className="adm-muted">... and {report.errors_count - report.errors.length} more.</p>
                            )}
                            <p className="adm-muted">Fix these rows in Excel and upload again, or import the valid rows now.</p>
                        </div>
                    )}

                    <div className="imp-actions">
                        <button type="button" className="btn ok" disabled={report.questions === 0 || busy !== ""} onClick={run}>
                            {busy === "import" ? "Importing..." : "2. Import " + report.questions + " question(s)"}
                        </button>
                        <button type="button" className="btn ghost" disabled={busy !== ""} onClick={() => { setReport(null); setFile(null); }}>
                            Cancel
                        </button>
                    </div>
                </>
            )}
        </>
    );
}

export default ImportExcel;