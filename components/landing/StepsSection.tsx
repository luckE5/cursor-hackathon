const steps = [
  {
    n: "1",
    title: "Set Your Schedule",
    body: "Build your personal or work calendar, log hourly tasks, and define availability.",
  },
  {
    n: "2",
    title: "Connect & Accept",
    body: "Send connection requests to teammates, friends, or professors. Once accepted, you see their schedule (with role‑based permissions).",
  },
  {
    n: "3",
    title: "Manager Override (Corp)",
    body: "For corporate accounts, managers can add meetings or adjust times — no permission needed, ensuring business continuity.",
  },
  {
    n: "4",
    title: "AI Unlocks Time",
    body: "ChronoAI breaks down busy/free slots, suggests optimal meeting times, and even reconciles conflicting schedules.",
  },
] as const;

export function StepsSection() {
  return (
    <section className="landing-section">
      <h2 className="landing-section-title">How ChronoSync Works</h2>
      <div className="landing-steps">
        {steps.map((s) => (
          <div key={s.n} className="landing-step landing-fade-up">
            <div className="landing-step-number">{s.n}</div>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
