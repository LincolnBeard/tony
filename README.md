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
  drizzle migrations from `drizzle/`. Delete the file to reset to the
  pristine demo seed.
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

The standalone server is a single long-lived Bun process with a local
SQLite file, so any host that runs a persistent process with a disk
(a VPS, Fly.io, Render, a container host) can serve it as-is:
`bun install && bun run start`, with `PORT` set by the host.

**Serverless caveat:** hosts like Vercel run short-lived functions
with no persistent local disk, so the file-backed SQLite database
does not survive there. (The client bundle alone *can* be hosted as
static files, but the actions need the server.) To deploy on
serverless, point the database at a hosted libsql/Turso database
(`@libsql/client` accepts a remote `libsql://` URL with an auth
token — `server/standalone.ts` is the one place to wire that in) or
port the data layer to hosted Postgres. The demo-mode stubs above
apply on any host: live research, hunts, and OCR need real
search/agent/inference services behind the same `ctx` seams.

## Layout

- `client/` — React 19 + Recharts + Tailwind 4 single-page app
  (`client/src/App.tsx`), vaporwave light/dark themes that follow the
  OS setting, WCAG 2.1 AA target. `client/build-standalone.mjs` builds
  it outside the Muse runtime; `client/build.mjs` is the runtime's
  own build shim.
- `server/` — Bun server actions + Drizzle schema, plus
  `server/standalone.ts`, the standalone demo host (local DB, action
  HTTP endpoint, static client, demo-mode `ctx` stubs).
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
