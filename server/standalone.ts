/* =====================================================================
   STANDALONE DEMO SERVER — runs this app outside the Muse space runtime
   ---------------------------------------------------------------------
   In its home environment the app is hosted by the Muse runtime,
   which serves client/dist/ and dispatches server/src/actions.ts with
   a runtime context (`ctx`): a hosted database, background research
   agents, managed web search, and vision inference.

   This file is the persistent-process shell of the demo host. All of
   the actual hosting logic — database setup, the demo-mode ctx shim,
   and the POST /actions dispatcher — lives in server/src/host.ts and
   is SHARED with the Vercel Function shell (api/actions.ts), so the
   two hosts can never drift. What remains here is only what a
   long-lived Bun server adds: eager database open at boot, static
   serving of the built client, and Bun.serve.

   - REAL: a local SQLite database (libsql file) created from the
     drizzle/ migrations (embedded copy — see server/src/host.ts),
     the full action layer in server/src/actions.ts served over
     POST /actions (the exact {action, args} → {data} contract the
     client in client/src/api.ts speaks), and static serving of the
     built client. getPortfolio and every local write action
     (pass / keep / closed-ended / drafts / lineage …) work against
     the local DB, seeded with the demo collection.

   - STUBBED (DEMO MODE): the runtime-only services are replaced with
     clearly-labeled no-ops in server/src/host.ts —
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
                 DATABASE_URL / DATABASE_AUTH_TOKEN, when set, take
                 precedence and point the same server at a remote
                 libsql (Turso) database instead of the local file.
   ===================================================================== */

import { existsSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import { ROOT, getDb, handleActionsRequest } from "./src/host.js";

const CLIENT_DIST = join(ROOT, "client", "dist");
const PORT = Number(process.env.PORT ?? 4173);

/* Eagerly open + migrate the database at boot (fail fast), exactly as
   the pre-refactor server did; the shared getter caches the handle. */
const { db, description } = await getDb();

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
      return handleActionsRequest(req, db);
    }
    if (req.method === "GET" || req.method === "HEAD") return serveStatic(url.pathname);
    return new Response("Method Not Allowed", { status: 405 });
  },
});

console.log(`The Graded Vault — standalone DEMO server`);
console.log(`  → http://localhost:${server.port}`);
console.log(`  → database: ${description} (drizzle migrations applied from drizzle/, embedded copy)`);
console.log(`  → DEMO MODE: live price research, scout web hunts, listing liveness search cross-checks,`);
console.log(`     and slab-photo OCR are stubbed off — local reads/writes on the seeded demo data are real.`);
