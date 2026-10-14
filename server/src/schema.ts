import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const cards = sqliteTable("cards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  year: integer("year").notNull(),
  setName: text("set_name").notNull(),
  number: text("number").notNull(),
  grader: text("grader").notNull(),
  grade: text("grade").notNull(),
  cert: text("cert").notNull().unique(),
  vaultUsd: real("vault_usd"),
  checkedUsd: real("checked_usd"),
  /* Cost basis (Remedies pass 1, Oct 13, 2026 — audit remedy P0-3):
     what the owner actually paid, entered per card. NULL on every
     card until he records one — the vault CSV cost column was blank,
     so NOTHING is seeded and no allocation is ever invented. Drives
     the per-card unrealized P&L and the portfolio cost summary. */
  costBasisUsd: real("cost_basis_usd"),
  costNote: text("cost_note"),
  costDate: text("cost_date"),
  /* Card art (Glass Vault phase 1, Oct 13, 2026): the REAL card image
     for this exact printing, resolved per cert (see CARD_ART in
     actions.ts). NULL for the 7 Japanese prints with no verified image
     — actual card art or nothing, never a substitute printing and
     never generated art. */
  imageUrl: text("image_url"),
  advisorCall: text("advisor_call").notNull().default("HOLD"),
  advisorReason: text("advisor_reason").notNull().default(""),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("active"),
  soldPrice: real("sold_price"),
  soldDate: text("sold_date"),
  lastChecked: text("last_checked"),
  popInfo: text("pop_info"),
  era: text("era").notNull().default("Vintage"),
});

export const salesEvidence = sqliteTable("sales_evidence", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cardCert: text("card_cert").notNull(),
  saleDate: text("sale_date").notNull(),
  price: real("price").notNull(),
  source: text("source").notNull(),
  description: text("description").notNull(),
  // 1 = verified / sourced comp. 0 = UNVERIFIED seller-reported signal —
  // never used in headline values, verified averages, or chart series.
  verified: integer("verified").notNull().default(1),
});

export const watchlist = sqliteTable("watchlist", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("watch"),
  priceContext: text("price_context").notNull().default(""),
  thesis: text("thesis").notNull().default(""),
  actionRule: text("action_rule").notNull().default(""),
  lastChecked: text("last_checked"),
  status: text("status").notNull().default("Watching"),
  sortOrder: integer("sort_order").notNull().default(0),
  scoutId: text("scout_id"),
});

export const portfolioSnapshots = sqliteTable("portfolio_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  snapshotDate: text("snapshot_date").notNull(),
  totalUsd: real("total_usd").notNull(),
  pricedCount: integer("priced_count").notNull().default(0),
  note: text("note").notNull().default(""),
});

export const scoutStatus = sqliteTable("scout_status", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scoutId: text("scout_id").notNull().unique(),
  name: text("name").notNull(),
  pokemon: text("pokemon").notNull(),
  emoji: text("emoji").notNull(),
  territory: text("territory").notNull(),
  statusLine: text("status_line").notNull().default(""),
  lastChecked: text("last_checked"),
  findsCount: integer("finds_count").notNull().default(0),
  lastSweepAt: text("last_sweep_at"),
  lastSweepCandidates: integer("last_sweep_candidates").notNull().default(0),
  lastSweepFinds: integer("last_sweep_finds").notNull().default(0),
});

export const scoutSweeps = sqliteTable("scout_sweeps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scoutId: text("scout_id").notNull(),
  sweptAt: text("swept_at").notNull(),
  sourcesChecked: text("sources_checked").notNull().default(""),
  candidatesSeen: integer("candidates_seen").notNull().default(0),
  findsCount: integer("finds_count").notNull().default(0),
  tier1Count: integer("tier1_count").notNull().default(0),
  tier2Count: integer("tier2_count").notNull().default(0),
  note: text("note").notNull().default(""),
});

export const marketListings = sqliteTable("market_listings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  subjectKey: text("subject_key").notNull(),
  subjectName: text("subject_name").notNull(),
  gradeLabel: text("grade_label").notNull().default(""),
  askingUsd: real("asking_usd").notNull(),
  marketUsd: real("market_usd"),
  marketplace: text("marketplace").notNull().default(""),
  seller: text("seller"),
  shipsFrom: text("ships_from"),
  listingUrl: text("listing_url"),
  foundAt: text("found_at").notNull().default(""),
  lastSweptAt: text("last_swept_at"),
  scoutId: text("scout_id").notNull().default(""),
  passed: integer("passed").notNull().default(0),
  status: text("status").notNull().default("live"),
  prevAskingUsd: real("prev_asking_usd"),
  firstFoundAt: text("first_found_at"),
  // Liveness verification (never post an ended listing): the last time
  // this listing's page was checked and confirmed live/for sale. Ended
  // listings carry status='gone' plus ended_at / ended_reason and are
  // never returned as live listings.
  lastVerifiedLiveAt: text("last_verified_live_at"),
  endedAt: text("ended_at"),
  endedReason: text("ended_reason"),
  // Tightened liveness (Oct 9, 2026): consecutive INCONCLUSIVE checks
  // (bot-blocked / unreachable). 3+ in a row demotes the row to 'stale'
  // (out of every live surface); 72h with no positive proof retires it
  // to 'gone'. last_check_at = most recent check of any verdict.
  // ends_at = known auction/listing end (ISO) — a past end time is
  // positive evidence and expires the row without needing a page fetch.
  verifyMissStreak: integer("verify_miss_streak").notNull().default(0),
  lastCheckAt: text("last_check_at"),
  endsAt: text("ends_at"),
});

export const dealFeed = sqliteTable("deal_feed", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cardName: text("card_name").notNull(),
  gradeLabel: text("grade_label").notNull().default(""),
  askingUsd: real("asking_usd").notNull(),
  marketUsd: real("market_usd"),
  discountPct: real("discount_pct"),
  marketplace: text("marketplace").notNull().default(""),
  seller: text("seller"),
  listingUrl: text("listing_url"),
  foundAt: text("found_at").notNull().default(""),
  scoutId: text("scout_id").notNull().default(""),
  checkedDate: text("checked_date"),
  note: text("note").notNull().default(""),
  isExample: integer("is_example").notNull().default(0),
  // 1 = the owner passed on this suggested find — persisted hidden, rendered
  // nowhere, and never resurrected as an active suggestion on refresh.
  passed: integer("passed").notNull().default(0),
  // 1 = Tier 1 pinned deal (>=15% under verified comp, linked).
  // 2 = Tier 2 close / worth a look (8–15% under comp, or under a watchlist
  // max-buy, linked). 0 = sighting (no reachable link).
  tier: integer("tier").notNull().default(1),
  // Findings Ledger lifecycle: new | live | price_dropped | gone | bought | sighting
  status: text("status").notNull().default("new"),
  firstFoundAt: text("first_found_at"),
  lastSeenAt: text("last_seen_at"),
  prevAskingUsd: real("prev_asking_usd"),
  subjectKey: text("subject_key"),
  targetGroup: text("target_group").notNull().default(""),
  // Liveness verification (never post an ended listing): last time the
  // listing page was confirmed live/for sale; when it ends, status flips
  // to 'gone' with ended_at / ended_reason and it leaves every live
  // surface (pinned feed, Close tier, ledger-live, Market Terminal).
  lastVerifiedLiveAt: text("last_verified_live_at"),
  endedAt: text("ended_at"),
  endedReason: text("ended_reason"),
  // Same tightened-liveness bookkeeping as market_listings (see there).
  verifyMissStreak: integer("verify_miss_streak").notNull().default(0),
  lastCheckAt: text("last_check_at"),
  endsAt: text("ends_at"),
});

export const priceSources = sqliteTable("price_sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  sourceType: text("source_type").notNull().default(""),
  coverage: text("coverage").notNull().default(""),
  caveat: text("caveat").notNull().default(""),
  trustLevel: text("trust_level").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const dealAlerts = sqliteTable("deal_alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  alertType: text("alert_type").notNull().default("tier1_find"),
  cardName: text("card_name").notNull(),
  price: real("price"),
  discountPct: real("discount_pct"),
  listingUrl: text("listing_url"),
  payload: text("payload").notNull().default(""),
  status: text("status").notNull().default("pending_delivery"),
  createdAt: text("created_at").notNull().default(""),
});

export const popHistory = sqliteTable("pop_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cert: text("cert").notNull(),
  cardName: text("card_name").notNull().default(""),
  popTotal: integer("pop_total").notNull(),
  popGrade: integer("pop_grade"),
  recordedAt: text("recorded_at").notNull().default("2026-10-08"),
});

export const paperPositions = sqliteTable("paper_positions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scoutId: text("scout_id").notNull(),
  dealId: integer("deal_id"),
  cardName: text("card_name").notNull(),
  entryUsd: real("entry_usd").notNull(),
  marketUsd: real("market_usd"),
  sizeFactor: real("size_factor").notNull().default(1),
  status: text("status").notNull().default("open"),
  createdAt: text("created_at").notNull().default(""),
});

export const exitDrafts = sqliteTable("exit_drafts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cert: text("cert").notNull(),
  cardName: text("card_name").notNull().default(""),
  title: text("title").notNull().default(""),
  description: text("description").notNull().default(""),
  suggestedPrice: real("suggested_price"),
  priceSource: text("price_source").notNull().default(""),
  status: text("status").notNull().default("draft"),
  salePrice: real("sale_price"),
  feeEstimate: real("fee_estimate"),
  netUsd: real("net_usd"),
  soldDate: text("sold_date"),
  createdAt: text("created_at").notNull().default(""),
});

export const lineageWatch = sqliteTable("lineage_watch", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cert: text("cert").notNull().unique(),
  label: text("label").notNull().default(""),
  relation: text("relation").notNull().default("watched"),
  note: text("note").notNull().default(""),
  createdAt: text("created_at").notNull().default(""),
});

export const lineageEvents = sqliteTable("lineage_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cert: text("cert").notNull(),
  eventDate: text("event_date").notNull().default(""),
  eventType: text("event_type").notNull().default("appearance"),
  venue: text("venue").notNull().default(""),
  price: real("price"),
  sourceLabel: text("source_label").notNull().default(""),
  linkUrl: text("link_url"),
  verified: integer("verified").notNull().default(1),
  note: text("note").notNull().default(""),
});

/* Investment Committee records: one persisted verdict per qualifying
   find (Tier 1, or ask >= $150). Generated once from the data on file
   (bull = finding scout's comp case, bear = Team Rocket's red-team
   points, liquidity = Snorlax's volume ruling) and never regenerated,
   so verdicts can be graded against outcomes later. */
export const committeeRecords = sqliteTable("committee_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dealId: integer("deal_id").notNull().unique(),
  cardName: text("card_name").notNull().default(""),
  score: integer("score").notNull().default(0),
  verdict: text("verdict").notNull().default(""),
  bull: text("bull").notNull().default(""),
  bear: text("bear").notNull().default(""),
  liquidity: text("liquidity").notNull().default(""),
  rationale: text("rationale").notNull().default(""),
  createdAt: text("created_at").notNull().default(""),
});

/* Forecast Engine v1 (fc-v1): per-card value RANGES at 30/90/180 days,
   computed ONLY from verified sold comps (see isForecastComp in
   actions.ts — the verified flag plus the price_sources registry's
   source-type rules). Every issued forecast is logged at issuance and
   graded at its horizon; origin keeps live and backtest records apart
   forever — the track record is always reported separately, never
   blended. regime is 'pump_suspended' only on rows that record a
   suspension decision context; suspended cards get NO forecast rows —
   their state is derived at read time from pumpFor(). */
export const cardForecasts = sqliteTable("card_forecasts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cert: text("cert").notNull(),
  issuedAt: text("issued_at").notNull(),
  horizonDays: integer("horizon_days").notNull(),
  rangeLow: real("range_low").notNull(),
  rangeHigh: real("range_high").notNull(),
  midpoint: real("midpoint").notNull(),
  confidence: text("confidence", { enum: ["A", "B", "C"] }).notNull(),
  basisN: integer("basis_n").notNull().default(0),
  basisLastSale: text("basis_last_sale").notNull().default(""),
  liquidity: text("liquidity", { enum: ["deep", "moderate", "thin"] }).notNull().default("thin"),
  regime: text("regime", { enum: ["normal", "pump_suspended"] }).notNull().default("normal"),
  modelVersion: text("model_version").notNull().default("fc-v1"),
  origin: text("origin", { enum: ["live", "backtest"] }).notNull().default("live"),
  /* status: "superseded" (Remedies pass 1, Oct 13, 2026) marks a
     forecast retired because its evidence basis was corrected — it is
     excluded from every track-record statistic (neither hit nor
     miss) and never blocks re-issuance. The SQL column carries no
     CHECK constraint (see migration 0015), so this TS enum is the
     only change the new value needs. */
  status: text("status", { enum: ["open", "graded", "superseded"] }).notNull().default("open"),
  realizedValue: real("realized_value"),
  inRange: integer("in_range"),
  gradedAt: text("graded_at"),
});

export const refreshLogs = sqliteTable("refresh_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ranAt: integer("ran_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  summary: text("summary").notNull(),
  cardsChecked: integer("cards_checked").notNull().default(0),
});
