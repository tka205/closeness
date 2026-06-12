/* Weekly review (M3): aggregates derived from data, confirm-or-adjust,
   one focus for next week. The self-guidance layer — never skippable silently. */
import { useEffect, useState } from "react";
import { all, put, uuid, nowISO, type BaseRow } from "../lib/db";
import { aggregateWeek, weekStartOf, localDate, addDays, type WeekAgg } from "../lib/model";

export default function Review() {
  const thisWeek = weekStartOf(localDate());
  const lastWeek = addDays(thisWeek, -7);
  const [agg, setAgg] = useState<WeekAgg | null>(null);
  const [existing, setExisting] = useState<BaseRow | null>(null);
  const [focus, setFocus] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void aggregateWeek(lastWeek).then(setAgg);
    void all("weekly_reviews").then((rows) => {
      const hit = rows.find((r) => !r.deleted && r.week_start === lastWeek);
      if (hit) { setExisting(hit); setFocus((hit.focus_next as string) ?? ""); }
    });
  }, [lastWeek]);

  const save = async () => {
    const base = existing ?? { id: uuid(), created_at: nowISO(), updated_at: nowISO() };
    await put("weekly_reviews", { ...base, week_start: lastWeek, aggregates: agg, focus_next: focus || null });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const top = (rec: Record<string, number>) =>
    Object.entries(rec).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ×${v}`).join(" · ") || "—";

  return (
    <div className="screen">
      <h1 style={{ marginBottom: "var(--s2)" }}>Weekly review</h1>
      <p className="muted small" style={{ marginBottom: "var(--s5)" }}>Week starting {lastWeek}</p>
      {!agg ? <p className="muted">…</p> : (
        <>
          <div className="card" style={{ marginBottom: "var(--s4)" }}>
            <h3 style={{ marginBottom: "var(--s3)" }}>What the data says</h3>
            <p>{agg.conversations} conversations · {agg.initiated} initiated</p>
            <p>{agg.questions} questions · {agg.silences} silences · {agg.disclosures} disclosures</p>
            <p className="muted small" style={{ marginTop: "var(--s2)" }}>
              They extended ×{agg.signals_extended} · followed up ×{agg.signals_followed_up} · disclosed back ×{agg.signals_disclosed_back}
            </p>
            <p className="muted small" style={{ marginTop: "var(--s2)" }}>
              Mechanics: {top(agg.mechanics)}<br />Triggers: {top(agg.triggers)}
            </p>
            {agg.avg_depth !== null && (
              <p className="muted small" style={{ marginTop: "var(--s2)" }}>Felt depth (subjective): {agg.avg_depth}/5</p>
            )}
          </div>
          <div className="card" style={{ marginBottom: "var(--s4)" }}>
            <h3 style={{ marginBottom: "var(--s3)" }}>One focus for next week</h3>
            <input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="e.g. initiate two conversations" />
          </div>
          <button className="btn" style={{ width: "100%" }} onClick={() => void save()}>
            {saved ? "Saved" : existing ? "Update review" : "Confirm review"}
          </button>
        </>
      )}
    </div>
  );
}
