/* =====================================================================
   STANDALONE DEMO SERVER — runs this app outside the Muse space runtime
   ---------------------------------------------------------------------
   In its home environment the app is hosted by the Muse runtime,
   which serves client/dist/ and dispatches server/src/actions.ts with
   a runtime context (`ctx`): a hosted database, background research
   agents, managed web search, and vision inference.

   This file is a small, honest replacement host for DEMO purposes:

   - REAL: a local SQLite database (libsql file) created from the
     drizzle/ migrations, the full action layer in server/src/actions.ts
     served over POST /actions (the exact {action, args} → {data}
     contract the client in client/src/api.ts speaks), and static
     serving of the built client. getPortfolio and every local write
     action (pass / keep / closed-ended / drafts / lineage …) work
     against the local DB, seeded with the demo collection.

   - STUBBED (DEMO MODE): the runtime-only services are replaced with
     clearly-labeled no-ops —
       · ctx.agent.spawnTask / send → returns { ok: false } with a
         "demo mode" error, so refreshPrices logs an honest
         "research dispatch FAILED — demo mode" line instead of
         pretending prices were re-checked.
       · ctx.tool.web_search → returns zero results, so scoutSweep
         runs its full local pipeline (liveness bookkeeping, sweep
         logs) but finds no live listings, and liveness cross-checks
         come back inconclusive rather than fabricating proof.
       · ctx.inference.complete → throws a demo-mode error, so
         scanSlabPhoto reports the photo "couldn't be read" (its QR /
         manual-cert paths still work against local data).
       · ctx.invalidateQueries / ctx.emit → no-ops (single-process
         server; the client refetches after its own mutations).
       · ctx.blobs / executePrivileged → throw demo-mode errors
         (unused by this app's actions).

   Run it with:  bun run start        (see package.json / README)
   Config:       PORT (default 4173), DATABASE_PATH (default
                 data/graded-vault.db, relative to the repo root).
   ===================================================================== */

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { Ctx } from "@hatch/space-sdk";
import * as schema from "./src/schema";
import { Actions } from "./src/actions";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLIENT_DIST = join(ROOT, "client", "dist");
const MIGRATIONS_DIR = join(ROOT, "drizzle");
const PORT = Number(process.env.PORT ?? 4173);
const DB_PATH = process.env.DATABASE_PATH
  ? resolve(ROOT, process.env.DATABASE_PATH)
  : join(ROOT, "data", "graded-vault.db");

const DEMO_AGENT_ERROR =
  "Demo mode — live research is disabled in the standalone demo build (background agents only exist inside the Muse runtime), so no research task was dispatched and no prices were re-checked.";
const DEMO_INFERENCE_ERROR =
  "Demo mode — AI inference is disabled in the standalone demo build (vision OCR and listing extraction only exist inside the Muse runtime); nothing was inferred or extracted.";

/* ——— Database: local libsql file + the shipped drizzle migrations ——— */
mkdirSync(dirname(DB_PATH), { recursive: true });
const client = createClient({ url: `file:${DB_PATH}` });
const db = drizzle(client, { schema });
await migrate(db, { migrationsFolder: MIGRATIONS_DIR });

/* ——— The ctx shim ——— */
const demoThrow = (what: string) => async (): Promise<never> => {
  throw new Error(`Demo mode — ${what} is unavailable in the standalone demo build.`);
};

function makeCtx(): Ctx {
  const ctx = {
    slug: "pokemon-card-dashboard",
    invocationId: crypto.randomUUID(),
    spaceDir: ROOT,
    // ctx.db is an accessor in the runtime (ctx.db<typeof schema>());
    // here it always returns the one local drizzle instance.
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
async function handleAction(req: Request): Promise<Response> {
  let body: { action?: unknown; args?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "request body must be JSON {action, args}" }, { status: 400 });
  }
  const name = typeof body.action === "string" ? body.action : "";
  const def = (Actions as unknown as Record<string, {
    request: { safeParse: (v: unknown) => { success: boolean; data?: unknown; error?: { message: string } } };
    response: { parse: (v: unknown) => unknown };
    handler: (ctx: Ctx, args: never) => Promise<unknown>;
  }>)[name];
  if (!def || typeof def.handler !== "function") {
    return Response.json({ error: `unknown action: ${name || "(missing)"}` }, { status: 404 });
  }
  const parsed = def.request.safeParse(body.args ?? {});
  if (!parsed.success) {
    return Response.json({ error: `invalid args for ${name}: ${parsed.error?.message ?? "schema mismatch"}` }, { status: 400 });
  }
  try {
    const result = await def.handler(makeCtx(), parsed.data as never);
    // Validate against the action's response schema, like the runtime
    // does, so shape drift fails loudly instead of corrupting the UI.
    return Response.json({ data: def.response.parse(result) });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[actions] ${name} failed: ${message}`);
    return Response.json({ error: `action ${name} error: ${message}` }, { status: 500 });
  }
}

/* ——— Static client ——— */
function serveStatic(pathname: string): Response {
  const distIndex = join(CLIENT_DIST, "index.html");
  if (!existsSync(distIndex)) {
    return new Response(
      "Client not built yet. Run `bun run build:client:standalone` (or `bun run start`, which builds it) and reload.",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }
  const rel = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
  const filePath = resolve(CLIENT_DIST, rel);
  if (filePath.startsWith(CLIENT_DIST + sep) && existsSync(filePath) && extname(filePath)) {
    return new Response(Bun.file(filePath));
  }
  // SPA fallback: extensionless paths get the app shell. The client
  // resolves its API endpoint as ./actions relative to the page URL,
  // and the app lives at /, so deep links still land on /actions.
  return new Response(Bun.file(distIndex), { headers: { "content-type": "text/html; charset=utf-8" } });
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/actions") {
      if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
      return handleAction(req);
    }
    if (req.method === "GET" || req.method === "HEAD") return serveStatic(url.pathname);
    return new Response("Method Not Allowed", { status: 405 });
  },
});

console.log(`The Graded Vault — standalone DEMO server`);
console.log(`  → http://localhost:${server.port}`);
console.log(`  → database: ${DB_PATH} (drizzle migrations applied from ${MIGRATIONS_DIR})`);
console.log(`  → DEMO MODE: live price research, scout web hunts, listing liveness search cross-checks,`);
console.log(`     and slab-photo OCR are stubbed off — local reads/writes on the seeded demo data are real.`);
