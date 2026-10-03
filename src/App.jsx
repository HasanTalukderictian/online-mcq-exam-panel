import { useState, useEffect } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import StartScreen from "./components/StartScreen";
import QuizScreen from "./components/QuizScreen";
import ResultScreen from "./components/ResultScreen";
import StudentPanel from "./components/StudentPanel";
import { subjects } from "./data/questions";
import { addRecord, findAttempt } from "./utils/storage";
import "./css/exam.css";

const PASS_MARK = 60;

function App() {
  const [screen, setScreen] = useState("start");
  const [leaveAsk, setLeaveAsk] = useState(false);
  const [pending, setPending] = useState("start");
  const [record, setRecord] = useState(null);
  const [theme, setTheme] = useState(() => {
    try {
      return (
        localStorage.getItem("theme") ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      );
    } catch {
      return "light";
    }
  });
  const [cfg, setCfg] = useState({ name: "", subject: "gk", examId: "exam1", time: 120 });
  const [result, setResult] = useState({ answers: {}, timeUp: false, taken: 0 });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("theme", theme); } catch {}
  }, [theme]);

  const sub = subjects[cfg.subject];
  const exam = sub.exams.find((e) => e.id === cfg.examId) || sub.exams[0];
  const title = `${sub.name} - ${exam.name}`;

  const handleStart = (name, subject, examId, time) => {
    if (findAttempt(name, subject, examId)) return; // already taken: never start again
    setCfg({ name, subject, examId, time });
    setScreen("quiz");
  };

  const handleFinish = (answers, timeUp, taken) => {
    const items = exam.questions.map((q, i) => ({ q: q.question, sel: answers[i] || null, ans: q.answer }));
    const correct = items.filter((x) => x.sel === x.ans).length;
    const skipped = items.filter((x) => !x.sel).length;
    const total = items.length;
    const percent = Math.round((correct / total) * 100);
    // First attempt counts: never save a second record for the same exam
    if (!findAttempt(cfg.name, sub.id, exam.id))
    addRecord({
      id: String(Date.now()),
      date: new Date().toISOString(),
      candidate: cfg.name,
      subjectId: sub.id,
      subjectName: sub.name,
      icon: sub.icon,
      color: sub.color,
      examId: exam.id,
      examName: exam.name,
      correct,
      wrong: total - correct - skipped,
      skipped,
      total,
      percent,
      passed: percent >= PASS_MARK,
      taken,
      timeUp,
      items,
    });
    setResult({ answers, timeUp, taken });
    setScreen("result");
  };

  // Navigation. "exam" = Home page, scrolled to the MCQ exam section.
  const navigate = (target) => {
    if (target === "exam") {
      setScreen("start");
      setTimeout(
        () => document.getElementById("exam-section")?.scrollIntoView({ behavior: "smooth", block: "start" }),
        80
      );
    } else {
      setScreen(target);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  // Ask first if an exam is running
  const go = (target) => {
    if (screen === "quiz") {
      setPending(target);
      setLeaveAsk(true);
    } else {
      navigate(target);
    }
  };
  const confirmLeave = () => {
    setLeaveAsk(false);
    navigate(pending);
  };

  const openRecord = (r) => {
    setRecord(r);
    setScreen("detail");
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="site">
      <Header
        screen={screen}
        onNav={go}
        theme={theme}
        onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
      />
      <main className="wrap">
        {screen === "start" && <StartScreen initial={cfg} onStart={handleStart} />}
        {screen === "quiz" && (
          <QuizScreen
            questions={exam.questions}
            subjectName={title}
            candidate={cfg.name}
            timeLimit={cfg.time}
            onFinish={handleFinish}
          />
        )}
        {screen === "result" && (
          <ResultScreen
            questions={exam.questions}
            subjectName={title}
            candidate={cfg.name}
            {...result}
            onRestart={() => setScreen("start")}
          />
        )}
        {screen === "panel" && (
          <StudentPanel currentName={cfg.name} onOpen={openRecord} onStart={() => setScreen("start")} />
        )}
        {screen === "detail" && record && (
          <ResultScreen
            questions={record.items.map((i) => ({ question: i.q, answer: i.ans }))}
            subjectName={`${record.subjectName} - ${record.examName}`}
            candidate={record.candidate}
            answers={Object.fromEntries(record.items.map((i, idx) => [idx, i.sel]).filter(([, s]) => s))}
            timeUp={record.timeUp}
            taken={record.taken}
            onRestart={() => setScreen("panel")}
            restartLabel="Back to Student Panel"
          />
        )}
      </main>
      <Footer />

      {leaveAsk && (
        <div className="overlay">
          <div className="modal" role="dialog" aria-modal="true">
            <h3>Leave the exam?</h3>
            <p>Your exam is still running. If you leave now, your answers will be lost and the exam will end.</p>
            <div className="row">
              <button className="btn ghost" onClick={() => setLeaveAsk(false)}>Stay in exam</button>
              <button className="btn bad" onClick={confirmLeave}>Leave exam</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;