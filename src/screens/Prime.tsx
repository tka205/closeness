/* Prime (M3): pre-conversation intention. 15 seconds, one field. */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { put, uuid, nowISO } from "../lib/db";
import { Field } from "../components/ui";

export default function Prime({ phase }: { phase: number }) {
  const nav = useNavigate();
  const [intention, setIntention] = useState("");
  const save = async () => {
    await put("primes", { id: uuid(), created_at: nowISO(), updated_at: nowISO(), intention: intention || null, phase });
    nav("/");
  };
  return (
    <div className="screen">
      <h1 style={{ marginBottom: "var(--s5)" }}>Prime</h1>
      <Field label="One intention for today's conversations" hint="One mechanic, one focus. Keep it small enough to actually do.">
        <input value={intention} onChange={(e) => setIntention(e.target.value)} placeholder="e.g. hold one silence per conversation" />
      </Field>
      <button className="btn" style={{ width: "100%" }} onClick={() => void save()}>Set intention</button>
    </div>
  );
}
