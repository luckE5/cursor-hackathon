const extraFeatures = [
  {
    icon: "fa-heart",
    title: "For Partners",
    body: 'Share your calendars, request date nights, and let AI find romantic windows when both are free — no more "I\'m busy" confusion.',
  },
  {
    icon: "fa-university",
    title: "For Academia",
    body: "Professors coordinate class swaps, set office hours, and students can see real‑time availability. Department‑wide sync with consent.",
  },
  {
    icon: "fa-chart-pie",
    title: "Smart Reporting",
    body: "Export hourly logs, team availability heatmaps, and AI‑generated productivity insights — perfect for quarterly reviews.",
  },
] as const;

export function LifeLearningSection() {
  return (
    <section className="landing-section">
      <h2 className="landing-section-title">More Than Work — Life & Learning</h2>
      <div className="landing-features-grid landing-features-grid--tight">
        {extraFeatures.map((f) => (
          <div key={f.title} className="landing-feature-card landing-fade-up">
            <div className="landing-feature-icon">
              <i className={`fas ${f.icon}`} aria-hidden />
            </div>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
