/* Full conversation log (M1). Counts-first by design (Decision E):
   behavioral counts and external signals lead; depth is last and labelled
   subjective. Also edits existing rows (quick logs get detail added here). */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, put, remove, uuid, nowISO, type BaseRow } from "../lib/db";
import { MECHANICS, TRIGGERS, emptyCounts, emptySignals, type Counts, type Signals } from "../lib/model";
import { Stepper, Toggle, Chips, DepthPicker, Field } from "../components/ui";

export default function LogForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const [row, setRow] = useState<BaseRow | null>(null);
  const [counts, setCounts] = useState<Counts>(emptyCounts());
  const [signals, setSignals] = useState<Signals>(emptySignals());
  const [mechanics, setMechanics] = useState<string[]>([]);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [depth, setDepth] = useState<number | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!id) return;
    void get("conversations", id).then((r) => {
      if (!r) return;
      setRow(r);
      setCounts((r.counts as Counts) ?? emptyCounts());
      setSignals((r.signals as Signals) ?? emptySignals());
      setMechanics((r.mechanics as string[]) ?? []);
      setTriggers((r.triggers as string[]) ?? []);
      setDepth((r.depth as number) ?? null);
      setNote((r.note as string) ?? "");
    });
  }, [id]);

  const save = async () => {
    const base: BaseRow = row ?? { id: uuid(), created_at: nowISO(), updated_at: nowISO() };
    await put("conversations", { ...base, kind: "full", counts, signals, mechanics, triggers, depth, note: note || null });
    nav("/log");
  };

  const del = async () => {
    if (row && confirm("Delete this log?")) { await remove("conversations", row.id); nav("/log"); }
  };

  const toggleIn = (list: string[], set: (v: string[]) => void) => (s: string) =>
    set(list.includes(s) ? list.filter((x) => x !== s) : [...list, s]);

  return (
    <div className="screen">
      <h1 style={{ marginBottom: "var(--s5)" }}>{row ? "Edit log" : "Log conversation"}</h1>

      <Field label="What you did" hint="Counts, not vibes. These are the primary metrics.">
        <div className="card" style={{ padding: "var(--s3) var(--s4)" }}>
          <Stepper label="Questions one level down" value={counts.questions} onChange={(n) => setCounts({ ...counts, questions: n })} />
          <Stepper label="Silences held" value={counts.silences} onChange={(n) => setCounts({ ...counts, silences: n })} />
          <Stepper label="Disclosures made" value={counts.disclosures} onChange={(n) => setCounts({ ...counts, disclosures: n })} />
          <Toggle label="You initiated the conversation" value={counts.initiated} onChange={(b) => setCounts({ ...counts, initiated: b })} />
        </div>
      </Field>

      <Field label="What they did" hint="Their behavior is the least biased signal you have.">
        <div className="card" style={{ padding: "var(--s3) var(--s4)" }}>
          <Toggle label="They extended the conversation" value={signals.extended} onChange={(b) => setSignals({ ...signals, extended: b })} />
          <Toggle label="They followed up after" value={signals.followed_up} onChange={(b) => setSignals({ ...signals, followed_up: b })} />
          <Toggle label="They disclosed something personal" value={signals.disclosed_back} onChange={(b) => setSignals({ ...signals, disclosed_back: b })} />
        </div>
      </Field>

      <Field label="Mechanics used">
        <Chips options={MECHANICS} selected={mechanics} onToggle={toggleIn(mechanics, setMechanics)} />
      </Field>

      <Field label="Triggers noticed">
        <Chips options={TRIGGERS} selected={triggers} onToggle={toggleIn(triggers, setTriggers)} />
      </Field>

      <Field label="Depth — how it felt" hint="Subjective experience. Useful, but not proof of skill.">
        <DepthPicker value={depth} onChange={setDepth} />
      </Field>

      <Field label="Note" hint="Initials, not names, for anyone you mention.">
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
      </Field>

      <button className="btn" style={{ width: "100%" }} onClick={() => void save()}>Save log</button>
      {row && (
        <button className="btn-quiet btn" style={{ width: "100%", marginTop: "var(--s3)", color: "var(--danger)" }} onClick={() => void del()}>
          Delete
        </button>
      )}
    </div>
  );
}
