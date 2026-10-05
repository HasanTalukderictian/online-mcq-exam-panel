import { useState } from "react";
import Hero from "./Hero";
import Features from "./Features";
import { subjects } from "../data/questions";
import { getRecords, findAttempt } from "../utils/storage";

// Used only if an exam has no `time` field (seconds).
const DEFAULT_TIME = 120;

const fmtTime = (t) => {
  const m = Math.floor(t / 60), s = t % 60;
  return m && s ? `${m}m ${s}s` : m ? `${m} min` : `${s}s`;
};

function StartScreen({ initial, onStart }) {
  const [name, setName] = useState(initial.name);
  const [subject, setSubject] = useState(initial.subject);
  const [examId, setExamId] = useState(initial.examId);
  const [error, setError] = useState("");

  const exams = subjects[subject].exams;
  const exam = exams.find((e) => e.id === examId) || exams[0];
  const time = exam.time ?? DEFAULT_TIME;

  // One attempt per student per exam (read fresh from storage on every render)
  const all = getRecords();
  const attempt = (subjectId, examId) => findAttempt(name, subjectId, examId, all);
  const taken = !!attempt(subject, exam.id);

  const pickSubject = (id) => {
    setSubject(id);
    setExamId(subjects[id].exams[0].id); // reset to first exam of that subject
  };

  const begin = () => {
    if (!name.trim()) return setError("Please enter your name to continue.");
    if (findAttempt(name, subject, exam.id)) return setError("You have already taken this exam. Each exam can be taken only once.");
    onStart(name.trim(), subject, exam.id, time);
  };

  return (
    <>
      <Hero />
      <Features />
      <div className="start" id="exam-section">
      <div className="panel">
        <h1>Start your exam</h1>
        <p className="sub">Enter your details, then choose a subject and an exam.</p>

        <label className="label" htmlFor="name">Candidate name</label>
        <input
          id="name"
          className="field"
          value={name}
          placeholder="Your full name"
          onChange={(e) => { setName(e.target.value); setError(""); }}
        />

        <div className="pick-scroll">
        <span className="label" id="subjects-label">Subject</span>
        <div className="subjects">
          {Object.values(subjects).map((s) => (
            <button
              key={s.id}
              type="button"
              className={`subj ${subject === s.id ? "on" : ""}`}
              style={{ "--c": s.color }}
              onClick={() => pickSubject(s.id)}
            >
              <span>{s.icon}</span>{s.name}
            </button>
          ))}
        </div>

        <span className="label">Exam</span>
        <div className="exam-list">
          {exams.map((e) => {
            const rec = attempt(subject, e.id);
            return (
              <button
                key={e.id}
                type="button"
                className={`exam-opt ${exam.id === e.id && !rec ? "on" : ""} ${rec ? "done" : ""}`}
                disabled={!!rec}
                onClick={() => setExamId(e.id)}
              >
                <b>{e.name}</b>
                <small>
                  {rec
                    ? `✓ Completed · ${rec.percent}%`
                    : `${e.questions.length} questions · ${fmtTime(e.time ?? DEFAULT_TIME)}`}
                </small>
              </button>
            );
          })}
        </div>
        </div>
        {error && <div className="err">{error}</div>}
        {taken && !error && <div className="err">You have already taken {exam.name}. Please choose another exam.</div>}
      </div>

      <div className="panel rules">
        <h2>Instructions</h2>
        <ul>
          <li>Each question has one correct answer.</li>
          <li>Use the question palette to jump to any question.</li>
          <li>Mark a question for review if you are unsure.</li>
          <li>The exam submits automatically when time runs out.</li>
          <li>You need 60% to pass.</li>
        </ul>
        <div className="facts">
          <div><b>{exam.questions.length}</b><small>Questions</small></div>
          <div><b>{fmtTime(time)}</b><small>Duration</small></div>
          <div><b>60%</b><small>Pass mark</small></div>
        </div>
        <button className="btn full" onClick={begin} disabled={taken}>
          {taken ? "Already taken" : `Start ${exam.name}`}
        </button>
      </div>
      </div>
    </>
  );
}

export default StartScreen;  