/* Settings (M2): protocol start/phase, reminders, export/import, account. */
import { useEffect, useRef, useState } from "react";
import { all, put, nowISO, exportAll, importAll, type BaseRow } from "../lib/db";
import { conversationsCSV, SETTINGS_ID, PHASES, localDate } from "../lib/model";
import { supabase, cloudConfigured, syncNow, pullAll } from "../lib/sync";
import { Field, Toggle } from "../components/ui";

interface Reminders { enabled: boolean; morning: string; evening: string }
const DEFAULT_REM: Reminders = { enabled: true, morning: "09:00", evening: "21:30" };

export default function Settings() {
  const [settings, setSettings] = useState<BaseRow | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void all("settings").then((rows) => {
      const hit = rows.find((r) => r.id === SETTINGS_ID);
      if (hit) setSettings(hit);
    });
    if (supabase) {
      void supabase.auth.getSession().then(({ data }) => setAuthedEmail(data.session?.user.email ?? null));
    }
  }, []);

  const saveSettings = async (patch: Partial<BaseRow>) => {
    const base: BaseRow = settings ?? { id: SETTINGS_ID, created_at: nowISO(), updated_at: nowISO(), reminders: DEFAULT_REM };
    const next = { ...base, ...patch };
    setSettings(next);
    await put("settings", next);
  };

  const rem: Reminders = (settings?.reminders as Reminders) ?? DEFAULT_REM;

  const startToday = () => void saveSettings({ start_date: localDate(), phase_override: null });

  const download = (name: string, text: string, type: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onImport = async (f: File) => {
    const text = await f.text();
    let rows = 0;
    try { rows = JSON.parse(text)?.data ? Object.values(JSON.parse(text).data as Record<string, unknown[]>).reduce((a, v) => a + v.length, 0) : 0; }
    catch { setMsg("Not a valid backup file."); return; }
    if (!confirm(`Import ${rows} rows? Existing rows with the same id will be overwritten.`)) return;
    const res = await importAll(text);
    setMsg(`Imported ${res.rows} rows across ${res.tables} tables.`);
  };

  const signIn = async (mode: "in" | "up") => {
    if (!supabase) return;
    setMsg("");
    const fn = mode === "in"
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password });
    const { data, error } = await fn;
    if (error) { setMsg(error.message); return; }
    setAuthedEmail(data.session?.user.email ?? data.user?.email ?? null);
    setMsg(mode === "up" ? "Account created." : "Signed in. Syncing…");
    void syncNow();
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setAuthedEmail(null);
    setMsg("Signed out. Logging keeps working locally.");
  };

  return (
    <div className="screen">
      <h1 style={{ marginBottom: "var(--s5)" }}>Settings</h1>

      <div className="card" style={{ marginBottom: "var(--s4)" }}>
        <h3 style={{ marginBottom: "var(--s3)" }}>Protocol</h3>
        {settings?.start_date ? (
          <p className="small">Started {String(settings.start_date)}</p>
        ) : (
          <button className="btn" style={{ width: "100%" }} onClick={startToday}>Start the 12 weeks today</button>
        )}
        <Field label="Phase override" hint="Leave on automatic unless you have a reason.">
          <select
            value={settings?.phase_override === null || settings?.phase_override === undefined ? "" : String(settings.phase_override)}
            onChange={(e) => void saveSettings({ phase_override: e.target.value === "" ? null : Number(e.target.value) })}>
            <option value="">Automatic (by date)</option>
            {PHASES.map((p) => <option key={p.num} value={p.num}>{p.name}</option>)}
          </select>
        </Field>
      </div>

      <div className="card" style={{ marginBottom: "var(--s4)" }}>
        <h3 style={{ marginBottom: "var(--s3)" }}>Reminders</h3>
        <Toggle label="Reminders on" value={rem.enabled} onChange={(b) => void saveSettings({ reminders: { ...rem, enabled: b } })} />
        <Field label="Morning prime">
          <input type="time" value={rem.morning} onChange={(e) => void saveSettings({ reminders: { ...rem, morning: e.target.value } })} />
        </Field>
        <Field label="Evening audit">
          <input type="time" value={rem.evening} onChange={(e) => void saveSettings({ reminders: { ...rem, evening: e.target.value } })} />
        </Field>
        <p className="muted small">In-app banners in v1. Push notifications arrive in v1.1 with content-free payloads.</p>
      </div>

      <div className="card" style={{ marginBottom: "var(--s4)" }}>
        <h3 style={{ marginBottom: "var(--s3)" }}>Data</h3>
        <button className="btn btn-quiet" style={{ width: "100%", marginBottom: "var(--s3)" }}
          onClick={() => void exportAll().then((j) => download(`closeness-backup-${localDate()}.json`, j, "application/json"))}>
          Export full backup (JSON)
        </button>
        <button className="btn btn-quiet" style={{ width: "100%", marginBottom: "var(--s3)" }}
          onClick={() => void conversationsCSV().then((c) => download(`closeness-conversations-${localDate()}.csv`, c, "text/csv"))}>
          Export conversations (CSV)
        </button>
        <button className="btn btn-quiet" style={{ width: "100%" }} onClick={() => fileRef.current?.click()}>
          Import backup
        </button>
        <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImport(f); e.target.value = ""; }} />
      </div>

      <div className="card" style={{ marginBottom: "var(--s4)" }}>
        <h3 style={{ marginBottom: "var(--s3)" }}>Backup account</h3>
        {!cloudConfigured() ? (
          <p className="muted small">No Supabase credentials set — running local-only. Add env vars and redeploy to enable cloud backup.</p>
        ) : authedEmail ? (
          <>
            <p className="small" style={{ marginBottom: "var(--s3)" }}>Signed in as {authedEmail}</p>
            <button className="btn btn-quiet" style={{ width: "100%", marginBottom: "var(--s3)" }} onClick={() => void pullAll().then((n) => setMsg(`Pulled ${n} rows from cloud.`))}>
              Pull from cloud
            </button>
            <button className="btn btn-quiet" style={{ width: "100%" }} onClick={() => void signOut()}>Sign out</button>
          </>
        ) : (
          <>
            <Field label="Email"><input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Field label="Password"><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
            <button className="btn" style={{ width: "100%", marginBottom: "var(--s3)" }} onClick={() => void signIn("in")}>Sign in</button>
            <button className="btn btn-quiet" style={{ width: "100%" }} onClick={() => void signIn("up")}>Create account</button>
          </>
        )}
      </div>

      {msg && <p className="small" style={{ color: "var(--accent)" }}>{msg}</p>}
    </div>
  );
}
