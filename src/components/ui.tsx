/* Shared input components. Built for thumb speed: every control is one tap. */
import type { ReactNode } from "react";

export function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--s2) 0" }}>
      <span>{label}</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--s3)" }}>
        <button className="btn-quiet" style={{ borderRadius: 999, width: 40, height: 40, fontSize: 20 }}
          onClick={() => onChange(Math.max(0, value - 1))} aria-label={`Fewer ${label}`}>−</button>
        <strong style={{ minWidth: 24, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{value}</strong>
        <button className="btn-quiet" style={{ borderRadius: 999, width: 40, height: 40, fontSize: 20 }}
          onClick={() => onChange(value + 1)} aria-label={`More ${label}`}>+</button>
      </span>
    </div>
  );
}

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (b: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", padding: "var(--s3) 0", textAlign: "left" }}>
      <span>{label}</span>
      <span aria-hidden style={{
        width: 48, height: 28, borderRadius: 999, position: "relative", transition: "background 160ms",
        background: value ? "var(--accent)" : "var(--surface-2)", border: "1px solid var(--line)" }}>
        <span style={{
          position: "absolute", top: 2, left: value ? 22 : 2, width: 22, height: 22, borderRadius: "50%",
          background: value ? "#141005" : "var(--ink-muted)", transition: "left 160ms" }} />
      </span>
    </button>
  );
}

export function Chips({ options, selected, onToggle }: { options: readonly string[]; selected: string[]; onToggle: (s: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s2)" }}>
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button key={o} onClick={() => onToggle(o)} className="btn-quiet" style={{
            borderRadius: 999, padding: "6px 14px", minHeight: 36, fontSize: "var(--text-sm)",
            background: on ? "var(--accent-soft)" : "var(--surface-2)",
            borderColor: on ? "var(--accent)" : "var(--line)",
            color: on ? "var(--accent)" : "var(--ink)" }}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function DepthPicker({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  return (
    <div style={{ display: "flex", gap: "var(--s2)", justifyContent: "center" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onChange(n)} className="btn-quiet" aria-label={`Depth ${n}`} style={{
          width: 48, height: 48, borderRadius: "50%", fontWeight: 600,
          background: value === n ? "var(--accent)" : "var(--surface-2)",
          color: value === n ? "#141005" : "var(--ink)",
          borderColor: value !== null && value >= n ? "var(--accent)" : "var(--line)" }}>
          {n}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: "var(--s5)" }}>
      <p className="small" style={{ marginBottom: "var(--s2)", fontWeight: 600 }}>{label}</p>
      {children}
      {hint && <p className="muted small" style={{ marginTop: "var(--s2)" }}>{hint}</p>}
    </div>
  );
}

export function Banner({ children, onDismiss }: { children: ReactNode; onDismiss?: () => void }) {
  return (
    <div role="status" style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--s3)",
      background: "var(--accent-soft)", border: "1px solid var(--accent)", borderRadius: "var(--radius)",
      padding: "var(--s3) var(--s4)", marginBottom: "var(--s4)" }}>
      <span className="small">{children}</span>
      {onDismiss && <button className="muted small" onClick={onDismiss} aria-label="Dismiss">✕</button>}
    </div>
  );
}

/* Tiny dependency-free SVG bar chart (keeps the bundle small on purpose).
   Bars live in a stretch-to-fit SVG; labels live in an HTML row below it so
   text renders at true pixel size and never distorts. */
export function Bars({ data, labels, height = 120, color = "var(--accent)" }:
  { data: number[]; labels: string[]; height?: number; color?: string }) {
  const max = Math.max(1, ...data);
  const bw = 100 / Math.max(1, data.length);
  const showLabel = (i: number) =>
    labels.length <= 6 || i % 2 === (labels.length - 1) % 2; // thin out, always keep the last
  return (
    <div>
      <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" role="img">
        {data.map((v, i) => {
          const h = (v / max) * (height - 6);
          return (
            <rect key={i} x={i * bw + bw * 0.15} y={height - h} width={bw * 0.7} height={Math.max(1, h)} rx={1.5}
              fill={color} opacity={0.35 + 0.65 * (v / max)} />
          );
        })}
      </svg>
      <div style={{ display: "flex", marginTop: 4 }}>
        {labels.map((l, i) => (
          <span key={i} style={{
            flex: 1, textAlign: "center", fontSize: 10, color: "var(--ink-muted)",
            overflow: "hidden", whiteSpace: "nowrap" }}>
            {showLabel(i) ? l : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
