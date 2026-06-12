/* Cloud sync (Decision A). Supabase is the silent backup, never the write
   path. The sync engine drains the outbox when online/authenticated, with
   retry + backoff, and pulls remote rows down on login (multi-device /
   reinstall recovery). Missing env vars => app runs purely local, no errors.
   (Decision B: email+password, persistent session, auto-refresh.) */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { outboxAll, outboxClear, outboxBump, type EntityTable, type BaseRow } from "./db";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && anon
    ? createClient(url, anon, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    : null;

export function cloudConfigured(): boolean {
  return supabase !== null;
}

let syncing = false;
let timer: ReturnType<typeof setTimeout> | null = null;

/** Drain the outbox to Supabase. Safe to call any time; no-ops offline,
    unauthenticated, or unconfigured. Client-side UUIDs make upserts
    idempotent — double-submits can never create duplicate rows. */
export async function syncNow(): Promise<{ pushed: number; pending: number }> {
  if (!supabase || syncing) return { pushed: 0, pending: (await outboxAll()).length };
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) return { pushed: 0, pending: (await outboxAll()).length };

  syncing = true;
  let pushed = 0;
  try {
    const entries = await outboxAll();
    // Group by table for batched upserts.
    const byTable = new Map<EntityTable, typeof entries>();
    for (const e of entries) {
      const list = byTable.get(e.table) ?? [];
      list.push(e);
      byTable.set(e.table, list);
    }
    for (const [table, list] of byTable) {
      // Last write per row id wins.
      const latest = new Map<string, (typeof list)[number]>();
      for (const e of list) {
        const prev = latest.get(e.row.id);
        if (!prev || e.row.updated_at > prev.row.updated_at) latest.set(e.row.id, e);
      }
      const rows = [...latest.values()].map((e) => ({
        ...e.row,
        user_id: sess.session!.user.id,
      }));
      const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
      if (error) {
        for (const e of list) await outboxBump(e.key);
        scheduleRetry();
        continue;
      }
      await outboxClear(list.map((e) => e.key));
      pushed += rows.length;
    }
  } finally {
    syncing = false;
  }
  const pending = (await outboxAll()).length;
  if (pending > 0) scheduleRetry();
  return { pushed, pending };
}

function scheduleRetry(delayMs = 15_000) {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void syncNow();
  }, delayMs);
}

/** Pull every remote row into local storage (login / reinstall recovery).
    Remote rows do NOT re-enter the outbox — direct local writes. */
export async function pullAll(): Promise<number> {
  if (!supabase) return 0;
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) return 0;
  const tables: EntityTable[] = ["conversations", "primes", "audits", "weekly_reviews", "settings"];
  let total = 0;
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select("*");
    if (error || !data) continue;
    for (const row of data as BaseRow[]) {
      const { user_id: _omit, ...local } = row as BaseRow & { user_id?: string };
      await putQuiet(t, local as BaseRow);
      total += 1;
    }
  }
  return total;
}

/* Local write that bypasses the outbox (used only for rows that came FROM
   the server, so we don't bounce them straight back up). */
import { db, nowISO } from "./db";
async function putQuiet(table: EntityTable, row: BaseRow): Promise<void> {
  const d = await db();
  const existing = (await d.get(table, row.id)) as BaseRow | undefined;
  // Local newer wins (it's queued in the outbox and will overwrite remote).
  if (existing && existing.updated_at >= row.updated_at) return;
  row.updated_at = row.updated_at || nowISO();
  await d.put(table, row);
}

/** Wire up automatic syncing: on regaining connectivity, on app focus,
    and on auth state changes. Call once at startup. */
export function startSyncLoop(): void {
  if (!supabase) return;
  window.addEventListener("online", () => void syncNow());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void syncNow();
  });
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN") {
      void pullAll().then(() => void syncNow());
    }
  });
  void syncNow();
}
