import { useState, useEffect, useRef } from "react";

const fmt = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function QuizScreen({ questions, subjectName, candidate, timeLimit, onFinish }) {
  const [cur, setCur] = useState(0);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState({});
  const [left, setLeft] = useState(timeLimit);
  const [confirm, setConfirm] = useState(false);
  const latest = useRef(answers);
  latest.current = answers;

  useEffect(() => {
    if (left <= 0) {
      onFinish(latest.current, true, timeLimit);
      return;
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const q = questions[cur];
  const total = questions.length;
  const answered = Object.keys(answers).length;
  const submit = () => onFinish(answers, false, timeLimit - left);

  return (
    <>
      <div className="topbar">
        <div>
          <h2>{subjectName}</h2>
          <small>Candidate: {candidate}</small>
        </div>
        <div className={`timer ${left <= 10 ? "low" : ""}`}>⏱ {fmt(left)}</div>
      </div>

      <div className="exam">
        <div className="panel">
          <div className="bar"><div style={{ width: `${(answered / total) * 100}%` }} /></div>
          <div className="qno">Question {cur + 1} of {total}</div>
          <div className="qtext">{q.question}</div>

          {q.options.map((opt, i) => (
            <button
              key={opt}
              className={`opt ${answers[cur] === opt ? "on" : ""}`}
              onClick={() => setAnswers({ ...answers, [cur]: opt })}
            >
              <b>{String.fromCharCode(65 + i)}</b>{opt}
            </button>
          ))}

          <div className="nav">
            <button className="btn ghost" disabled={cur === 0} onClick={() => setCur(cur - 1)}>
              Previous
            </button>
            <button
              className="btn ghost"
              onClick={() => setMarked({ ...marked, [cur]: !marked[cur] })}
            >
              {marked[cur] ? "Unmark review" : "Mark for review"}
            </button>
            {cur + 1 < total ? (
              <button className="btn" onClick={() => setCur(cur + 1)}>Next</button>
            ) : (
              <button className="btn ok" onClick={() => setConfirm(true)}>Submit exam</button>
            )}
          </div>
        </div>

        <div className="panel side">
          <h3>Question palette</h3>
          <div className="grid">
            {questions.map((_, i) => (
              <button
                key={i}
                className={`pal ${marked[i] ? "mark" : answers[i] ? "done" : ""} ${i === cur ? "cur" : ""}`}
                onClick={() => setCur(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="legend">
            <span><i style={{ background: "var(--ok)" }} />Answered ({answered})</span>
            <span><i style={{ background: "var(--warn)" }} />Marked ({Object.values(marked).filter(Boolean).length})</span>
            <span><i style={{ background: "var(--card)", border: "1px solid var(--line)" }} />Not answered ({total - answered})</span>
          </div>
          <button className="btn ok full" onClick={() => setConfirm(true)}>Submit exam</button>
        </div>
      </div>

      {confirm && (
        <div className="overlay">
          <div className="modal" role="dialog" aria-modal="true">
            <h3>Submit your exam?</h3>
            <p>
              You answered {answered} of {total} questions.
              {answered < total && ` ${total - answered} unanswered will be counted as wrong.`}
              {" "}You cannot change answers after submitting.
            </p>
            <div className="row">
              <button className="btn ghost" onClick={() => setConfirm(false)}>Keep working</button>
              <button className="btn ok" onClick={submit}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default QuizScreen;