/* Domain model: types, phase logic, Europe/London date anchoring,
   data-derived streaks (never stored counters), weekly aggregates. */
import { all, type BaseRow } from "./db";

export const TZ = "Europe/London";
export const SETTINGS_ID = "00000000-0000-4000-8000-000000000001";

/* ---------- dates (always Europe/London) ---------- */
export function localDate(d: Date = new Date()): string {
  // en-CA gives YYYY-MM-DD
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}
export function dayDiff(fromYMD: string, toYMD: string): number {
  return Math.round((Date.parse(toYMD) - Date.parse(fromYMD)) / 86_400_000);
}
export function addDays(ymd: string, n: number): string {
  const d = new Date(Date.parse(ymd) + n * 86_400_000);
  return d.toISOString().slice(0, 10);
}
export function weekStartOf(ymd: string): string {
  // Monday-start weeks
  const d = new Date(ymd + "T12:00:00Z");
  const dow = d.getUTCDay(); // 0=Sun
  const back = dow === 0 ? 6 : dow - 1;
  return addDays(ymd, -back);
}
export function rowLocalDate(row: BaseRow): string {
  return new Date(row.created_at as string).toLocaleDateString("en-CA", { timeZone: TZ });
}

/* ---------- phases ---------- */
export interface PhaseInfo { num: number; name: string; focus: string; dayRange: [number, number] }
export const PHASES: PhaseInfo[] = [
  { num: 0, name: "Calibration", focus: "Baseline only. Log honestly, change nothing yet.", dayRange: [1, 3] },
  { num: 1, name: "Attentional Foundation", focus: "Attention outward. Notice them, not yourself.", dayRange: [4, 17] },
  { num: 2, name: "Mechanics Installation", focus: "Silence hold. One-level-down questions. Per-rep logging.", dayRange: [18, 45] },
  { num: 3, name: "Perspective Taking", focus: "Predict before reveal. Check your reads against reality.", dayRange: [46, 66] },
  { num: 4, name: "Integration", focus: "Feedback fades by design. Trust the installed mechanics.", dayRange: [67, 87] },
];
export function phaseForDay(day: number): PhaseInfo {
  for (const p of PHASES) if (day >= p.dayRange[0] && day <= p.dayRange[1]) return p;
  return day < 1 ? PHASES[0] : PHASES[4];
}
export interface ProtocolState {
  started: boolean;
  day: number;          // 1-based protocol day
  phase: PhaseInfo;
  complete: boolean;    // past day 87
}
export function protocolState(startDate: string | null, override: number | null): ProtocolState {
  if (!startDate) return { started: false, day: 0, phase: PHASES[0], complete: false };
  const day = dayDiff(startDate, localDate()) + 1;
  const phase = override !== null ? PHASES[Math.min(4, Math.max(0, override))] : phaseForDay(day);
  return { started: true, day: Math.max(1, day), phase, complete: day > 87 };
}

/* ---------- entity shapes ---------- */
export interface Counts { questions: number; silences: number; disclosures: number; initiated: boolean }
export interface Signals { extended: boolean; followed_up: boolean; disclosed_back: boolean }
export const MECHANICS = ["Silence hold", "One level down", "Match +1 disclosure", "Emotion label", "Loop back"] as const;
export const TRIGGERS = ["Self-focus spike", "Filled the silence", "Topic surfed", "Checked out", "Over-disclosed"] as const;

export function emptyCounts(): Counts { return { questions: 0, silences: 0, disclosures: 0, initiated: false }; }
export function emptySignals(): Signals { return { extended: false, followed_up: false, disclosed_back: false }; }

/* ---------- derived: streak (from data, neutral framing) ---------- */
export interface Streak { current: number; loggedToday: boolean }
export async function deriveStreak(): Promise<Streak> {
  const rows = (await all("conversations")).filter((r) => !r.deleted);
  const days = new Set(rows.map(rowLocalDate));
  const today = localDate();
  let current = 0;
  let cursor = days.has(today) ? today : addDays(today, -1);
  while (days.has(cursor)) { current += 1; cursor = addDays(cursor, -1); }
  return { current, loggedToday: days.has(today) };
}

/* ---------- derived: weekly aggregates ---------- */
export interface WeekAgg {
  week_start: string;
  conversations: number;
  questions: number;
  silences: number;
  disclosures: number;
  initiated: number;
  signals_extended: number;
  signals_followed_up: number;
  signals_disclosed_back: number;
  avg_depth: number | null;
  mechanics: Record<string, number>;
  triggers: Record<string, number>;
}
export async function aggregateWeek(weekStart: string): Promise<WeekAgg> {
  const end = addDays(weekStart, 6);
  const rows = (await all("conversations")).filter((r) => {
    if (r.deleted) return false;
    const d = rowLocalDate(r);
    return d >= weekStart && d <= end;
  });
  const agg: WeekAgg = {
    week_start: weekStart, conversations: rows.length,
    questions: 0, silences: 0, disclosures: 0, initiated: 0,
    signals_extended: 0, signals_followed_up: 0, signals_disclosed_back: 0,
    avg_depth: null, mechanics: {}, triggers: {},
  };
  const depths: number[] = [];
  for (const r of rows) {
    const c = (r.counts as Counts | null) ?? null;
    if (c) {
      agg.questions += c.questions || 0;
      agg.silences += c.silences || 0;
      agg.disclosures += c.disclosures || 0;
      if (c.initiated) agg.initiated += 1;
    }
    const s = (r.signals as Signals | null) ?? null;
    if (s) {
      if (s.extended) agg.signals_extended += 1;
      if (s.followed_up) agg.signals_followed_up += 1;
      if (s.disclosed_back) agg.signals_disclosed_back += 1;
    }
    if (typeof r.depth === "number") depths.push(r.depth);
    for (const m of (r.mechanics as string[] | null) ?? []) agg.mechanics[m] = (agg.mechanics[m] || 0) + 1;
    for (const t of (r.triggers as string[] | null) ?? []) agg.triggers[t] = (agg.triggers[t] || 0) + 1;
  }
  if (depths.length) agg.avg_depth = Math.round((depths.reduce((a, b) => a + b, 0) / depths.length) * 10) / 10;
  return agg;
}

/* ---------- CSV export (conversations) ---------- */
export async function conversationsCSV(): Promise<string> {
  const rows = (await all("conversations")).filter((r) => !r.deleted)
    .sort((a, b) => (a.created_at as string).localeCompare(b.created_at as string));
  const head = "date,kind,depth,questions,silences,disclosures,initiated,extended,followed_up,disclosed_back,mechanics,triggers,note";
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) => {
    const c = (r.counts as Counts | null) ?? emptyCounts();
    const s = (r.signals as Signals | null) ?? emptySignals();
    return [
      rowLocalDate(r), r.kind ?? "", r.depth ?? "", c.questions, c.silences, c.disclosures,
      c.initiated ? 1 : 0, s.extended ? 1 : 0, s.followed_up ? 1 : 0, s.disclosed_back ? 1 : 0,
      esc(((r.mechanics as string[]) ?? []).join("; ")), esc(((r.triggers as string[]) ?? []).join("; ")), esc(r.note),
    ].join(",");
  });
  return [head, ...lines].join("\n");
}
