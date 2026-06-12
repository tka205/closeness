/* Today's logs + recent history. Quick logs surface here for detail-adding. */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { all, type BaseRow } from "../lib/db";
import { rowLocalDate, localDate, type Counts } from "../lib/model";
import { DepthRings } from "../App";

export default function LogList() {
  const [rows, setRows] = useState<BaseRow[]>([]);
  useEffect(() => {
    void all("conversations").then((r) =>
      setRows(r.filter((x) => !x.deleted).sort((a, b) => (b.created_at as string).localeCompare(a.created_at as string)).slice(0, 60)));
  }, []);

  const today = localDate();
  const fmt = (r: BaseRow) => new Date(r.created_at as string).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

  return (
    <div className="screen">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--s5)" }}>
        <h1>Log</h1>
        <Link to="/log/new" className="btn" style={{ minHeight: 40, padding: "var(--s2) var(--s4)" }}>+ New</Link>
      </header>
      {rows.length === 0 && (
        <div className="card" style={{ textAlign: "center" }}>
          <p className="muted">No conversations yet. Log the first one — one tap on Today counts.</p>
        </div>
      )}
      {rows.map((r) => {
        const c = r.counts as Counts | null;
        const isQuick = r.kind === "quick";
        return (
          <Link key={r.id} to={`/log/${r.id}`} style={{ color: "inherit" }}>
            <div className="card" style={{ display: "flex", alignItems: "center", gap: "var(--s4)", marginBottom: "var(--s3)", padding: "var(--s4)" }}>
              <DepthRings depth={(r.depth as number) ?? 0} size={44} />
              <div style={{ flex: 1 }}>
                <p className="small" style={{ fontWeight: 600 }}>
                  {rowLocalDate(r) === today ? "Today" : rowLocalDate(r)} · {fmt(r)}
                </p>
                <p className="muted small">
                  {isQuick ? "Quick log — tap to add detail" :
                    c ? `${c.questions}q · ${c.silences}s · ${c.disclosures}d` : "No counts"}
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
