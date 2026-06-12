import { useEffect, useState } from "react";
import { NavLink, Route, Routes, Link } from "react-router-dom";
import { all, onOutboxChanged, outboxAll, put, uuid, nowISO, type BaseRow } from "./lib/db";
import { cloudConfigured, syncNow } from "./lib/sync";
import { protocolState, deriveStreak, rowLocalDate, localDate, SETTINGS_ID, type ProtocolState, type Streak } from "./lib/model";
import { Banner } from "./components/ui";
import LogForm from "./screens/LogForm";
import LogList from "./screens/LogList";
import Prime from "./screens/Prime";
import Audit from "./screens/Audit";
import Review from "./screens/Review";
import Progress from "./screens/Progress";
import PhaseRef from "./screens/PhaseRef";
import Settings from "./screens/Settings";

/* ---------- signature element: the depth rings ---------- */
export function DepthRings({ depth = 0, size = 120 }: { depth?: number; size?: number }) {
  const c = size / 2;
  return (
    <svg className="rings" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`Depth ${depth} of 5`}>
      {[1, 2, 3, 4, 5].map((r) => (
        <circle key={r} cx={c} cy={c} r={(c - 8) * (r / 5)} fill="none" stroke="var(--accent)"
          strokeWidth={size > 60 ? 3 : 2} opacity={depth >= r ? 0.25 + r * 0.15 : 0.08} />
      ))}
      <circle cx={c} cy={c} r={size > 60 ? 4 : 2.5} fill="var(--accent)" opacity={depth > 0 ? 1 : 0.2} />
    </svg>
  );
}

/* ---------- sync status chip ---------- */
function SyncChip() {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const refresh = () => void outboxAll().then((e) => setPending(e.length));
    refresh();
    const off = onOutboxChanged(refresh);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { off(); window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);
  if (!cloudConfigured()) return <span className="sync-chip offline">local only</span>;
  if (!online) return <span className="sync-chip offline">offline · saved locally</span>;
  if (pending > 0) return <button className="sync-chip pending" onClick={() => void syncNow()}>{pending} to sync</button>;
  return <span className="sync-chip">backed up</span>;
}

/* ---------- Home ---------- */
interface Reminders { enabled: boolean; morning: string; evening: string }

function Home({ proto }: { proto: ProtocolState }) {
  const [streak, setStreak] = useState<Streak | null>(null);
  const [todayCount, setTodayCount] = useState(0);
  const [primedToday, setPrimedToday] = useState(false);
  const [auditedToday, setAuditedToday] = useState(false);
  const [reminders, setReminders] = useState<Reminders | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const refresh = () => {
    void deriveStreak().then(setStreak);
    const today = localDate();
    void all("conversations").then((r) => setTodayCount(r.filter((x) => !x.deleted && rowLocalDate(x) === today).length));
    void all("primes").then((r) => setPrimedToday(r.some((x) => !x.deleted && rowLocalDate(x) === today)));
    void all("audits").then((r) => setAuditedToday(r.some((x) => !x.deleted && rowLocalDate(x) === today)));
    void all("settings").then((rows) => {
      const s = rows.find((x) => x.id === SETTINGS_ID);
      setReminders((s?.reminders as Reminders) ?? { enabled: true, morning: "09:00", evening: "21:30" });
    });
  };
  useEffect(refresh, []);

  const quickLog = async () => {
    await put("conversations", { id: uuid(), created_at: nowISO(), updated_at: nowISO(), kind: "quick", note: null, depth: null });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
    refresh();
  };

  const nowHM = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
  const showMorning = reminders?.enabled && !primedToday && nowHM >= reminders.morning && nowHM < reminders.evening && !dismissed.includes("m");
  const showEvening = reminders?.enabled && !auditedToday && nowHM >= reminders.evening && !dismissed.includes("e");

  return (
    <div className="screen">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--s4)" }}>
        <h1>Today</h1>
        <SyncChip />
      </header>

      {showMorning && <Banner onDismiss={() => setDismissed([...dismissed, "m"])}><Link to="/prime">Set today's intention →</Link></Banner>}
      {showEvening && <Banner onDismiss={() => setDismissed([...dismissed, "e"])}><Link to="/audit">Evening audit →</Link></Banner>}
      {proto.started && proto.day === 28 && <Banner>Day 28. {streak ? `Reps banked so far are yours to keep.` : ""} <Link to="/progress">See four weeks of data →</Link></Banner>}

      {proto.started ? (
        <p className="muted small" style={{ marginBottom: "var(--s4)" }}>
          Day {proto.day} of 87 · <Link to="/phases">{proto.phase.name}</Link>{proto.complete ? " · protocol complete" : ""}
        </p>
      ) : (
        <p className="muted small" style={{ marginBottom: "var(--s4)" }}>
          Protocol not started — <Link to="/settings">start in Settings</Link>. Logging works either way.
        </p>
      )}

      <div className="card" style={{ textAlign: "center", marginBottom: "var(--s4)" }}>
        <DepthRings depth={Math.min(5, todayCount)} />
        <p className="muted small" style={{ margin: "var(--s3) 0 var(--s4)" }}>
          {todayCount} conversation{todayCount === 1 ? "" : "s"} today{streak && streak.current > 1 ? ` · ${streak.current} days logging` : ""}
        </p>
        <button className="btn" style={{ width: "100%" }} onClick={() => void quickLog()}>
          {savedFlash ? "Saved" : "Log a conversation"}
        </button>
        <Link to="/log/new" className="muted small" style={{ display: "block", marginTop: "var(--s3)" }}>
          Log with detail
        </Link>
      </div>

      {proto.started && (
        <div className="card">
          <h3 style={{ marginBottom: "var(--s2)" }}>{proto.phase.name}</h3>
          <p className="small muted">{proto.phase.focus}</p>
          <div style={{ display: "flex", gap: "var(--s3)", marginTop: "var(--s4)" }}>
            {!primedToday && <Link to="/prime" className="btn btn-quiet" style={{ flex: 1 }}>Prime</Link>}
            {!auditedToday && <Link to="/audit" className="btn btn-quiet" style={{ flex: 1 }}>Audit</Link>}
            {primedToday && auditedToday && <p className="muted small">Prime ✓ · Audit ✓ — done for today.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- shell ---------- */
export default function App() {
  const [proto, setProto] = useState<ProtocolState>(protocolState(null, null));
  useEffect(() => {
    void all("settings").then((rows: BaseRow[]) => {
      const s = rows.find((x) => x.id === SETTINGS_ID);
      setProto(protocolState((s?.start_date as string) ?? null, (s?.phase_override as number | null) ?? null));
    });
  }, []);

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home proto={proto} />} />
        <Route path="/log" element={<LogList />} />
        <Route path="/log/new" element={<LogForm />} />
        <Route path="/log/:id" element={<LogForm />} />
        <Route path="/prime" element={<Prime phase={proto.phase.num} />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/review" element={<Review />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/phases" element={<PhaseRef />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      <nav className="tabbar">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>Today</NavLink>
        <NavLink to="/log" className={({ isActive }) => (isActive ? "active" : "")}>Log</NavLink>
        <NavLink to="/review" className={({ isActive }) => (isActive ? "active" : "")}>Review</NavLink>
        <NavLink to="/progress" className={({ isActive }) => (isActive ? "active" : "")}>Progress</NavLink>
        <NavLink to="/settings" className={({ isActive }) => (isActive ? "active" : "")}>Settings</NavLink>
      </nav>
    </div>
  );
}
