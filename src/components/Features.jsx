const features = [
  { icon: "🏅", t: "#7c3aed", title: "Instant results", text: "See your score, pass or fail status and correct answers right after you submit. Pass mark is 60%." },
  { icon: "⬇️", t: "#14b8a6", title: "One-click PDF report", text: "Download your result as a PDF with score, time used and a full answer review to keep or share." },
  { icon: "⏱️", t: "#6366f1", title: "Timed & fair exams", text: "Live countdown timer and automatic submission when time ends keep every exam on track." },
  { icon: "🧭", t: "#f59e0b", title: "Smart question palette", text: "Jump to any question, mark tricky ones for review and see what is still unanswered." },
  { icon: "📊", t: "#ec4899", title: "Student panel", text: "Every exam is saved. Track your average, best score and subject-wise progress over time." },
  { icon: "🌙", t: "#0ea5e9", title: "Day & night mode", text: "Study comfortably at any hour with a light or dark theme that remembers your choice." },
];

const steps = [
  { n: 1, title: "Choose subject & exam", text: "Pick from many subjects, each with multiple exams." },
  { n: 2, title: "Take the timed test", text: "Answer MCQs before the timer runs out." },
  { n: 3, title: "Get result & track progress", text: "Review answers, download PDF and see your history." },
];

function Features() {
  return (
    <section className="feat-sec">
      <div className="feat-head">
        <span className="eyebrow">Why choose Online MCQ Test</span>
        <h2>আমাদের বিশেষ সেবাসমূহ (Exam Highlights)</h2>
        <p>Practice real exam routines online with instant validation, detailed review and progress tracking.</p>
      </div>

      <div className="feat-grid">
        {features.map((f) => (
          <article className="feat-card" key={f.title} style={{ "--t": f.t }}>
            <div className="feat-ico">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </article>
        ))}
      </div>

      <div className="steps">
        {steps.map((s) => (
          <div className="step" key={s.n}>
            <span>{s.n}</span>
            <div><b>{s.title}</b><small>{s.text}</small></div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Features;