import { subjects } from "../data/questions";
import heroImage from "../assets/Hero.jpg"; // src/assets/Hero.jpg

const go = (id, focus) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  if (focus) setTimeout(() => el.focus({ preventScroll: true }), 400);
};

function Hero({ stats, loading, site }) {
  const list = Object.values(subjects);
  const exams = list.flatMap((s) => s.exams);
  const questions = exams.reduce((n, e) => n + e.questions.length, 0);

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
         {/* ✅ এখানে ?. ব্যবহার করা হয়েছে */}
         <em>{site?.hero_title || "Our Portal"}</em>
        </h1>
        <p>
          {/* ✅ এখানেও ?. ব্যবহার করা হয়েছে */}
          {site?.hero_text || "Your journey to success starts here."}
        </p>
        <div className="hero-btns">
          <button className="hbtn main" onClick={() => go("name", true)}>▶ Start quick quiz</button>
          <button className="hbtn" onClick={() => go("subjects-label")}>Browse exams bank</button>
        </div>
        <div className="hero-stats">
          <div><b>{questions}</b><small>Total questions</small></div>
          <div><b>{list.length}</b><small>Active subjects</small></div>
          <div><b>{exams.length}</b><small>Available exams</small></div>
        </div>
      </div>
    </section>
  );
}

export default Hero;