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

## Running it locally

Requirements: [Bun](https://bun.sh) 1.3+.

```sh
bun install          # installs deps; the Muse space SDK is vendored at vendor/space-sdk.tgz
bun run typecheck    # passes (client + server)
bun run build:server # passes — bundles server/src/actions.ts to server/dist/actions.js
```

(`bun run build` also invokes `build:client`, but the SDK's client
builder only runs inside the Muse runtime — by design it refuses
manual builds outside it and points at the runtime's own build step,
which is what produces `client/dist/` in the live deployment.)

There is **no standalone `start` script**: in its home environment the
app is hosted by the Muse space runtime, which serves
`client/dist/index.html` and dispatches the server actions in
`server/src/actions.ts` with a runtime context (`ctx`). The build and
typecheck above pass outside that runtime, but actually serving the app
requires the runtime (or re-hosting the actions behind your own HTTP
layer).

### Runtime dependencies that only exist inside Muse

Several features call Muse runtime services through `ctx` and will
not work in a plain clone:

- `ctx.db` — the app's SQLite database (Drizzle schema in
  `server/src/schema.ts`, migrations in `drizzle/`). The schema ships
  empty; the seed data is applied idempotently by the server actions on
  first read (`ensure*` functions in `server/src/actions.ts`).
- `ctx.agent.spawnTask` — the daily price-refresh research agent and
  the scouts' background deep hunts.
- `ctx.tool.web_search` — listing liveness verification and search
  cross-checks.
- `ctx.inference` — the Show Mode slab scanner (photo → cert/OCR read;
  photos are processed in memory only and never saved).
- Managed cron jobs (`space.json`): a daily price refresh
  (`pokemon-card-dashboard-daily-refresh`) and a scout sweep every
  2 hours (`pokemon-scout-sweep-2h`).

## Layout

- `client/` — React 19 + Recharts + Tailwind 4 single-page app
  (`client/src/App.tsx`), vaporwave light/dark themes that follow the
  OS setting, WCAG 2.1 AA target.
- `server/` — Bun server actions + Drizzle schema.
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
