export function DemoSection() {
  return (
    <section className="landing-section">
      <h2 className="landing-section-title">See It in Action: Corporate Use Case</h2>
      <div className="landing-ai-showcase landing-fade-up">
        <div className="landing-demo-container">
          <div className="landing-schedule-mock">
            <h4>
              <i className="fas fa-user-tie" aria-hidden /> Employee Hourly Log
            </h4>
            <div className="landing-timeline">
              <div className="landing-time-slot">
                <span>09:00 – 10:00</span>
                <span>🐛 Bug fixing #234</span>
              </div>
              <div className="landing-time-slot">
                <span>10:00 – 11:00</span>
                <span>📞 Client sync</span>
              </div>
              <div className="landing-time-slot">
                <span>11:00 – 12:00</span>
                <span>🍽️ Lunch break</span>
              </div>
              <div className="landing-time-slot landing-busy">
                <span>12:00 – 13:00</span>
                <span>❌ Busy (focus work)</span>
              </div>
              <div className="landing-time-slot landing-free">
                <span>13:00 – 14:00</span>
                <span>✅ Free slot</span>
              </div>
            </div>
            <p className="landing-mock-footnote">
              <i className="fas fa-pen" aria-hidden /> Employees update hourly tasks —
              full transparency.
            </p>
          </div>
          <div className="landing-schedule-mock">
            <h4>
              <i className="fas fa-user-cog" aria-hidden /> Manager Override
            </h4>
            <div className="landing-timeline">
              <div className="landing-time-slot landing-busy">
                <span>13:00 – 14:00</span>
                <span>⚠️ Manager added: Urgent Stand-up</span>
              </div>
              <div className="landing-time-slot landing-busy">
                <span>15:00 – 16:00</span>
                <span>⚠️ All‑hands (mandatory)</span>
              </div>
              <div className="landing-time-slot landing-free">
                <span>16:00 – 17:00</span>
                <span>✅ Adjusted: free now</span>
              </div>
            </div>
            <p className="landing-mock-footnote landing-mock-footnote--warn">
              <i className="fas fa-gavel" aria-hidden /> Managers can insert meetings
              without permission — schedule control for efficiency.
            </p>
          </div>
          <div className="landing-ai-insight">
            <h4>
              <i className="fas fa-microchip" aria-hidden /> ChronoAI Insight
            </h4>
            <div className="landing-meeting-suggest">
              <span className="landing-suggest-badge">
                <i className="fas fa-chart-line" aria-hidden /> TEAM OVERLAP ANALYSIS
              </span>
              <ul className="landing-ai-list">
                <li>
                  <i className="fas fa-clock" aria-hidden />{" "}
                  <strong>13:00 – 14:00</strong> → Manager inserted meeting → employee
                  availability overridden.
                </li>
                <li>
                  <i className="fas fa-clock" aria-hidden />{" "}
                  <strong>16:00 – 17:00</strong> → Both free for 1‑on‑1 coaching.
                </li>
                <li>
                  <i className="fas fa-chart-bar" aria-hidden />{" "}
                  <strong>Hourly log trend:</strong> Employee deep work from 12–13,
                  lunch at 11–12.
                </li>
              </ul>
              <div className="landing-time-badge">
                <i className="fas fa-brain" aria-hidden /> AI suggests: Reschedule team
                sync to 16:00 for better focus.
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="landing-demo-tagline">
        ✨ With accepted connections, managers see full team schedules, update them,
        and AI ensures optimal productivity ✨
      </p>
    </section>
  );
}
