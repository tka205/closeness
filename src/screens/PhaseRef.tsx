/* Phase reference (M5). Copy reflects the corrected theory review:
   no overclaiming on sleep timing or neural coupling; feedback fades by
   design in later phases (guidance-hypothesis literature). */
import { PHASES } from "../lib/model";

const DETAIL: Record<number, string[]> = {
  0: [
    "Three days of honest baseline. Log every conversation, change nothing on purpose.",
    "The point is calibration: your week-12 comparison only means something if week 0 was real.",
  ],
  1: [
    "Attention outward. Self-focused attention maintains social anxiety; redirecting it outward is a validated technique.",
    "The rep: notice three concrete things about the other person per conversation. Log it.",
  ],
  2: [
    "Install the mechanics: the silence hold, one-level-down questions, match-plus-one disclosure.",
    "Escalating reciprocal self-disclosure reliably builds closeness (Aron 1997). Small disclosures, matched and nudged one level.",
    "Log every rep soon after. This phase leans on frequent feedback on purpose.",
  ],
  3: [
    "Perspective taking. Predict what they feel or mean, then check against what turns out true.",
    "Predict-before-reveal is your only externally-checked metric. Take it seriously.",
  ],
  4: [
    "Integration. Feedback intensity fades by design: constant feedback creates dependence; fading it produces better long-term retention.",
    "Log less detail, keep the conversations. The mechanics should fire without the app.",
  ],
};

export default function PhaseRef() {
  return (
    <div className="screen">
      <h1 style={{ marginBottom: "var(--s5)" }}>Phases</h1>
      {PHASES.map((p) => (
        <div key={p.num} className="card" style={{ marginBottom: "var(--s4)" }}>
          <h3>{p.name}</h3>
          <p className="muted small" style={{ marginBottom: "var(--s3)" }}>Days {p.dayRange[0]}–{p.dayRange[1]}</p>
          {DETAIL[p.num].map((line, i) => <p key={i} className="small" style={{ marginBottom: "var(--s2)" }}>{line}</p>)}
        </div>
      ))}
      <p className="muted small">
        Honest footnote: practice volume alone predicts little in unstructured domains. The structure here — defined reps,
        immediate logs, phase focus — is the whole bet. Reflection near sleep is reasonable; treating bedtime as a magic
        consolidation window is not supported.
      </p>
    </div>
  );
}
