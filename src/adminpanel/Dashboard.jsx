import { subjects } from "../data/questions";
import { getRecords } from "../utils/storage";

const fmtD = (iso) =>
  new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

function Dashboard({ user, go }) {
  // ---- exam content (from data/questions.js) ----
  const list = Object.values(subjects);
  const exams = list.flatMap((s) => s.exams || []);
  const questionCount = exams.reduce((n, e) => n + (e.questions || []).length, 0);

  // ---- student results (saved in this browser) ----
  const records = getRecords();
  const total = records.length;
  const students = new Set(records.map((r) => r.candidate.trim().toLowerCase())).size;
  const passed = records.filter((r) => r.passed).length;
  const avg = total ? Math.round(records.reduce((a, r) => a + r.percent, 0) / total) : 0;
  const passRate = total ? Math.round((passed / total) * 100) : 0;

  const cards = [
    { label: "Subjects", value: list.length, icon: "📚", c: "#7c3aed" },
    { label: "Exams", value: exams.length, icon: "📝", c: "#0ea5e9" },
    { label: "Questions", value: questionCount, icon: "❓", c: "#f59e0b" },
    { label: "Students", value: students, icon: "👥", c: "#14b8a6" },
    { label: "Results", value: total, icon: "🏆", c: "#ec4899" },
    { label: "Average score", value: `${avg}%`, icon: "🎯", c: "#6366f1" },
  ];

  const bySubject = Object.values(
    records.reduce((m, r) => {
      const x =
        m[r.subjectName] ||
        (m[r.subjectName] = { name: r.subjectName, icon: r.icon, color: r.color || "#667eea", n: 0, sum: 0 });
      x.n++;
      x.sum += r.percent;
      return m;
    }, {})
  );

  const donut = total
    ? `conic-gradient(var(--ok) 0 ${passRate}%, var(--bad) 0)`
    : "conic-gradient(var(--line) 0 100%)";

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <>
      <div className="adm-hello">
        <div>
          <h2>Welcome back, {user.name} 👋</h2>
          <p>{today}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="adm-cards">
        {cards.map((c) => (
          <div className="adm-stat" key={c.label} style={{ "--c": c.c }}>
            <div className="adm-stat-ico">{c.icon}</div>
            <div>
              <b>{c.value}</b>
              <small>{c.label}</small>
            </div>
          </div>
        ))}
      </div>

      <div className="adm-grid2">
        {/* Pass / fail */}
        <div className="adm-card">
          <h3>Pass rate</h3>
          <div className="adm-donut-wrap">
            <div className="adm-donut" style={{ background: donut }}>
              <div>{total ? `${passRate}%` : "–"}</div>
            </div>
            <ul className="adm-legend">
              <li><i style={{ background: "var(--ok)" }} /> Passed <b>{passed}</b></li>
              <li><i style={{ background: "var(--bad)" }} /> Failed <b>{total - passed}</b></li>
            </ul>
          </div>
        </div>

        {/* Subject performance */}
        <div className="adm-card">
          <h3>Subject-wise performance</h3>
          {bySubject.length === 0 && <p className="adm-muted">No results yet.</p>}
          {bySubject.map((s) => {
            const p = Math.round(s.sum / s.n);
            return (
              <div className="adm-bar" key={s.name}>
                <span>{s.icon} {s.name} <small>({s.n})</small></span>
                <div><i style={{ width: `${p}%`, background: s.color }} /></div>
                <b>{p}%</b>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent results */}
      <div className="adm-card">
        <div className="adm-card-head">
          <h3>Recent results</h3>
          <button type="button" className="nav-btn" onClick={() => go("results")}>View all</button>
        </div>
        {total === 0 ? (
          <p className="adm-muted">No exam results yet.</p>
        ) : (
          <div className="adm-tbl-wrap">
            <table className="adm-tbl">
              <thead>
                <tr><th>Student</th><th>Exam</th><th>Score</th><th>Result</th><th>Date</th></tr>
              </thead>
              <tbody>
                {records.slice(0, 6).map((r) => (
                  <tr key={r.id}>
                    <td><b>{r.candidate}</b></td>
                    <td>{r.icon} {r.subjectName} · {r.examName}</td>
                    <td>{r.correct}/{r.total} ({r.percent}%)</td>
                    <td><span className={`badge ${r.passed ? "pass" : "fail"}`}>{r.passed ? "Passed" : "Failed"}</span></td>
                    <td>{fmtD(r.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export default Dashboard;