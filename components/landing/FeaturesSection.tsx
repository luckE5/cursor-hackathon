const mainFeatures = [
  {
    icon: "fa-building",
    title: "Corporate Command",
    body: "Managers can update employee schedules without permission — assign meetings, shift deadlines. Hourly work logs let teams track productivity in real time.",
  },
  {
    icon: "fa-users",
    title: "Team Collaboration",
    body: "See colleagues' availability, request syncs, and coordinate lunch or group work. Perfect for agile squads and cross-functional teams.",
  },
  {
    icon: "fa-chart-line",
    title: "Hourly Micro‑Logging",
    body: 'Employees log what they worked on each hour (e.g., "9–10: bug fix", "11–12: lunch"). Transparent tracking helps managers allocate resources.',
  },
  {
    icon: "fa-heart",
    title: "Couples & Friends",
    body: "Share personal calendars, request quality time, and let AI suggest date nights or hangouts based on mutual free slots.",
  },
  {
    icon: "fa-chalkboard-teacher",
    title: "Academia Hub",
    body: "Professors coordinate class schedules, share office hours, and swap lecture slots with consent. Students see real‑time availability.",
  },
  {
    icon: "fa-brain",
    title: "AI Overlap Engine",
    body: "After connecting, AI breaks down busy/free times, highlights optimal meeting windows, and even suggests rescheduling conflicts.",
  },
] as const;

export function FeaturesSection() {
  return (
    <section className="landing-section">
      <h2 className="landing-section-title">Built for Every Connection</h2>
      <div className="landing-features-grid">
        {mainFeatures.map((f) => (
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
