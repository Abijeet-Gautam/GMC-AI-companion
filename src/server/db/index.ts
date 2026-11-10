import { DatabaseSync } from "node:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  themes,
  type Leaf,
  type Theme,
  type TreeStats,
  type Reflection,
  type TreeSnapshot,
} from "@/lib/catalog";
const path = resolve(
  /* turbopackIgnore: true */ process.env.DATABASE_PATH ||
    "data/living-tree.sqlite",
);
mkdirSync(dirname(path), { recursive: true });
const globalDb = globalThis as unknown as { livingTreeDb?: DatabaseSync };
export const db = globalDb.livingTreeDb ?? new DatabaseSync(path);
globalDb.livingTreeDb = db;
db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS approved_leaves (
 id TEXT PRIMARY KEY, idempotency_key TEXT NOT NULL UNIQUE,
 category TEXT NOT NULL CHECK(category IN ('nature','innovation','education','community','wellbeing','culture')),
 leaf_message TEXT NOT NULL CHECK(length(leaf_message) BETWEEN 1 AND 100),
 chamber_id INTEGER NOT NULL CHECK(chamber_id BETWEEN 1 AND 4),
 chamber_reason TEXT NOT NULL, created_at TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'approved' CHECK(status IN ('approved','hidden')));
CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS audit_events (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL, leaf_id TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reflection_cache (id INTEGER PRIMARY KEY CHECK(id=1), body TEXT NOT NULL, mode TEXT NOT NULL, created_at TEXT NOT NULL, source_revision INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS metrics (key TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0);`);
const columns = db
  .prepare("PRAGMA table_info(approved_leaves)")
  .all()
  .map((row) => row.name);
for (const [column, definition] of [
  ["mode", "TEXT NOT NULL DEFAULT 'offline'"],
  ["is_demo", "INTEGER NOT NULL DEFAULT 0"],
  ["payload_hash", "TEXT NOT NULL DEFAULT ''"],
]) {
  if (!columns.includes(column))
    db.exec(`ALTER TABLE approved_leaves ADD COLUMN ${column} ${definition}`);
}
db.exec(
  "CREATE INDEX IF NOT EXISTS leaves_public_order ON approved_leaves(status,created_at DESC,id DESC)",
);
db.prepare(
  "INSERT OR IGNORE INTO app_meta(key,value) VALUES('revision','0')",
).run();
db.prepare(
  "INSERT OR IGNORE INTO app_meta(key,value) VALUES('session_secret',?)",
).run(randomBytes(32).toString("hex"));
export const sessionSecret = String(
  db.prepare("SELECT value FROM app_meta WHERE key='session_secret'").get()!
    .value,
);
export const publicFields =
  "id, category, leaf_message, chamber_id, chamber_reason, created_at, mode, is_demo";
function asLeaf(row: Record<string, unknown>): Leaf {
  return { ...row, is_demo: Boolean(row.is_demo) } as Leaf;
}
export function revision() {
  return Number(
    db.prepare("SELECT value FROM app_meta WHERE key='revision'").get()!.value,
  );
}
export function changed() {
  db.prepare(
    "UPDATE app_meta SET value=CAST(value AS INTEGER)+1 WHERE key='revision'",
  ).run();
  db.exec("DELETE FROM reflection_cache");
}
export function recordMetric(key: string) {
  db.prepare(
    "INSERT INTO metrics(key,count) VALUES(?,1) ON CONFLICT(key) DO UPDATE SET count=count+1",
  ).run(key);
}
export function transaction<T>(operation: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = operation();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
export function listLeaves(
  limit = 120,
  cursor?: { created_at: string; id: string },
): Leaf[] {
  const filter = cursor
    ? " AND (created_at < ? OR (created_at = ? AND id < ?))"
    : "";
  const params = cursor
    ? [cursor.created_at, cursor.created_at, cursor.id, limit]
    : [limit];
  return db
    .prepare(
      `SELECT ${publicFields} FROM approved_leaves WHERE status='approved'${filter} ORDER BY created_at DESC,id DESC LIMIT ?`,
    )
    .all(...params)
    .map(asLeaf);
}
export function getLeaf(id: string): Leaf | undefined {
  const row = db
    .prepare(
      `SELECT ${publicFields} FROM approved_leaves WHERE id=? AND status='approved'`,
    )
    .get(id);
  return row ? asLeaf(row) : undefined;
}
export function getByKey(key: string) {
  const row = db
    .prepare(
      `SELECT ${publicFields},payload_hash,status FROM approved_leaves WHERE idempotency_key=?`,
    )
    .get(key);
  return row
    ? {
        leaf: asLeaf(
          Object.fromEntries(
            Object.entries(row).filter(
              ([key]) => key !== "payload_hash" && key !== "status",
            ),
          ),
        ),
        hash: String(row.payload_hash),
        status: String(row.status),
      }
    : undefined;
}
export function insertLeaf(key: string, hash: string, leaf: Leaf) {
  return transaction(() => {
    const result = db
      .prepare(
        `INSERT OR IGNORE INTO approved_leaves(id,idempotency_key,category,leaf_message,chamber_id,chamber_reason,created_at,mode,is_demo,payload_hash) VALUES(?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        leaf.id,
        key,
        leaf.category,
        leaf.leaf_message,
        leaf.chamber_id,
        leaf.chamber_reason,
        leaf.created_at,
        leaf.mode,
        Number(leaf.is_demo),
        hash,
      );
    if (result.changes) {
      changed();
      recordMetric("accepted");
    }
    return getByKey(key)!;
  });
}
export function treeStats(): TreeStats {
  const counts = db
    .prepare(
      "SELECT category,count(*) AS count FROM approved_leaves WHERE status='approved' GROUP BY category",
    )
    .all();
  const categories = Object.fromEntries(
    themes.map((theme) => [
      theme.id,
      Number(counts.find((row) => row.category === theme.id)?.count || 0),
    ]),
  ) as Record<Theme, number>;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Thimphu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const row = db
    .prepare(
      "SELECT count(*) AS total,coalesce(sum(is_demo),0) AS demo,coalesce(sum(substr(datetime(created_at,'+6 hours'),1,10)=?),0) AS today FROM approved_leaves WHERE status='approved'",
    )
    .get(today)!;
  return {
    total: Number(row.total),
    demo: Number(row.demo),
    today: Number(row.today),
    categories,
  };
}
export function currentReflection(): Reflection | null {
  const row = db
    .prepare("SELECT body,mode,created_at FROM reflection_cache WHERE id=1")
    .get();
  return row ? (row as Reflection) : null;
}
export function saveReflection(reflection: Reflection, sourceRevision: number) {
  if (revision() !== sourceRevision) return false;
  db.prepare(
    "INSERT OR REPLACE INTO reflection_cache(id,body,mode,created_at,source_revision) VALUES(1,?,?,?,?)",
  ).run(
    reflection.body,
    reflection.mode,
    reflection.created_at,
    sourceRevision,
  );
  db.prepare(
    "UPDATE app_meta SET value=CAST(value AS INTEGER)+1 WHERE key='revision'",
  ).run();
  return true;
}
export function snapshot(): TreeSnapshot {
  const stats = treeStats();
  return {
    leaves: listLeaves(),
    total: stats.total,
    stats,
    reflection: currentReflection(),
    revision: revision(),
    serverTime: new Date().toISOString(),
  };
}
export function consumeRate(key: string, maximum: number, windowMs: number) {
  const now = Date.now();
  db.prepare("DELETE FROM rate_limits WHERE expires <= ?").run(now);
  db.prepare(
    "INSERT INTO rate_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1",
  ).run(key, now + windowMs);
  const row = db
    .prepare("SELECT count,expires FROM rate_limits WHERE key=?")
    .get(key)!;
  return {
    allowed: Number(row.count) <= maximum,
    retryAfter: Math.max(1, Math.ceil((Number(row.expires) - now) / 1000)),
  };
}
export function adminLeaves() {
  return db
    .prepare(
      `SELECT ${publicFields},status FROM approved_leaves ORDER BY created_at DESC,id DESC LIMIT 500`,
    )
    .all()
    .map((row) => ({ ...asLeaf(row), status: String(row.status) }));
}
export function setLeafStatus(id: string, status: "approved" | "hidden") {
  return transaction(() => {
    const result = db
      .prepare("UPDATE approved_leaves SET status=? WHERE id=? AND status<>?")
      .run(status, id, status);
    if (result.changes) {
      changed();
      db.prepare(
        "INSERT INTO audit_events(action,leaf_id,created_at) VALUES(?,?,?)",
      ).run(
        status === "hidden" ? "hide" : "restore",
        id,
        new Date().toISOString(),
      );
    }
    return Boolean(result.changes);
  });
}
export function seedDemo() {
  return transaction(() => {
    if (
      Number(
        db
          .prepare(
            "SELECT count(*) AS count FROM approved_leaves WHERE is_demo=1",
          )
          .get()!.count,
      )
    )
      return 0;
    for (let round = 0; round < 4; round++)
      for (const theme of themes) {
        const id = randomUUID();
        db.prepare(
          "INSERT INTO approved_leaves(id,idempotency_key,category,leaf_message,chamber_id,chamber_reason,created_at,mode,is_demo,payload_hash) VALUES(?,?,?,?,?,?,?,?,1,'demo')",
        ).run(
          id,
          id,
          theme.id,
          theme.message,
          theme.chamber,
          "An illustrative contribution for the hackathon demonstration.",
          new Date(
            Date.now() - (24 - round * 6 - themes.indexOf(theme)) * 60000,
          ).toISOString(),
          "offline",
        );
      }
    changed();
    db.prepare(
      "INSERT INTO audit_events(action,created_at) VALUES('seed_demo',?)",
    ).run(new Date().toISOString());
    return 24;
  });
}
export function clearDemo() {
  return transaction(() => {
    const count = db
      .prepare("DELETE FROM approved_leaves WHERE is_demo=1")
      .run().changes;
    changed();
    db.prepare(
      "INSERT INTO audit_events(action,created_at) VALUES('clear_demo',?)",
    ).run(new Date().toISOString());
    return Number(count);
  });
}
