/* Local-first storage. THE write path: every entity write goes to IndexedDB
   first (instant, offline-safe), and an outbox entry queues it for background
   sync to Supabase. The app never blocks on the network. (Decisions A + D.)

   Entities (locked five-entity model, no stored aggregates):
   - conversations  : one row per logged rep
   - primes         : pre-conversation intention (Prime)
   - audits         : evening audit
   - weekly_reviews : weekly aggregate confirm-or-adjust
   - settings       : single-row app settings (phase, start date, reminders)
*/
import { openDB, type IDBPDatabase } from "idb";

export type EntityTable =
  | "conversations"
  | "primes"
  | "audits"
  | "weekly_reviews"
  | "settings";

export interface BaseRow {
  id: string; // uuid, generated client-side => idempotent sync upserts
  created_at: string; // ISO
  updated_at: string; // ISO
  [key: string]: unknown;
}

export interface OutboxEntry {
  key: string; // `${table}:${id}:${updated_at}` => naturally deduped
  table: EntityTable;
  row: BaseRow;
  queued_at: string;
  attempts: number;
}

const DB_NAME = "closeness";
const DB_VERSION = 1;
const TABLES: EntityTable[] = [
  "conversations",
  "primes",
  "audits",
  "weekly_reviews",
  "settings",
];

let dbPromise: Promise<IDBPDatabase> | null = null;

export function db(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(d) {
        for (const t of TABLES) {
          if (!d.objectStoreNames.contains(t)) {
            const store = d.createObjectStore(t, { keyPath: "id" });
            store.createIndex("created_at", "created_at");
          }
        }
        if (!d.objectStoreNames.contains("outbox")) {
          d.createObjectStore("outbox", { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

export function uuid(): string {
  return crypto.randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}

/** Best-effort protection against iOS storage eviction. Supplements cloud
    sync; never a substitute for it. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage && navigator.storage.persist) {
      return await navigator.storage.persist();
    }
  } catch {
    /* unsupported */
  }
  return false;
}

/** THE write. Local first, then queued for sync. Never throws on network. */
export async function put(table: EntityTable, row: BaseRow): Promise<BaseRow> {
  const d = await db();
  row.updated_at = nowISO();
  const tx = d.transaction([table, "outbox"], "readwrite");
  await tx.objectStore(table).put(row);
  const entry: OutboxEntry = {
    key: `${table}:${row.id}:${row.updated_at}`,
    table,
    row,
    queued_at: nowISO(),
    attempts: 0,
  };
  await tx.objectStore("outbox").put(entry);
  await tx.done;
  notifyOutboxChanged();
  return row;
}

export async function get(table: EntityTable, id: string): Promise<BaseRow | undefined> {
  return (await db()).get(table, id) as Promise<BaseRow | undefined>;
}

export async function all(table: EntityTable): Promise<BaseRow[]> {
  return (await db()).getAll(table) as Promise<BaseRow[]>;
}

export async function remove(table: EntityTable, id: string): Promise<void> {
  // Soft delete: keeps sync simple + reversible. Row carries deleted flag.
  const existing = await get(table, id);
  if (existing) {
    existing.deleted = true;
    await put(table, existing);
  }
}

export async function outboxAll(): Promise<OutboxEntry[]> {
  return (await db()).getAll("outbox") as Promise<OutboxEntry[]>;
}

export async function outboxClear(keys: string[]): Promise<void> {
  const d = await db();
  const tx = d.transaction("outbox", "readwrite");
  for (const k of keys) await tx.store.delete(k);
  await tx.done;
  notifyOutboxChanged();
}

export async function outboxBump(key: string): Promise<void> {
  const d = await db();
  const e = (await d.get("outbox", key)) as OutboxEntry | undefined;
  if (e) {
    e.attempts += 1;
    await d.put("outbox", e);
  }
}

/* Tiny event bus so the UI can show pending-sync state without polling. */
type Listener = () => void;
const listeners = new Set<Listener>();
export function onOutboxChanged(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notifyOutboxChanged() {
  for (const fn of listeners) fn();
}

/** Full JSON backup of every entity. The third copy. */
export async function exportAll(): Promise<string> {
  const dump: Record<string, BaseRow[]> = {};
  for (const t of TABLES) dump[t] = await all(t);
  return JSON.stringify({ exported_at: nowISO(), version: 1, data: dump }, null, 2);
}

/** Restore from a JSON backup. Confirm-before-overwrite happens in the UI. */
export async function importAll(json: string): Promise<{ tables: number; rows: number }> {
  const parsed = JSON.parse(json) as { data: Record<string, BaseRow[]> };
  let rows = 0;
  let tables = 0;
  for (const t of TABLES) {
    const incoming = parsed.data[t];
    if (!Array.isArray(incoming)) continue;
    tables += 1;
    for (const row of incoming) {
      if (row && typeof row.id === "string") {
        await put(t, row);
        rows += 1;
      }
    }
  }
  return { tables, rows };
}
