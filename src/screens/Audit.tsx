/* Evening audit (M3): short reflection + predict-before-reveal — the only
   metric in the app with an external criterion, so it's front and centre. */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { put, uuid, nowISO } from "../lib/db";
import { Field, Toggle } from "../components/ui";

export default function Audit() {
  const nav = useNavigate();
  const [reflections, setReflections] = useState("");
  const [prediction, setPrediction] = useState("");
  const [actual, setActual] = useState("");
  const [accurate, setAccurate] = useState(false);
  const save = async () => {
    await put("audits", {
      id: uuid(), created_at: nowISO(), updated_at: nowISO(),
      reflections: reflections || null,
      predict_reveal: prediction || actual ? { prediction, actual, accurate } : null,
    });
    nav("/");
  };
  return (
    <div className="screen">
      <h1 style={{ marginBottom: "var(--s5)" }}>Evening audit</h1>
      <Field label="What did you notice today?" hint="Two sentences max. This is a rep, not an essay.">
        <textarea rows={3} value={reflections} onChange={(e) => setReflections(e.target.value)} />
      </Field>
      <div className="card" style={{ marginBottom: "var(--s5)" }}>
        <h3 style={{ marginBottom: "var(--s3)" }}>Predict before reveal</h3>
        <p className="muted small" style={{ marginBottom: "var(--s4)" }}>
          Pick one moment: what did you think they felt or meant — and what turned out to be true?
        </p>
        <Field label="Your read">
          <input value={prediction} onChange={(e) => setPrediction(e.target.value)} placeholder="What you predicted" />
        </Field>
        <Field label="What was actually the case">
          <input value={actual} onChange={(e) => setActual(e.target.value)} placeholder="What you later learned" />
        </Field>
        <Toggle label="Your read was accurate" value={accurate} onChange={setAccurate} />
      </div>
      <button className="btn" style={{ width: "100%" }} onClick={() => void save()}>Save audit</button>
    </div>
  );
}
