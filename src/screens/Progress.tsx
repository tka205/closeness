/* Progress (M4): counts-first analytics. Behavioral counts lead; felt depth
   is bottom and explicitly labelled subjective. Streak framing is neutral
   (Lally: one missed day doesn't break habit formation). */
import { useEffect, useState } from "react";
import { aggregateWeek, deriveStreak, weekStartOf, localDate, addDays, type WeekAgg, type Streak } from "../lib/model";
import { Bars } from "../components/ui";

export default function Progress() {
  const [weeks, setWeeks] = useState<WeekAgg[]>([]);
  const [streak, setStreak] = useState<Streak | null>(null);

  useEffect(() => {
    const start = weekStartOf(localDate());
    const targets = Array.from({ length: 8 }, (_, i) => addDays(start, -7 * (7 - i)));
    void Promise.all(targets.map(aggregateWeek)).then(setWeeks);
    void deriveStreak().then(setStreak);
  }, []);

  const labels = weeks.map((w) => w.week_start.slice(5));
  const totalConvos = weeks.reduce((a, w) => a + w.conversations, 0);

  return (
    <div className="screen">
      <h1 style={{ marginBottom: "var(--s5)" }}>Progress</h1>

      <div className="card" style={{ marginBottom: "var(--s4)", textAlign: "center" }}>
        <p style={{ fontSize: "var(--text-2xl)", fontFamily: "var(--font-display)" }}>
          {streak ? streak.current : "…"} <span className="muted" style={{ fontSize: "var(--text-base)" }}>day{streak?.current === 1 ? "" : "s"} logging</span>
        </p>
        <p className="muted small">One missed day doesn't undo anything. The reps are banked.</p>
      </div>

      <div className="card" style={{ marginBottom: "var(--s4)" }}>
        <h3>Conversations per week</h3>
        <p className="muted small" style={{ marginBottom: "var(--s3)" }}>{totalConvos} in the last 8 weeks</p>
        <Bars data={weeks.map((w) => w.conversations)} labels={labels} />
      </div>

      <div className="card" style={{ marginBottom: "var(--s4)" }}>
        <h3 style={{ marginBottom: "var(--s3)" }}>Behavior per week</h3>
        <p className="small" style={{ fontWeight: 600 }}>Questions one level down</p>
        <Bars data={weeks.map((w) => w.questions)} labels={labels} height={70} />
        <p className="small" style={{ fontWeight: 600 }}>Silences held</p>
        <Bars data={weeks.map((w) => w.silences)} labels={labels} height={70} />
        <p className="small" style={{ fontWeight: 600 }}>Disclosures made</p>
        <Bars data={weeks.map((w) => w.disclosures)} labels={labels} height={70} />
      </div>

      <div className="card" style={{ marginBottom: "var(--s4)" }}>
        <h3 style={{ marginBottom: "var(--s3)" }}>Their behavior</h3>
        <Bars data={weeks.map((w) => w.signals_extended + w.signals_followed_up + w.signals_disclosed_back)} labels={labels} height={70} color="var(--ok)" />
        <p className="muted small">Extended + followed up + disclosed back, per week. The least biased trend on this page.</p>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: "var(--s3)" }}>Felt depth</h3>
        <Bars data={weeks.map((w) => w.avg_depth ?? 0)} labels={labels} height={70} color="var(--ink-muted)" />
        <p className="muted small">
          Subjective experience, not skill measurement — self-ratings of interpersonal ability track reality weakly. Trust the counts above.
        </p>
      </div>
    </div>
  );
}
