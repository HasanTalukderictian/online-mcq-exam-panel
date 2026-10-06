import { useState } from "react";
import Hero from "./Hero";
import Features from "./Features";
import { fmtTime } from "../adminpanel/ui";

function StartScreen({ catalog, user, site, onStart, starting, startError, onLogin, onRetry }) {
  const [subjectId, setSubjectId] = useState(null);
  const [examId, setExamId] = useState(null);

  const list = catalog.subjects;
  const subj = list.find((s) => String(s.id) === String(subjectId)) || list[0];
  const exams = subj ? subj.exams : [];
  const exam =
    exams.find((e) => String(e.id) === String(examId)) ||
    exams.find((e) => !e.completed) ||
    exams[0];

  const pickSubject = (id) => {
    setSubjectId(id);
    setExamId(null);
  };

  let body;
  if (catalog.loading && !list.length) {
    body = <div className="panel loading-box">Loading subjects...</div>;
  } else if (catalog.error) {
    body = (
      <div className="panel loading-box">
        <p>Could not load the exams: {catalog.error}</p>
        <button className="btn" onClick={onRetry}>Try again</button>
      </div>
    );
  } else if (!list.length) {
    body = (
      <div className="panel loading-box">
        <h2>No exams available yet</h2>
        <p>Please check back soon.</p>
      </div>
    );
  } else {
    const taken = !!exam.completed;
    const pass = exam.pass_mark || 60;

    let label = "Start " + exam.name;
    if (!user) label = "Sign up to start";
    else if (taken) label = "Already taken";
    else if (starting) label = "Loading exam...";

    body = (
      <>
        <div className="panel">
          <h1>Start your exam</h1>
          <p className="sub">Choose a subject and an exam.</p>

          {user ? (
            <div className="acct in">👤 Exam as <b>{user.name}</b></div>
          ) : (
            <div className="acct">
              🔒 Sign up (free) to take an exam. Already registered?{" "}
              <button type="button" className="link-btn" onClick={onLogin}>Log in</button>
            </div>
          )}

          <div className="pick-scroll">
            <span className="label" id="subjects-label">Subject</span>
            <div className="subjects">
              {list.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={"subj " + (subj.id === s.id ? "on" : "")}
                  style={{ "--c": s.color }}
                  onClick={() => pickSubject(s.id)}
                >
                  <span>{s.icon}</span>{s.name}
                </button>
              ))}
            </div>

            <span className="label">Exam</span>
            <div className="exam-list">
              {exams.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  className={"exam-opt " + (exam.id === e.id && !e.completed ? "on" : "") + (e.completed ? " done" : "")}
                  disabled={e.completed}
                  onClick={() => setExamId(e.id)}
                >
                  <b>{e.name}</b>
                  <small>
                    {e.completed
                      ? "✓ Completed · " + e.percent + "%"
                      : e.questions_count + " questions · " + fmtTime(e.time)}
                  </small>
                </button>
              ))}
            </div>
          </div>

          {startError && <div className="err">{startError}</div>}
          {taken && !startError && <div className="err">You have already taken {exam.name}. Please choose another exam.</div>}
        </div>

        <div className="panel rules">
          <h2>Instructions</h2>
          <ul>
            <li>Each question has one correct answer.</li>
            <li>Use the question palette to jump to any question.</li>
            <li>Mark a question for review if you are unsure.</li>
            <li>The exam submits automatically when time runs out.</li>
            <li>You need {pass}% to pass.</li>
          </ul>
          <div className="facts">
            <div><b>{exam.questions_count}</b><small>Questions</small></div>
            <div><b>{fmtTime(exam.time)}</b><small>Duration</small></div>
            <div><b>{pass}%</b><small>Pass mark</small></div>
          </div>
          <button
            className="btn full"
            disabled={site.maintenance_mode || (user ? taken || starting : false)}
            onClick={() => onStart(exam.id)}
          >
            {site.maintenance_mode ? "Exams are closed" : label}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Hero stats={catalog.stats} loading={catalog.loading} />
      <Features />
      <div className="start" id="exam-section">{body}</div>
    </>
  );
}

export default StartScreen;