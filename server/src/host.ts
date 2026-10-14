/* =====================================================================
   SHARED HOST CORE — one implementation of the demo host, two shells
   ---------------------------------------------------------------------
   Both ways of running this app outside the Muse runtime share
   everything in this file:

   - server/standalone.ts — a persistent Bun server (local dev / VPS):
     static client + POST /actions.
   - api/actions.ts — a Vercel Function (serverless): POST /actions
     only; Vercel serves the client statically.

   What lives here:

   - DATABASE (lazy, cached per process): if DATABASE_URL is set it is
     used verbatim (a remote Turso database is a `libsql://…` URL +
     DATABASE_AUTH_TOKEN; a `file:…` URL also works, which is how the
     local harness exercises this exact code path). If DATABASE_URL
     is unset, fall back to the local file database (DATABASE_PATH,
     default data/graded-vault.db) so `bun run start` behaves exactly
     as before. The driver pair is chosen per branch and loaded
     dynamically inside openDb() — see the comments there: the remote
     branch uses the pure-JS web builds (@libsql/client/web +
     drizzle-orm/libsql/web) so the Vercel function's module graph
     never touches the native `libsql` addon, and nothing
     database-related loads at module-init time at all.
   - SCHEMA: on first use, if the app's tables are absent, the drizzle
     migrations are applied from the embedded copy in
     ./migrations-data.ts (generated from drizzle/*.sql — see
     scripts/embed-migrations.mjs). A bookkeeping table records which
     files were applied, so warm invocations skip straight past, and
     a database previously migrated by drizzle's own migrator (the
     old standalone path) is detected by its tables and left alone.
     After the schema exists, the actions' own ensure* functions seed
     the demo data on first read — a brand-new database becomes the
     demo vault with no manual step.
   - CTX SHIM: the same honest demo-mode stubs the standalone server
     has always used (see makeCtx below). Identical on Vercel: live
     research / hunts / OCR stay stubbed and labeled, never faked.
   - ACTION DISPATCH: handleActionsRequest implements the client's
     {action, args} → {data} contract with the actions' own zod
     request/response validation, shared verbatim by both shells.
   ===================================================================== */

/* Driver imports are TYPE-ONLY here (erased at runtime): the actual
   createClient/drizzle implementations are loaded dynamically inside
   openDb(), per branch. Statically importing @libsql/client's Node
   entry would eagerly load its sqlite3 module, which statically
   imports the native `libsql` addon — if a serverless bundle fails
   to place that addon for the function's platform, the module dies
   at import time, before any handler code can report why. The web
   entry's Client type is used for the shared handle; both drivers'
   drizzle() return the same driver-core LibSQLDatabase class. */
import type { Client } from "@libsql/client/web";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Ctx } from "@hatch/space-sdk";
import * as schema from "./schema.js";
import { Actions } from "./actions.js";
import { MIGRATIONS } from "./migrations-data.js";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const DEMO_AGENT_ERROR =
  "Demo mode — live research is disabled in the demo build (background agents only exist inside the Muse runtime), so no research task was dispatched and no prices were re-checked.";
const DEMO_INFERENCE_ERROR =
  "Demo mode — AI inference is disabled in the demo build (vision OCR and listing extraction only exist inside the Muse runtime); nothing was inferred or extracted.";

/* ——— Database (lazy singleton; safe across warm invocations) ——— */

type Db = LibSQLDatabase<typeof schema>;

interface DbHandle {
  client: Client;
  db: Db;
  /** Human-readable description for logs (never includes the token). */
  description: string;
}

let handlePromise: Promise<DbHandle> | null = null;

/** Resolve (once per process) the database handle, schema included. */
export function getDb(): Promise<DbHandle> {
  if (!handlePromise) {
    handlePromise = openDb().catch((e) => {
      // Don't cache a failure — a later invocation may retry cleanly.
      handlePromise = null;
      throw e;
    });
  }
  return handlePromise;
}

async function openDb(): Promise<DbHandle> {
  const remoteUrl = process.env.DATABASE_URL;

  if (remoteUrl && !remoteUrl.startsWith("file:")) {
    /* REMOTE database (Turso, on Vercel): the WEB builds of
       @libsql/client and drizzle-orm. They are pure JavaScript —
       hrana over HTTPS/WSS plus fetch — and never import the native
       `libsql` addon (the Node builds do, eagerly: @libsql/client's
       Node entry statically imports its sqlite3 module, whose first
       line imports the addon). In a serverless bundle, an addon
       that wasn't traced/placed for the function's platform turns
       that import into a module-init crash — the function's plain
       500 with the cause visible nowhere. Loaded dynamically, like
       everything database-related here, so module init stays free
       of anything that can throw. */
    const { createClient } = await import("@libsql/client/web");
    const { drizzle } = await import("drizzle-orm/libsql/web");
    const client = createClient({
      url: remoteUrl,
      authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
    });
    const db = drizzle(client, { schema });
    await ensureSchema(client);
    return { client, db, description: "remote libsql database (DATABASE_URL)" };
  }

  /* LOCAL database (standalone server + local function harness): the
     Node builds, which support file: URLs through the native addon.
     Also loaded dynamically — on Vercel this branch is only reached
     with a file: DATABASE_URL, which the deployment never sets. */
  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  let url: string;
  let description: string;
  if (remoteUrl) {
    url = remoteUrl;
    description = `DATABASE_URL (${remoteUrl})`;
  } else {
    const dbPath = process.env.DATABASE_PATH
      ? resolve(ROOT, process.env.DATABASE_PATH)
      : join(ROOT, "data", "graded-vault.db");
    mkdirSync(dirname(dbPath), { recursive: true });
    url = `file:${dbPath}`;
    description = `local file database (${dbPath})`;
  }
  const nodeClient = createClient({ url });
  const db = drizzle(nodeClient, { schema });
  const client = nodeClient as unknown as Client;
  await ensureSchema(client);
  return { client, db, description };
}

/* ——— Schema: embedded migrations, applied only when absent ———
   Fast path: every table the app expects already exists → one query,
   no writes. This covers warm serverless invocations, pre-migrated
   Turso databases, and local DBs created by either this runner or
   drizzle's own migrator. */

const EXPECTED_TABLES = [
  "cards",
  "card_forecasts",
  "sales_evidence",
  "watchlist",
  "portfolio_snapshots",
  "scout_status",
  "scout_sweeps",
  "market_listings",
  "deal_feed",
  "price_sources",
  "deal_alerts",
  "pop_history",
  "paper_positions",
  "exit_drafts",
  "lineage_watch",
  "lineage_events",
  "committee_records",
  "refresh_logs",
  "watch_price_points",
  "scout_configs",
];

const BOOKKEEPING_TABLE = "__vault_embedded_migrations";
const ALREADY_EXISTS = /already exists|duplicate column/i;

async function ensureSchema(client: Client): Promise<void> {
  const rows = await client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table'",
  );
  const present = new Set(rows.rows.map((r) => String(r.name)));
  if (EXPECTED_TABLES.every((t) => present.has(t))) return;

  await client.execute(
    `CREATE TABLE IF NOT EXISTS ${BOOKKEEPING_TABLE} (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)`,
  );
  const appliedRows = await client.execute(`SELECT name FROM ${BOOKKEEPING_TABLE}`);
  const applied = new Set(appliedRows.rows.map((r) => String(r.name)));

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.name)) continue;
    const statements = migration.sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      try {
        await client.execute(stmt);
      } catch (e) {
        // Tolerate re-applying DDL over a partially-migrated database
        // (e.g. one created by drizzle's migrator without our
        // bookkeeping): the end state is the same schema.
        if (!ALREADY_EXISTS.test(e instanceof Error ? e.message : String(e))) throw e;
      }
    }
    await client.execute({
      sql: `INSERT OR IGNORE INTO ${BOOKKEEPING_TABLE} (name, applied_at) VALUES (?, ?)`,
      args: [migration.name, Date.now()],
    });
  }
}

/* ——— The ctx shim (demo mode — identical on every host) ——— */

const demoThrow = (what: string) => async (): Promise<never> => {
  throw new Error(`Demo mode — ${what} is unavailable in the demo build.`);
};

export function makeCtx(db: Db): Ctx {
  const ctx = {
    slug: "pokemon-card-dashboard",
    invocationId: crypto.randomUUID(),
    spaceDir: ROOT,
    // ctx.db is an accessor in the runtime (ctx.db<typeof schema>());
    // here it always returns the one drizzle instance for this host.
    db: () => db,
    viewer: {
      source: "local",
      authenticated: true,
      spaceSlug: "pokemon-card-dashboard",
      userId: "demo",
      ownerUserId: "demo",
      isOwner: true,
    },
    blobs: new Proxy(
      {},
      {
        get: () => demoThrow("blob storage"),
      },
    ),
    executePrivileged: demoThrow("privileged contracts"),
    agent: {
      // Honest failure, not a fake success: refreshPrices and
      // scoutSweep both surface a failed dispatch in their summaries.
      spawnTask: async () => ({ ok: false as const, error: DEMO_AGENT_ERROR }),
      send: async () => ({ ok: false as const, error: DEMO_AGENT_ERROR }),
      status: async (taskId: string) => ({ taskId, status: "not_found" as const }),
    },
    inference: {
      complete: async (): Promise<never> => {
        throw new Error(DEMO_INFERENCE_ERROR);
      },
    },
    tool: {
      // Zero results — never fabricated listings. Sweeps and liveness
      // checks treat "no results" as inconclusive, exactly as the
      // action code is written to handle.
      web_search: async () => ({ content: { results: [] } }),
      weather: demoThrow("the weather tool"),
      sports_data: demoThrow("the sports tool"),
      finance: demoThrow("the finance tool"),
      finance_ticker: demoThrow("the finance tool"),
      generate_media: demoThrow("media generation"),
    },
    emit: () => {},
    invalidateQueries: () => {},
  };
  return ctx as unknown as Ctx;
}

/* ——— POST /actions — the client's RPC contract ———
   Request:  { action: string, args: object, actionCallId?: string }
   Success:  200 { data: <response-schema-shaped result> }
   Failure:  4xx/5xx { error: string }                                */

interface ActionDef {
  request: { safeParse: (v: unknown) => { success: boolean; data?: unknown; error?: { message: string } } };
  response: { parse: (v: unknown) => unknown };
  handler: (ctx: Ctx, args: never) => Promise<unknown>;
}

export async function handleActionsRequest(req: Request, db: Db): Promise<Response> {
  let body: { action?: unknown; args?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "request body must be JSON {action, args}" }, { status: 400 });
  }
  const name = typeof body.action === "string" ? body.action : "";
  const def = (Actions as unknown as Record<string, ActionDef>)[name];
  if (!def || typeof def.handler !== "function") {
    return Response.json({ error: `unknown action: ${name || "(missing)"}` }, { status: 404 });
  }
  const parsed = def.request.safeParse(body.args ?? {});
  if (!parsed.success) {
    return Response.json({ error: `invalid args for ${name}: ${parsed.error?.message ?? "schema mismatch"}` }, { status: 400 });
  }
  try {
    const result = await def.handler(makeCtx(db), parsed.data as never);
    // Validate against the action's response schema, like the runtime
    // does, so shape drift fails loudly instead of corrupting the UI.
    return Response.json({ data: def.response.parse(result) });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[actions] ${name} failed: ${message}`);
    return Response.json({ error: `action ${name} error: ${message}` }, { status: 500 });
  }
}
