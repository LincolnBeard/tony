# The Graded Vault — Pokémon Card Portfolio Dashboard

A private trading-desk dashboard for a graded Pokémon card collection:
portfolio valuation from verified sold comps, per-card detail pages with
sales evidence and Hold / Sell / Trim calls, a scout team that sweeps
marketplaces for under-market listings, a findings ledger with strict
liveness rules, a market terminal that prices every listing against its
card's market value, slab lineage tracking, and a pixel-art town the
scouts wander.

This repository is the **public demo export** of a private, single-owner
app. It ships with **demo/sample data only** (see below). The live
version's collection data is private and is not included anywhere in
this repo — there is no database file, and the seed data in code is the
invented demo set described below.

## Demo data

On a fresh boot the app seeds itself with a small, clearly fake sample
collection (`server/src/actions.ts`, the `SEED` constant, headed
"DEMO SAMPLE DATA"):

- 12 well-known cards (Base Set Charizard, Neo Genesis Lugia, Moonbreon,
  151 Charizard ex, …) with invented cert numbers (`DEMO-1001`, …) and
  plausible sample prices — portfolio total $20,300.
- A few labeled sample sales records, one labeled unverified sale, one
  demo sold card and one demo traded card (trade history view).
- Four portfolio snapshots (Sep–Oct 2026) so the growth chart renders.
- A small demo watchlist (mid-era / vintage theses, silver-border World
  Championship targets), demo price-source registry, demo scout
  statuses, and sample pop records.

No real collection, cert numbers, prices, or trade history from the
private deployment are included.

## Run it standalone

Requirements: [Bun](https://bun.sh) 1.3+.

```sh
bun install   # installs deps; the Muse space SDK is vendored at vendor/space-sdk.tgz
bun run start # builds the client if needed, migrates + seeds a local DB, serves everything
```

Then open **http://localhost:4173**.

What `bun run start` does (`server/standalone.ts`):

- Creates a local SQLite database (default `data/graded-vault.db`,
  override with `DATABASE_PATH`; see `.env.example`) and applies the
  drizzle migrations (from the embedded copy of `drizzle/*.sql` — see
  Deploying → Vercel for why). Delete the file to reset to the
  pristine demo seed. Set `DATABASE_URL` + `DATABASE_AUTH_TOKEN`
  instead to point this same server at a remote libsql (Turso)
  database.
- Serves the React client from `client/dist/` (built on demand by
  `client/build-standalone.mjs`, a direct Bun.build of the client with
  the canonical production configuration — the SDK's own client
  builder only runs inside the Muse runtime, by design, so this
  export builds the same bundle without it).
- Answers the client's action calls at `POST /actions` with the real
  action layer (`server/src/actions.ts`), request/response validated
  against the actions' own zod schemas.

Other scripts:

```sh
bun run dev                  # rebuild client + serve with --watch on the server
bun run build:client:standalone  # client bundle only
bun run build:server         # bundle the action layer (not needed by start)
bun run typecheck            # passes (client + server)
```

No client code changes were needed for standalone mode: the client
already speaks same-origin `POST ./actions` with a `{action, args}`
body and a `{data}` response, which is exactly what the standalone
server implements. The one substitution is server-side: where the
Muse runtime injects its hosted `ctx` (database, agents, search,
inference), `server/standalone.ts` injects a local shim — a real
database, and honest stubs for the rest (below).

## Demo mode — what's live, what's stubbed

The standalone build runs in a clearly-labeled **demo mode**. The
database and every local interaction are real; only the services that
exist solely inside the Muse runtime are stubbed, and each stub is
designed to fail *honestly* rather than fake a result:

**Live (real, against the local DB):**

- Portfolio reads (`getPortfolio`) — totals, cards, sales evidence,
  watchlist, snapshots/growth chart, ledger, terminal, lineage.
- All local writes: Pass on deals/listings, Closed / Ended
  (owner-terminal), card value edits, watchlist updates, exit drafts,
  lineage watches/events — persisted in the local SQLite file.
- The demo seed itself (applied idempotently by the actions on first
  read, the `ensure*` functions in `server/src/actions.ts`).

**Stubbed (demo mode):**

- **Live price research** (`ctx.agent.spawnTask`) — the daily-refresh
  research agent doesn't exist outside Muse. `refreshPrices` still
  runs its local bookkeeping (snapshot, logs) and reports, in its own
  summary, that the research dispatch failed because demo mode is on —
  prices are *not* silently treated as refreshed.
- **Scout web hunts** (`ctx.tool.web_search` + extraction) — web
  search returns zero results and AI extraction is off, so
  `scoutSweep` runs its pipeline and logs that the hunt could not
  complete in demo mode instead of inventing listings. Liveness
  cross-checks likewise come back inconclusive, never fabricated.
- **Slab photo OCR** (`ctx.inference`) — Show Mode's photo read
  reports the photo "couldn't be read"; its QR-decode and manual cert
  lookup paths still work against local data.
- **Scheduled jobs** — the managed crons in `space.json` (daily
  refresh, 2-hourly sweep) belong to the Muse runtime. Standalone,
  refresh/sweep only happen when triggered from the UI.
- **Cross-client invalidation** (`ctx.invalidateQueries`) — a no-op;
  the page refetches after its own actions as usual.

## Deploying

### A persistent-process host (VPS, Fly.io, Render, a container)

The standalone server is a single long-lived Bun process with a local
SQLite file: `bun install && bun run start`, with `PORT` set by the
host. Done — nothing else in this section applies.

### Vercel (free Hobby tier) + Turso (free tier)

Vercel runs short-lived functions with **no persistent process and no
durable local disk**, so the file-backed database can't live there.
This repo is wired for the serverless shape instead:

- **Client** → static files. Vercel runs
  `bun ./client/build-standalone.mjs` (see `vercel.json`) and serves
  `client/dist/`.
- **`POST /actions`** → the Vercel Function in `api/actions.ts`
  (a rewrite in `vercel.json` maps `/actions` → `/api/actions`;
  SPA deep links fall back to `index.html`).
- **Database** → a **remote libsql database on Turso**, reached via
  two environment variables. The function and the standalone server
  share all hosting logic (`server/src/host.ts`): the DB connection
  is opened lazily and cached per warm instance, the drizzle
  migrations are applied **only if the tables are absent** (from the
  embedded copy in `server/src/migrations-data.ts`, generated from
  `drizzle/*.sql` by `scripts/embed-migrations.mjs`), and the
  actions' `ensure*` seed functions then create the demo vault on
  first read. A brand-new empty Turso database needs **no manual
  setup** — the first page load builds and seeds it.
- **Runtime** → `"bunVersion": "1.x"` in `vercel.json` makes Vercel
  run the function on its **Bun runtime** (currently public beta) in
  place of Node.js. This stack is Bun-native end to end (Bun package
  manager, Bun.build client bundle, `@libsql/client` over
  HTTPS/WSS), so Bun is the runtime the code is developed and tested
  against. If the beta runtime ever misbehaves, delete the
  `bunVersion` line: the function is a Web-standard fetch handler and
  runs unchanged on Vercel's Node.js runtime.

**Step 1 — create the free Turso database** (dashboard only, no CLI):

1. Sign in at [turso.tech](https://turso.tech) → **Databases** →
   **Create Database**. Name it (e.g. `graded-vault-demo`), pick the
   group/location nearest your Vercel region, create.
2. Open the new database → **Connect** (or the **⋯** menu) →
   **Create Token** — a read/write token with no expiry is fine for a
   demo. Copy the two values it shows you:
   - the database URL, shaped `libsql://<db-name>-<org>.turso.io`
   - the auth token (shown once — copy it now)

**Step 2 — import the repo into Vercel:**

1. [vercel.com](https://vercel.com) → **Add New → Project** → import
   this GitHub repository. Root directory: the repo root (default).
2. Vercel reads `vercel.json`, so framework/build/output settings are
   already correct — don't override them.
3. Before deploying, open **Environment Variables** and add:
   - `DATABASE_URL` = the `libsql://…` URL from step 1
   - `DATABASE_AUTH_TOKEN` = the token from step 1
4. **Deploy.** First load is a cold start: the function creates the
   schema and seeds the demo vault (a few seconds), after which the
   dashboard behaves exactly like the local demo — including the
   demo-mode stubs: **live research, scout hunts, and slab OCR stay
   stubbed and labeled on Vercel too.** To reset the demo data,
   delete the Turso database and create a fresh one (updating the two
   env vars), or clear its tables — the next cold start rebuilds it.

**Free-tier notes:** Hobby functions default to a 10s timeout; the
function asks for 60s (the Hobby cap, and what a seeding cold start
may need). Hobby also pauses nothing and charges nothing at demo
traffic levels; Turso's free tier is far larger than this demo will
ever use. Scheduled jobs (the Muse runtime's crons in `space.json`)
do not exist on Vercel — refresh/sweep still only happen from the UI.

## Layout

- `client/` — React 19 + Recharts + Tailwind 4 single-page app
  (`client/src/App.tsx`), vaporwave light/dark themes that follow the
  OS setting, WCAG 2.1 AA target. `client/build-standalone.mjs` builds
  it outside the Muse runtime; `client/build.mjs` is the runtime's
  own build shim.
- `server/` — Bun server actions + Drizzle schema, plus
  `server/standalone.ts`, the persistent-process demo host (static
  client + action endpoint). Everything a host needs beyond its own
  process model — database, schema, demo-mode `ctx` stubs, action
  dispatch — lives in `server/src/host.ts`, shared by both hosts.
- `api/` — the Vercel Function shell (`api/actions.ts`): a thin
  fetch handler over `server/src/host.ts`. See Deploying → Vercel.
- `scripts/` — `embed-migrations.mjs`, which regenerates
  `server/src/migrations-data.ts` from `drizzle/*.sql`
  (`bun run embed:migrations`).
- `drizzle/` — SQL migrations (schema only, no data).
- `vendor/` — the vendored `@hatch/space-sdk` tarball (referenced by
  `package.json` as a `file:` dependency so installs work anywhere).

## Notes

- `app.db` (the live database) is deliberately excluded and covered by
  `.gitignore`, along with `node_modules`, build output, and `.env`.
- Internal planning docs from the private build (`DATA-PLAN.md`,
  `AGENTS.md`) are not part of this export.
- Prices in the demo seed are illustrative. In the live app every price
  is labeled by source type — verified sold comp, active listing/ask,
  aggregator value, or seller-reported/unverified — and unverified or
  single-source prints never set official values.
