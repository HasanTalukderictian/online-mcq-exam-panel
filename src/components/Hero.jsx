import { useEffect, useState } from "react";
import heroImage from "../assets/Hero.jpg"; // src/assets/Hero.jpg

const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

// counts up from 0 to the real number
function useCount(target, run) {
    const [n, setN] = useState(0);

    useEffect(() => {
        if (!run) return undefined;

        const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduce || !target) {
            setN(target);
            return undefined;
        }

        let raf;
        const start = performance.now();
        const duration = 900;
        const tick = (t) => {
            const p = Math.min(1, (t - start) / duration);
            setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(raf);
    }, [target, run]);

    return n;
}

function Stat({ value, label, loading }) {
    const n = useCount(value || 0, !loading);
    return (
        <div>
            <b>{loading ? "…" : n.toLocaleString()}</b>
            <small>{label}</small>
        </div>
    );
}

function Hero({ stats, loading, site = {} }) {
    const s = stats || {};
    const title = site.hero_title || "ONLINE MCQ TEST";
    const text =
        site.hero_text ||
        "Boost your exam preparation with dynamic MCQ tests across multiple subjects. Evaluate your skills with a live timer, question palette and instant results.";

    return (
        <section className="hero-sec">
            <img
                className="hero-img"
                src={heroImage}
                alt=""
                onError={(e) => (e.currentTarget.style.display = "none")}
            />
            <div className="hero-body">
                <span className="hero-badge">✦ Continuous testing ecosystem</span>
                <h1>
                    Welcome to
                    <em>{title}</em>
                </h1>
                <p>{text}</p>
                <div className="hero-btns">
                    <button className="hbtn main" onClick={() => scrollTo("exam-section")}>▶ Start quick quiz</button>
                    <button className="hbtn" onClick={() => scrollTo("subjects-showcase")}>Browse exams bank</button>
                </div>
                <div className="hero-stats">
                    <Stat value={s.students} label="Students" loading={loading} />
                    <Stat value={s.subjects} label="Subjects" loading={loading} />
                    <Stat value={s.exams} label="Exams" loading={loading} />
                    <Stat value={s.questions} label="Questions" loading={loading} />
                </div>
            </div>
        </section>
    );
}

export default Hero;