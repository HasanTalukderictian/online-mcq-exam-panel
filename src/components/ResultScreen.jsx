const fmt = (s) => `${Math.floor(s / 60)}m ${s % 60}s`;

function ResultScreen({ questions, subjectName, candidate, answers, timeUp, taken, onRestart, restartLabel = "Take another exam" }) {
  const total = questions.length;
  const correct = questions.filter((q, i) => answers[i] === q.answer).length;
  const skipped = total - Object.keys(answers).length;
  const wrong = total - correct - skipped;
  const percent = Math.round((correct / total) * 100);
  const passed = percent >= 60;

  // Opens the print dialog; choose "Save as PDF" as the destination.
  const downloadPdf = () => {
    const oldTitle = document.title;
    document.title = `${candidate} - ${subjectName} Result`; // becomes the PDF file name
    const theme = document.documentElement.dataset.theme;
    delete document.documentElement.dataset.theme; // always print in light colors
    window.print();
    if (theme) document.documentElement.dataset.theme = theme;
    document.title = oldTitle;
  };

  return (
    <div className="result">
      <div className="panel">
        <div className="hero">
          <div className="ring" style={{ "--p": percent, "--c": passed ? "var(--ok)" : "var(--bad)" }}>
            <div>{percent}%</div>
          </div>
          <div>
            <span className={`badge ${passed ? "pass" : "fail"}`}>{passed ? "Passed" : "Not passed"}</span>
            <h2>{candidate}</h2>
            <p>{subjectName} · Time used: {fmt(taken)}</p>
            {timeUp && <p>Time ran out, so your exam was submitted automatically.</p>}
          </div>
        </div>

        <div className="stats">
          <div><b style={{ color: "var(--ok)" }}>{correct}</b><small>Correct</small></div>
          <div><b style={{ color: "var(--bad)" }}>{wrong}</b><small>Wrong</small></div>
          <div><b style={{ color: "var(--warn)" }}>{skipped}</b><small>Unanswered</small></div>
          <div><b>{total}</b><small>Total</small></div>
        </div>

        <h3>Review answers</h3>
        {questions.map((q, i) => {
          const sel = answers[i];
          const state = !sel ? "skip" : sel === q.answer ? "right" : "wrong";
          return (
            <div key={i} className={`rev ${state}`}>
              <p className="q">{i + 1}. {q.question}</p>
              <p>Your answer: <b>{sel || "Not answered"}</b></p>
              {state !== "right" && <p>Correct answer: <b>{q.answer}</b></p>}
            </div>
          );
        })}

        <div className="nav noprint" style={{ marginTop: 16 }}>
          <button className="btn ok" style={{ flex: 1 }} onClick={downloadPdf}>
            ⬇ Download PDF
          </button>
          <button className="btn" style={{ flex: 1 }} onClick={onRestart}>
            {restartLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResultScreen;