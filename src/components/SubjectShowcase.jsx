function SubjectShowcase({ subjects, loading, error, stats, onPick }) {
    // StartScreen already shows the error message
    if (error) return null;
    if (!loading && !subjects.length) return null;

    let sub = "Loading the latest exams...";
    if (stats) {
        sub =
            stats.exams + " exams and " + stats.questions.toLocaleString() + " questions are ready. " +
            stats.attempts.toLocaleString() + " exams have been taken so far.";
    }

    return (
        <section className="subj-sec" id="subjects-showcase">
            <div className="feat-head">
                <span className="eyebrow">Explore subjects</span>
                <h2>Pick a subject and start practising</h2>
                <p>{sub}</p>
            </div>

            <div className="subj-grid">
                {loading && !subjects.length
                    ? [0, 1, 2, 3].map((i) => <div className="skel" key={i} />)
                    : subjects.map((s) => (
                          <button
                              type="button"
                              key={s.id}
                              className="subj-card"
                              style={{ "--c": s.color }}
                              onClick={() => onPick(s.id)}
                          >
                              <span className="subj-ico">{s.icon}</span>
                              <b>{s.name}</b>
                              <small>
                                  {s.exams_count} {s.exams_count === 1 ? "exam" : "exams"} · {s.questions_count.toLocaleString()} questions
                              </small>
                              <span className="subj-go">View exams →</span>
                          </button>
                      ))}
            </div>
        </section>
    );
}

export default SubjectShowcase;