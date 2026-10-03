import { useState } from "react";
import { getRecords, deleteRecord, clearRecords } from "../utils/storage";

const fmtT = (s) => `${Math.floor(s / 60)}m ${s % 60}s`;
const fmtD = (iso) => {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    ", " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
};

function StudentPanel({ currentName, onOpen, onStart }) {
  const [records, setRecords] = useState(getRecords);
  const names = [...new Set(records.map((r) => r.candidate))];
  const subjectNames = [...new Set(records.map((r) => r.subjectName))];
  const [student, setStudent] = useState(names.includes(currentName) ? currentName : "all");
  const [subject, setSubject] = useState("all");

  const list = records.filter(
    (r) => (student === "all" || r.candidate === student) && (subject === "all" || r.subjectName === subject)
  );
  const n = list.length;
  const avg = n ? Math.round(list.reduce((a, r) => a + r.percent, 0) / n) : 0;
  const best = n ? Math.max(...list.map((r) => r.percent)) : 0;
  const passRate = n ? Math.round((list.filter((r) => r.passed).length / n) * 100) : 0;

  const bySubject = Object.values(
    list.reduce((m, r) => {
      const x = m[r.subjectName] || (m[r.subjectName] = { name: r.subjectName, icon: r.icon, color: r.color, n: 0, sum: 0 });
      x.n++; x.sum += r.percent;
      return m;
    }, {})
  );

  const remove = (id) => {
    if (!window.confirm("Delete this record?")) return;
    deleteRecord(id);
    setRecords(getRecords());
  };
  const clearAll = () => {
    if (!window.confirm("Delete ALL records saved on this device? This cannot be undone.")) return;
    clearRecords();
    setRecords([]);
  };

  if (!records.length) {
    return (
      <div className="sp">
        <div className="panel sp-empty">
          <div style={{ fontSize: 48 }}>📊</div>
          <h2>No exam records yet</h2>
          <p className="sub">Your results will appear here after you finish an exam.</p>
          <button className="btn" onClick={onStart}>Start an exam</button>
        </div>
      </div>
    );
  }

  return (
    <div className="sp">
      <div className="sp-head">
        <div>
          <h1>Student Panel</h1>
          <p className="sub" style={{ margin: 0 }}>All your exam records and performance.</p>
        </div>
        <div className="sp-filters">
          <select className="field" value={student} onChange={(e) => setStudent(e.target.value)} aria-label="Student">
            <option value="all">All students</option>
            {names.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
          <select className="field" value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject">
            <option value="all">All subjects</option>
            {subjectNames.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
      </div>

      <div className="stats panel">
        <div><b>{n}</b><small>Exams taken</small></div>
        <div><b>{avg}%</b><small>Average score</small></div>
        <div><b style={{ color: "var(--ok)" }}>{best}%</b><small>Best score</small></div>
        <div><b>{passRate}%</b><small>Pass rate</small></div>
      </div>

      {bySubject.length > 0 && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 14px" }}>Subject-wise performance</h3>
          {bySubject.map((s) => {
            const p = Math.round(s.sum / s.n);
            return (
              <div className="perf" key={s.name}>
                <span className="perf-name">{s.icon} {s.name} <small>({s.n})</small></span>
                <div className="perf-bar"><div style={{ width: `${p}%`, background: s.color }} /></div>
                <b>{p}%</b>
              </div>
            );
          })}
        </div>
      )}

      <div className="panel">
        <div className="sp-head" style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Exam history ({n})</h3>
          <button className="btn ghost" onClick={clearAll}>Clear all records</button>
        </div>
        {n === 0 && <p className="sub">No records match this filter.</p>}
        {list.map((r) => (
          <div className="rec" key={r.id}>
            <div className="rec-main">
              <b>{r.icon} {r.subjectName} · {r.examName}</b>
              <small>{r.candidate} · {fmtD(r.date)} · {fmtT(r.taken)}</small>
            </div>
            <div className="rec-score">
              <b>{r.correct}/{r.total}</b>
              <span className={`badge ${r.passed ? "pass" : "fail"}`}>{r.percent}% · {r.passed ? "Passed" : "Failed"}</span>
            </div>
            <div className="rec-act">
              <button className="btn" onClick={() => onOpen(r)}>View</button>
              <button className="btn ghost" onClick={() => remove(r.id)} aria-label="Delete record">🗑</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StudentPanel;