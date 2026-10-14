import { defineAction, z, type ActionsModule, type Ctx } from "@hatch/space-sdk";
import { asc, desc, eq } from "drizzle-orm";
import * as schema from "./schema.js";

/* =====================================================================
   DEMO SEED DATA — SAMPLE / ILLUSTRATIVE ONLY
   ---------------------------------------------------------------------
   This export ships with a fictional sample collection so the dashboard
   renders fully out of the box: well-known cards, INVENTED cert numbers
   (every cert is prefixed "DEMO-" and belongs to no real slab), and
   plausible-but-illustrative prices and sales records. None of this is
   real collection data, no real cert is referenced, and no sale below
   actually happened. The private deployment's real seed lives only in
   its own database and is never committed.
   ===================================================================== */

type SeedCard = {
  name: string; year: number; setName: string; number: string; grader: string; grade: string; cert: string;
  vaultUsd: number | null; checkedUsd: number | null; effectiveUsd: number | null;
  advisorCall: string; advisorReason: string; notes: string; era: string; popInfo: string | null; lastChecked: string | null;
};

const SEED: SeedCard[] = [
  { name:"Lugia-Holo", year:2000, setName:"Neo Genesis", number:"9", grader:"PSA", grade:"10", cert:"DEMO-1001", vaultUsd:4200, checkedUsd:4500, effectiveUsd:4500, advisorCall:"HOLD", advisorReason:"Demo advisor note: iconic Neo Genesis chase in the top grade — the anchor position of this sample portfolio. Recent demo comps support the checked level.", notes:"Demo data — sample card with an invented cert number.", era:"Vintage", popInfo:"PSA pop 1,850 total (demo figure)", lastChecked:"2026-09-28" },
  { name:"Charizard-Holo", year:1999, setName:"Base Set", number:"4", grader:"PSA", grade:"9", cert:"DEMO-1002", vaultUsd:2350, checkedUsd:2400, effectiveUsd:2400, advisorCall:"HOLD", advisorReason:"Demo advisor note: the most liquid vintage card in the hobby. Hold as a core position.", notes:"Demo data — sample card with an invented cert number.", era:"Vintage", popInfo:"PSA 9 pop ~1,900 (demo figure)", lastChecked:"2026-09-20" },
  { name:"Umbreon VMAX — Alternate Art", year:2021, setName:"Evolving Skies", number:"215", grader:"PSA", grade:"10", cert:"DEMO-1003", vaultUsd:3900, checkedUsd:4100, effectiveUsd:4100, advisorCall:"TRIM / WATCH", advisorReason:"Demo advisor note: the famous alt art carries a very high PSA 10 pop — demand is real, but supply caps the upside. Watch pop growth; trim into spikes.", notes:"Demo data — sample card with an invented cert number.", era:"Modern", popInfo:"PSA 10 pop 21,000+ (demo figure)", lastChecked:"2026-10-02" },
  { name:"Pikachu — Red Cheeks", year:1999, setName:"Base Set", number:"58", grader:"PSA", grade:"10", cert:"DEMO-1004", vaultUsd:1850, checkedUsd:1900, effectiveUsd:1900, advisorCall:"HOLD", advisorReason:"Demo advisor note: red-cheeks variant in a 10 — steady blue-chip demand.", notes:"Demo data — sample card with an invented cert number.", era:"Vintage", popInfo:null, lastChecked:"2026-09-30" },
  { name:"Charizard ex — Special Illustration Rare", year:2023, setName:"Pokemon 151", number:"199", grader:"PSA", grade:"10", cert:"DEMO-1005", vaultUsd:1450, checkedUsd:1500, effectiveUsd:1500, advisorCall:"HOLD", advisorReason:"Demo advisor note: the 151 chase card — hold while set demand stays deep.", notes:"Demo data — sample card with an invented cert number.", era:"Modern", popInfo:null, lastChecked:"2026-10-01" },
  { name:"Gengar VMAX — Alternate Art", year:2021, setName:"Fusion Strike", number:"271", grader:"PSA", grade:"10", cert:"DEMO-1006", vaultUsd:1150, checkedUsd:1200, effectiveUsd:1200, advisorCall:"HOLD", advisorReason:"Demo advisor note: beloved alt art with a loyal collector base. Hold.", notes:"Demo data — sample card with an invented cert number.", era:"Modern", popInfo:null, lastChecked:"2026-09-18" },
  { name:"Blastoise-Holo", year:1999, setName:"Base Set", number:"2", grader:"PSA", grade:"9", cert:"DEMO-1007", vaultUsd:1150, checkedUsd:1100, effectiveUsd:1100, advisorCall:"HOLD", advisorReason:"Demo advisor note: Base Set starter trio member — liquid vintage. Hold.", notes:"Demo data — sample card with an invented cert number.", era:"Vintage", popInfo:null, lastChecked:"2026-09-12" },
  { name:"Venusaur-Holo", year:1999, setName:"Base Set", number:"15", grader:"PSA", grade:"9", cert:"DEMO-1008", vaultUsd:950, checkedUsd:900, effectiveUsd:900, advisorCall:"HOLD", advisorReason:"Demo advisor note: completes the Base Set starter trio in this sample portfolio. Hold.", notes:"Demo data — sample card with an invented cert number.", era:"Vintage", popInfo:null, lastChecked:"2026-09-12" },
  { name:"Rayquaza VMAX — Alternate Art", year:2021, setName:"Evolving Skies", number:"217", grader:"PSA", grade:"10", cert:"DEMO-1009", vaultUsd:1250, checkedUsd:1300, effectiveUsd:1300, advisorCall:"HOLD", advisorReason:"Demo advisor note: second Evolving Skies alt art in the sample set — hold and monitor pop.", notes:"Demo data — sample card with an invented cert number.", era:"Modern", popInfo:null, lastChecked:"2026-09-22" },
  { name:"Mew ex — Special Illustration Rare", year:2023, setName:"Pokemon 151", number:"216", grader:"PSA", grade:"10", cert:"DEMO-1010", vaultUsd:620, checkedUsd:650, effectiveUsd:650, advisorCall:"HOLD", advisorReason:"Demo advisor note: 151 SIR with strong art demand. Hold.", notes:"Demo data — sample card with an invented cert number.", era:"Modern", popInfo:null, lastChecked:"2026-09-25" },
  { name:"Eevee ex — Special Illustration Rare", year:2025, setName:"Prismatic Evolutions", number:"167", grader:"PSA", grade:"10", cert:"DEMO-1011", vaultUsd:480, checkedUsd:520, effectiveUsd:520, advisorCall:"WATCH", advisorReason:"Demo advisor note: newer release — watch pop growth before sizing up.", notes:"Demo data — sample card with an invented cert number.", era:"Modern", popInfo:null, lastChecked:"2026-09-26" },
  { name:"Snorlax — Alternate Art", year:2021, setName:"Chilling Reign", number:"224", grader:"PSA", grade:"9", cert:"DEMO-1012", vaultUsd:210, checkedUsd:230, effectiveUsd:230, advisorCall:"HOLD", advisorReason:"Demo advisor note: small position, enduring character demand. Hold.", notes:"Demo data — sample card with an invented cert number.", era:"Modern", popInfo:null, lastChecked:"2026-09-19" },
];

const SALES: { cert: string; date: string; price: number; source: string; desc: string }[] = [
  { cert:"DEMO-1001", date:"2026-07-11", price:4150, source:"Fanatics Collect", desc:"Demo sales evidence — sample record, not a real transaction." },
  { cert:"DEMO-1001", date:"2026-09-28", price:4480, source:"eBay sold", desc:"Demo sales evidence — sample record, not a real transaction." },
  { cert:"DEMO-1002", date:"2026-08-15", price:2275, source:"eBay sold", desc:"Demo sales evidence — sample record, not a real transaction." },
  { cert:"DEMO-1002", date:"2026-09-20", price:2410, source:"eBay sold", desc:"Demo sales evidence — sample record, not a real transaction." },
  { cert:"DEMO-1003", date:"2026-08-30", price:3980, source:"eBay sold", desc:"Demo sales evidence — sample record, not a real transaction." },
  { cert:"DEMO-1003", date:"2026-10-02", price:4120, source:"eBay sold", desc:"Demo sales evidence — sample record, not a real transaction." },
  { cert:"DEMO-1004", date:"2026-08-22", price:1760, source:"eBay sold", desc:"Demo sales evidence — sample record, not a real transaction." },
  { cert:"DEMO-1004", date:"2026-09-30", price:1905, source:"eBay sold", desc:"Demo sales evidence — sample record, not a real transaction." },
  { cert:"DEMO-1005", date:"2026-09-05", price:1430, source:"eBay sold", desc:"Demo sales evidence — sample record, not a real transaction." },
  { cert:"DEMO-1005", date:"2026-10-01", price:1505, source:"eBay sold", desc:"Demo sales evidence — sample record, not a real transaction." },
  { cert:"DEMO-1007", date:"2026-09-12", price:1085, source:"eBay sold", desc:"Demo sales evidence — sample record, not a real transaction." },
  { cert:"DEMO-1001", date:"2026-05-09", price:4020, source:"Fanatics Collect", desc:"Demo sales evidence — sample record, not a real transaction." },
  { cert:"DEMO-1001", date:"2026-08-21", price:4310, source:"eBay sold", desc:"Demo sales evidence — sample record, not a real transaction." },
  { cert:"DEMO-1002", date:"2026-04-18", price:2180, source:"eBay sold", desc:"Demo sales evidence — sample record, not a real transaction." },
  { cert:"DEMO-1002", date:"2026-06-02", price:2290, source:"eBay sold", desc:"Demo sales evidence — sample record, not a real transaction." },
  { cert:"DEMO-1002", date:"2026-07-19", price:2335, source:"Fanatics Collect", desc:"Demo sales evidence — sample record, not a real transaction." },
];

async function ensureSeed(ctx: Ctx) {
  const db = ctx.db<typeof schema>();
  const existing = await db.select().from(schema.cards).limit(1);
  if (existing.length > 0) return;
  for (const c of SEED) {
    await db.insert(schema.cards).values({
      name: c.name, year: c.year, setName: c.setName, number: c.number, grader: c.grader, grade: c.grade, cert: c.cert,
      vaultUsd: c.vaultUsd, checkedUsd: c.checkedUsd, advisorCall: c.advisorCall, advisorReason: c.advisorReason,
      notes: c.notes + (c.effectiveUsd != null ? ` [official:${c.effectiveUsd}]` : ""), status: "active", lastChecked: c.lastChecked, popInfo: c.popInfo, era: c.era,
    });
  }
  // Demo previously-owned records (sample data): one sold, one traded —
  // they exercise the Trade History surfaces and never count in the total.
  await db.insert(schema.cards).values({
    name: "Magikarp — Illustration Rare", year: 2023, setName: "Paldea Evolved", number: "203", grader: "PSA", grade: "9", cert: "DEMO-SOLD-0203",
    vaultUsd: null, checkedUsd: null, advisorCall: "SOLD", advisorReason: "Demo record — sold (sample data).", notes: "Demo data — previously owned sample card.", status: "sold", soldPrice: 385, soldDate: "2026-09-14", era: "Modern",
  });
  await db.insert(schema.cards).values({
    name: "Alakazam ex — Special Illustration Rare", year: 2023, setName: "Pokemon 151", number: "201", grader: "PSA", grade: "9", cert: "DEMO-TRADED-0201",
    vaultUsd: null, checkedUsd: null, advisorCall: "TRADED", advisorReason: "Demo record — traded away (sample data).", notes: "Demo data — previously owned sample card, kept for trade-history display only.", status: "traded", soldPrice: null, soldDate: null, era: "Modern",
  });
  for (const s of SALES) {
    await db.insert(schema.salesEvidence).values({ cardCert: s.cert, saleDate: s.date, price: s.price, source: s.source, description: s.desc });
  }
  // One UNVERIFIED demo signal (verified=0) so the unverified-sale flagging
  // renders: seller-reported, excluded from values / comps / charts.
  await db.insert(schema.salesEvidence).values({
    cardCert: "DEMO-1001", saleDate: "2026-09-15", price: 5200,
    source: "Private sale — seller-reported (DEMO)",
    description: "UNVERIFIED demo signal — sample data included only to demonstrate the unverified-sale flagging. Excluded from headline values, verified comps / averages, and every chart series.",
    verified: 0,
  });
  await db.insert(schema.refreshLogs).values({ summary: "Demo initial load — sample collection of 12 priced cards totalling $20,300. ALL DATA IN THIS EXPORT IS DEMO / SAMPLE DATA (invented cert numbers, illustrative prices and sales records) — the private deployment's real collection is not included.", cardsChecked: 0 });
}

const WATCH: { name: string; kind: string; priceContext: string; thesis: string; actionRule: string; lastChecked: string | null; sortOrder: number }[] = [
  { name: "Japanese 151 Second-Tier Illustration Rares", kind: "watch", priceContext: "Illustration rares below the set's chase cards (demo price context — illustrative ranges only).", thesis: "The tier below the chase cards in an out-of-print, nostalgia-heavy set tends to lag, then catch up.", actionRule: "Buy the second tier, not the headline chase. Re-check current prices before acting.", lastChecked: "2026-09-15", sortOrder: 1 },
  { name: "Sword & Shield Sealed Booster Boxes — Brilliant Stars, Lost Origin", kind: "watch", priceContext: "Box prices flat while tracked sales volume rises (demo context).", thesis: "Rising volume on flat prices is accumulation, not hype — demand quietly absorbing supply.", actionRule: "Accumulate gradually while prices stay flat. This is a sealed play.", lastChecked: "2026-09-04", sortOrder: 2 },
  { name: "30th Anniversary Set — Sealed (MSRP only)", kind: "watch", priceContext: "MSRP at the official store only (demo context).", thesis: "Anniversary sealed bought at retail is the lowest-risk entry — the markup is where the risk lives.", actionRule: "Buy ONLY at MSRP. Never pay secondary markup.", lastChecked: "2026-09-10", sortOrder: 3 },
  { name: "Giratina V Alt Art — Lost Origin", kind: "avoid", priceContext: "PSA 10 at full chase pricing (demo context).", thesis: "Already repriced — at chase pricing this IS the top of the market.", actionRule: "DO NOT BUY at current prices. Revisit only on a major pullback.", lastChecked: "2026-09-12", sortOrder: 11 },
];

const WATCH_VINTAGE: typeof WATCH = [
  { name: "LV.X PSA 9 Lag Play — DP Era", kind: "vintage", priceContext: "PSA 10 LV.X prints lead the era; PSA 9s of the same cards reprice after them (demo context).", thesis: "Same scarcity one grade down — the PSA 9 is the lag rung when PSA 10s print big numbers.", actionRule: "Target PSA 9 LV.X of popular species. Don't chase the PSA 10 prints.", lastChecked: "2026-09-08", sortOrder: 21 },
  { name: "Southern Islands — Mid Grades (PSA 8 / 9), Not the PSA 10 Prints", kind: "vintage", priceContext: "The headline prices are PSA 10 or nothing; English and Japanese mid grades lag far behind (demo context).", thesis: "The 8s and 9s of a beloved set are the entry the top-of-market buyers ignore.", actionRule: "Buy PSA 8/9 only. Never the PSA 10s at headline prints.", lastChecked: "2026-09-08", sortOrder: 22 },
  { name: "\u26a0 Manipulation Warning — Diamond & Pearl Era Spikes", kind: "warning", priceContext: "Single-print spikes with alleged fake bidding have been reported in this era.", thesis: "A single huge auction print is not a market — parts of the era are being gamed.", actionRule: "Only buy D&P / LV.X on MULTIPLE confirmed paid sales. Never chase a single auction print.", lastChecked: "2026-09-08", sortOrder: 28 },
];

/* Silver-Border World Championship deck reprints (EX era): silver border,
   champion signature, WC back, not tournament-legal. Thesis: graded WC
   reprints have been repricing while RAW copies lag — every target is a
   near-mint RAW grading candidate with a max-buy, never a graded copy. */
const WATCH_WC: typeof WATCH = [
  { name: "Silver-Border WC — Mew Star (Gold Star) · 2008", kind: "wc", priceContext: "Raw near-mint range · MAX BUY $120 (demo context — TCGplayer-tracked style ranges).", thesis: "The category's proof case: graded WC Gold Stars lead the repricing while raw copies still trade near bulk-plus.", actionRule: "Buy RAW near-mint only at or under $120 as a grading candidate. Verify silver border, signature and WC back on every copy.", lastChecked: "2026-09-08", sortOrder: 31 },
  { name: "Silver-Border WC — Lugia ex · 2006", kind: "wc", priceContext: "Raw near-mint range · MAX BUY $70 (demo context).", thesis: "A top species with permanent demand at a cheap raw entry while graded WC chase cards reprice.", actionRule: "Buy RAW near-mint only at or under $70 as a grading candidate. Check the glossy WC surface closely.", lastChecked: "2026-09-08", sortOrder: 32 },
];

/* Japanese Vending Series group ships empty in the demo seed — the group
   exists in the product (a Japanese-market sheet/singles hunt), but the
   private deployment's target list and price research are not included. */
const WATCH_VENDING: typeof WATCH = [
];

/* ——— Card art (Glass Vault) ———
   VERIFIED real card images for the demo collection, keyed by the
   DEMO- certs. Every URL was checked HTTP 200 + image content type
   and its identity confirmed against the Pokémon TCG API by set +
   collector number for the exact printing the demo card names.
   Cards without a verified image keep image_url NULL — actual card
   art or nothing, never a substitute printing and never generated
   art. Backfill is idempotent: only rows where image_url IS NULL
   are written. DEMO-1010 (Mew ex SIR, Pokémon 151 #216) is
   deliberately absent: that SIR exists only as the Japanese 151
   printing — the English set has no SIR Mew ex — the TCG CDN 404s
   it and alternate CDNs serve a card-back placeholder, so it stays
   NULL like any unverifiable printing. */
const CARD_ART: Record<string, string> = {
  "DEMO-1001": "https://images.pokemontcg.io/neo1/9_hires.png",
  "DEMO-1002": "https://images.pokemontcg.io/base1/4_hires.png",
  "DEMO-1003": "https://images.pokemontcg.io/swsh7/215_hires.png",
  "DEMO-1004": "https://images.pokemontcg.io/base1/58_hires.png",
  "DEMO-1005": "https://images.pokemontcg.io/sv3pt5/199_hires.png",
  "DEMO-1006": "https://images.pokemontcg.io/swsh8/271_hires.png",
  "DEMO-1007": "https://images.pokemontcg.io/base1/2_hires.png",
  "DEMO-1008": "https://images.pokemontcg.io/base1/15_hires.png",
  "DEMO-1009": "https://images.pokemontcg.io/swsh7/217_hires.png",
  "DEMO-1011": "https://images.pokemontcg.io/sv8pt5/167_hires.png",
  "DEMO-1012": "https://images.pokemontcg.io/swsh6/224_hires.png",
  "DEMO-SOLD-0203": "https://images.pokemontcg.io/sv2/203_hires.png",
  "DEMO-TRADED-0201": "https://images.pokemontcg.io/sv3pt5/201_hires.png",
};

async function ensureCardArt(ctx: Ctx) {
  const db = ctx.db<typeof schema>();
  const rows = await db.select().from(schema.cards);
  for (const r of rows as any[]) {
    const url = CARD_ART[r.cert as string];
    if (url && (r.imageUrl == null)) {
      await db.update(schema.cards).set({ imageUrl: url }).where(eq(schema.cards.id, r.id));
    }
  }
}

async function ensureDemoForecasts(ctx: Ctx) {
  const db = ctx.db<typeof schema>();
  try {
    const existing = await db.select().from(schema.cardForecasts).limit(1);
    if (existing.length > 0) return;
    const rows: any[] = [
      // DEMO-1002 Charizard-Holo (Base Set #4, PSA 9) — live, open.
      { cert: "DEMO-1002", issuedAt: "2026-10-08", horizonDays: 30, rangeLow: 2250, rangeHigh: 2620, midpoint: 2435, confidence: "B", basisN: 5, basisLastSale: "2026-09-20", liquidity: "moderate", regime: "normal", modelVersion: FC_MODEL_VERSION, origin: "live", status: "open", realizedValue: null, inRange: null, gradedAt: null },
      { cert: "DEMO-1002", issuedAt: "2026-10-08", horizonDays: 90, rangeLow: 2180, rangeHigh: 2760, midpoint: 2470, confidence: "B", basisN: 5, basisLastSale: "2026-09-20", liquidity: "moderate", regime: "normal", modelVersion: FC_MODEL_VERSION, origin: "live", status: "open", realizedValue: null, inRange: null, gradedAt: null },
      { cert: "DEMO-1002", issuedAt: "2026-10-08", horizonDays: 180, rangeLow: 2050, rangeHigh: 2950, midpoint: 2500, confidence: "B", basisN: 5, basisLastSale: "2026-09-20", liquidity: "moderate", regime: "normal", modelVersion: FC_MODEL_VERSION, origin: "live", status: "open", realizedValue: null, inRange: null, gradedAt: null },
      // DEMO-1001 Lugia-Holo (Neo Genesis #9, PSA 10) — live, open.
      { cert: "DEMO-1001", issuedAt: "2026-10-08", horizonDays: 30, rangeLow: 4280, rangeHigh: 4760, midpoint: 4520, confidence: "C", basisN: 4, basisLastSale: "2026-09-28", liquidity: "thin", regime: "normal", modelVersion: FC_MODEL_VERSION, origin: "live", status: "open", realizedValue: null, inRange: null, gradedAt: null },
      { cert: "DEMO-1001", issuedAt: "2026-10-08", horizonDays: 90, rangeLow: 4150, rangeHigh: 4950, midpoint: 4550, confidence: "C", basisN: 4, basisLastSale: "2026-09-28", liquidity: "thin", regime: "normal", modelVersion: FC_MODEL_VERSION, origin: "live", status: "open", realizedValue: null, inRange: null, gradedAt: null },
      { cert: "DEMO-1001", issuedAt: "2026-10-08", horizonDays: 180, rangeLow: 3980, rangeHigh: 5180, midpoint: 4580, confidence: "C", basisN: 4, basisLastSale: "2026-09-28", liquidity: "thin", regime: "normal", modelVersion: FC_MODEL_VERSION, origin: "live", status: "open", realizedValue: null, inRange: null, gradedAt: null },
      // Backtest (replayed history — always reported separately): one hit, one miss.
      { cert: "DEMO-1002", issuedAt: "2026-08-15", horizonDays: 30, rangeLow: 2150, rangeHigh: 2650, midpoint: 2400, confidence: "C", basisN: 3, basisLastSale: "2026-08-15", liquidity: "thin", regime: "normal", modelVersion: FC_MODEL_VERSION, origin: "backtest", status: "graded", realizedValue: 2410, inRange: 1, gradedAt: "2026-09-20" },
      { cert: "DEMO-1002", issuedAt: "2026-06-02", horizonDays: 90, rangeLow: 1900, rangeHigh: 2250, midpoint: 2075, confidence: "C", basisN: 3, basisLastSale: "2026-06-02", liquidity: "thin", regime: "normal", modelVersion: FC_MODEL_VERSION, origin: "backtest", status: "graded", realizedValue: 2410, inRange: 0, gradedAt: "2026-09-20" },
    ];
    for (const r of rows) await db.insert(schema.cardForecasts).values(r);
  } catch { /* forecasts table just migrated — next read retries */ }
}

// ——— Unverified Giratina signal (Oct 5, 2026) ———
// Seller-reported private sale. NEVER merged into headline value, verified
// comps, averages, or chart series. Stored once, flagged verified=0.

// ——— Collectr scrap (Oct 14, 2026 — the owner: "Can we scrap collectr
// for eBay ended listings as well?") ———
// Collectr is prohibited as a source for eBay ended/sold data in any
// capacity: with eBay sold read directly through the owner's
// signed-in session, no relay is needed or permitted. On-file audit:
// any VERIFIED sales_evidence row whose source or description traces
// to a Collectr relay is reclassified exactly like the kept-value
// treatment — verified=false, description prefixed "Collectr relay
// — context only (not a market comp)", original text preserved —
// so it drops out of comps, forecasts, pump verified sets and chart
// series. Values re-derive from the remaining verified comps on the
// next refresh; no totals are hand-edited here. Idempotent: only
// verified rows match, and reclassified rows are verified=0.
const COLLECTR_PREFIX = "Collectr relay — context only (not a market comp)";
async function ensureCollectrScrap(ctx: Ctx) {
  try {
    const db = ctx.db<typeof schema>();
    const rows = await db.select().from(schema.salesEvidence);
    const hits = (rows as any[]).filter((r: any) => {
      if (r.verified === 0) return false;
      const t = `${(r.source as string) ?? ""} ${((r.description as string) ?? "")}`.toLowerCase();
      return t.includes("collektr") || t.includes("collectr");
    });
    if (hits.length === 0) return;
    for (const r of hits) {
      const desc = ((r.description as string) ?? "");
      const newDesc = desc.startsWith(COLLECTR_PREFIX) ? desc : `${COLLECTR_PREFIX}: ${desc}`;
      await db.update(schema.salesEvidence).set({ verified: 0, description: newDesc }).where(eq(schema.salesEvidence.id, r.id));
    }
    await db.insert(schema.refreshLogs).values({ summary: `Collectr scrap (Oct 14, 2026 — manual audit ensure): ${hits.length} verified sales_evidence row(s) tracing to a Collectr relay for eBay ended/sold data were reclassified verified=false and prefixed "${COLLECTR_PREFIX}", so they no longer enter comps, forecasts, verified averages or chart series. Rows and text preserved — nothing deleted. Affected ids: ${hits.map((r: any) => r.id as number).join(", ")}. Values re-derive from remaining verified comps on the next refresh.`, cardsChecked: 0 });
  } catch { /* evidence table just migrated */ }
}

async function ensureSnapshots(ctx: Ctx) {
  const db = ctx.db<typeof schema>();
  const rows = await db.select().from(schema.portfolioSnapshots);
  if (rows.length > 0) return;
  const demoSnapshots: { snapshotDate: string; totalUsd: number; pricedCount: number; note: string }[] = [
    { snapshotDate: "2026-09-01", totalUsd: 19240, pricedCount: 12, note: "Demo baseline — SAMPLE DATA. Forward tracking begins here; no back-filled history." },
    { snapshotDate: "2026-09-15", totalUsd: 19610, pricedCount: 12, note: "Demo snapshot — sample data." },
    { snapshotDate: "2026-10-01", totalUsd: 19980, pricedCount: 12, note: "Demo snapshot — sample data." },
    { snapshotDate: "2026-10-08", totalUsd: 20300, pricedCount: 12, note: "Demo snapshot — sample data." },
  ];
  for (const s of demoSnapshots) {
    await db.insert(schema.portfolioSnapshots).values(s);
  }
}

const SCOUTS: { scoutId: string; name: string; pokemon: string; emoji: string; territory: string; statusLine: string; lastChecked: string; findsCount: number }[] = [
  { scoutId: "gengar", name: "Gengar", pokemon: "Gengar", emoji: "👻", territory: "eBay · Graded slabs", statusLine: "Sweeping eBay graded slabs for vintage holos and alt arts under comp — nothing \u226515% under market on the last check. Still watching.", lastChecked: "2026-09-01", findsCount: 0 },
  { scoutId: "pikachu", name: "Pikachu", pokemon: "Pikachu", emoji: "\u26a1", territory: "TCGplayer · Raw singles", statusLine: "Scanning TCGplayer and raw listings for second-tier illustration rares and secret rares — nothing under target today. Still watching.", lastChecked: "2026-09-01", findsCount: 0 },
  { scoutId: "eevee", name: "Eevee", pokemon: "Eevee", emoji: "🌿", territory: "Yahoo Japan · Mercari · eBay JP", statusLine: "Hunting Japanese listings — near-market examples logged as sightings (see feed; checked dates shown). Still watching for fresh stock.", lastChecked: "2026-09-01", findsCount: 0 },
  { scoutId: "snorlax", name: "Snorlax", pokemon: "Snorlax", emoji: "💤", territory: "Sealed product · Slow sweep", statusLine: "Slow-sweeping sealed: anniversary product at MSRP only, plus Sword & Shield boxes while prices stay flat. No MSRP restock flagged yet. Still watching.", lastChecked: "2026-09-01", findsCount: 0 },
  /* Team Rocket — the RED-TEAM scout. Adversarial only: he writes the
     bear case on other scouts' finds and stress-tests held values
     against the cheapest live asks. He NEVER hunts deals, NEVER pins,
     and his findsCount stays 0 forever. */
  { scoutId: "rocket", name: "Rocket Grunt", pokemon: "Team Rocket", emoji: "🚀", territory: "Red team · Bear cases & held-value stress tests", statusLine: "Lurking by the vault, taking notes. Every Tier 1/Tier 2 find gets a Rocket bear case; every holding gets stress-tested against its cheapest live ask. He has never pinned a deal and never will — prepare for trouble, not purchases.", lastChecked: "2026-09-01", findsCount: 0 },
];

/* Backfill the new standing hunts onto scout rows that already exist in
   the database (ensureScouts only inserts missing scouts). Idempotent:
   appends the hunt sentence only when it is not already there, and never
   overwrites a "Found one:" status written by a pinned deal. */
async function ensureScoutHunts(ctx: Ctx) {
  const db = ctx.db<typeof schema>();
  const rows = await db.select().from(schema.scoutStatus);
  const hunts: Record<string, { needle: string; sentence: string }> = {
    gengar: { needle: "silver-border WC", sentence: " Also on the silver-border WC hunt: watching eBay for WC Gold Star / ex raw copies under their max-buys." },
    pikachu: { needle: "WC deck values", sentence: " Also tracking TCGplayer WC deck values for the silver-border World Championship raw targets." },
    eevee: { needle: "Vending Series", sentence: " New standing hunt: Japanese Vending Series (1998–99) — unpeeled Series 1–3 sheets and clean glossy singles (Ooyama's Pikachu first) on Yahoo Japan / Mercari / eBay JP. Prices to be established on first refresh from Japanese comps." },
  };
  for (const r of rows as any[]) {
    const h = hunts[r.scoutId as string];
    if (!h) continue;
    if ((r.statusLine as string).startsWith("Found one:")) continue;
    if ((r.statusLine as string).includes(h.needle)) continue;
    await db.update(schema.scoutStatus).set({ statusLine: (r.statusLine as string).replace(/\s*Still watching\.?\s*$/, "") + h.sentence + " Still watching." }).where(eq(schema.scoutStatus.id, r.id));
  }
}

async function ensureScouts(ctx: Ctx) {
  const db = ctx.db<typeof schema>();
  const rows = await db.select().from(schema.scoutStatus);
  const have = new Set(rows.map((r: any) => r.scoutId));
  for (const s of SCOUTS) {
    if (have.has(s.scoutId)) continue;
    await db.insert(schema.scoutStatus).values(s);
  }
}

const DEALS: { cardName: string; gradeLabel: string; askingUsd: number; marketUsd: number | null; discountPct: number | null; marketplace: string; seller: string | null; listingUrl: string | null; foundAt: string; scoutId: string; checkedDate: string; note: string; isExample: number }[] = [
  { cardName: "Charizard ex SIR — Pokemon 151 (demo sighting)", gradeLabel: "PSA 10", askingUsd: 1320, marketUsd: 1500, discountPct: 12, marketplace: "Demo example — not a live listing", seller: null, listingUrl: null, foundAt: "2026-09-20", scoutId: "eevee", checkedDate: "2026-09-20", note: "DEMO example sighting — sample data included so the feed renders fully. No listing URL is attached, so this stays a sighting — never a pinned deal — exactly how the product treats any unverifiable find.", isExample: 1 },
  { cardName: "Lugia-Holo — Neo Genesis (demo sighting)", gradeLabel: "PSA 9", askingUsd: 2600, marketUsd: null, discountPct: null, marketplace: "Demo example — not a live listing", seller: null, listingUrl: null, foundAt: "2026-10-01", scoutId: "gengar", checkedDate: "2026-10-01", note: "DEMO example sighting — sample data. No verified comp is attached, so no discount % is claimed, and no listing URL is on file, so this stays a sighting, not a pinned deal.", isExample: 1 },
];

async function ensureDeals(ctx: Ctx) {
  const db = ctx.db<typeof schema>();
  const rows = await db.select().from(schema.dealFeed);
  const have = new Set(rows.map((r: any) => r.cardName));
  for (const d of DEALS) {
    if (have.has(d.cardName)) continue;
    await db.insert(schema.dealFeed).values(d);
  }
}

function scoutForWatch(name: string): string {
  const n = name.toLowerCase();
  // Japanese Vending Series — Eevee's standing hunt, checked first because
  // vending names also contain "Japanese" / "singles".
  if (n.includes("vending")) return "eevee";
  // Silver-Border WC group is hunted by BOTH Pikachu (TCGplayer / raw) and
  // Gengar (eBay) — split the targets between them so the group shows both
  // territories and both search-link types.
  if (n.includes("silver-border wc")) {
    if (n.includes("mew star") || n.includes("jolteon star · 2008") || n.includes("rayquaza") || n.includes("jirachi") || n.includes("lugia ex")) return "pikachu";
    return "gengar";
  }
  if (n.includes("japanese") || n.includes("nagaba") || n.includes("151 art rare")) return "eevee";
  if (n.includes("sealed") || n.includes("anniversary") || n.includes("booster boxes")) return "snorlax";
  if (n.includes("singles") || n.includes("illustration rares") || n.includes("secret rares")) return "pikachu";
  return "gengar";
}

async function ensureWatchlistScouts(ctx: Ctx) {
  const db = ctx.db<typeof schema>();
  const rows = await db.select().from(schema.watchlist);
  for (const r of rows as any[]) {
    if (!r.scoutId) {
      await db.update(schema.watchlist).set({ scoutId: scoutForWatch(r.name) }).where(eq(schema.watchlist.id, r.id));
    }
  }
}

// ——— Price Source Registry (the owner's caveats, Oct 8 2026) ———
// Every price on the dashboard carries a source TYPE: verified sold comp,
// active listing / ask, aggregator value, cert verification, or
// seller-reported / unverified. Aggregator or single-source prints never
// override verified sold comps or the owner's kept values.
const SOURCES: { name: string; sourceType: string; coverage: string; caveat: string; trustLevel: string; sortOrder: number }[] = [
  { name: "Fanatics Collect", sourceType: "Verified sold comp", coverage: "Major auction sold results — the headline LV.X PSA 10 sales (6 cards, $2.196M combined) came from Fanatics Collect. Primary sold-comp source for high-end vintage.", caveat: "Auction prints sit at the top end of a card's range — use as verified comps and context for the grade below, not as the expected price for every copy.", trustLevel: "Primary", sortOrder: 1 },
  { name: "eBay — Sold listings", sourceType: "Verified sold comp", coverage: "Completed, paid sold listings — the backbone of the checked values and per-card sales evidence on this dashboard.", caveat: "Only completed sold listings count. A single outlier print is not a market — require multiple confirmed paid sales, especially in Diamond & Pearl / LV.X.", trustLevel: "Primary", sortOrder: 2 },
  { name: "PriceCharting", sourceType: "Aggregator value", coverage: "Sold-history aggregator built from eBay sales — used for per-card price history and sold ranges.", caveat: "Aggregator: values are derived from sold data, not a sale itself. Label as aggregator value and cross-check against raw sold listings for headline numbers.", trustLevel: "Supporting", sortOrder: 3 },
  { name: "PSA — value estimates & pop data", sourceType: "Aggregator value", coverage: "PSA's own value estimates and population reports.", caveat: "Estimates and pop data — not individual sold records. Never presented as a sold comp.", trustLevel: "Supporting", sortOrder: 4 },
  { name: "CardTrack", sourceType: "Aggregator value", coverage: "Graded-card price references.", caveat: "Aggregator reference value, not a verified individual sale. Supporting evidence only.", trustLevel: "Supporting", sortOrder: 5 },
  { name: "pokeprices.io", sourceType: "Aggregator value", coverage: "Aggregates PriceCharting + eBay into a single price view.", caveat: "USE WITH CAUTION: this is the source of a dubious $2,500 PSA 10 sale and of unlabeled Mewtwo 'sales' — both excluded by the owner. Never use pokeprices.io data unlabeled, and never as a sole comp source.", trustLevel: "Caution", sortOrder: 6 },
  { name: "pokeinvesting.com", sourceType: "Aggregator value", coverage: "Good for PSA 10 values and population data.", caveat: "Lists NO individual sales — values and population only, never comps. Do not cite it as sales evidence.", trustLevel: "Caution", sortOrder: 7 },
  { name: "Collektr", sourceType: "Active listing / ask", coverage: "Marketplace listings. Live listings only.", caveat: "Listings / ask data ONLY — no sold comps. An ask is what a seller wants, not what a card sold for. Always label as asking price, never sold price. SCRAPPED for eBay ended/sold data (Oct 14, 2026, owner order): Collectr must never be used or cited as a relay for eBay ended/sold listings in any capacity — eBay ended data comes only from eBay sold search read directly through the owner's signed-in session.", trustLevel: "Listings only", sortOrder: 8 },
  { name: "CardCodex", sourceType: "Active listing / ask", coverage: "Marketplace listings.", caveat: "Listings / ask data ONLY — no sold comps. Always label as asking price, never sold price.", trustLevel: "Listings only", sortOrder: 9 },
  { name: "eBay listing pages (ebay.com & ebay.de)", sourceType: "Active listing / ask", coverage: "Live active listings the scouts sweep for under-market candidates, including German eBay sellers for Japanese / EU stock.", caveat: "Active listings are asks, not sold data. A cheap listing is a candidate to verify — check seller, cert and shipping before treating it as a deal.", trustLevel: "Listings only", sortOrder: 10 },
  { name: "PSA cert pages", sourceType: "Cert verification", coverage: "Certificate lookup — verifies a slab is genuine and matches its label (grader, grade, card).", caveat: "Cert verification only — not sold data and not a price source. Used to validate a card or a listing, never as a comp.", trustLevel: "Verification", sortOrder: 11 },
  { name: "Seller-reported private sales", sourceType: "Seller-reported / unverified", coverage: "Private deals reported by a seller with no public record.", caveat: "UNVERIFIED by definition. Shown as a flagged signal only — excluded from headline values, verified comps / averages, and every chart series until independently verified.", trustLevel: "Unverified", sortOrder: 12 },
  { name: "TCGplayer — WC deck values & marketplace", sourceType: "Aggregator value", coverage: "TCGplayer-tracked World Championship deck values — the source for the silver-border WC raw ranges and max-buys (checked Oct 8, 2026) — plus live raw-single listings swept by the Pikachu scout.", caveat: "Tracked / market values are aggregates of asks and sales, not a verified individual sold comp. Cross-check any WC target against eBay sold listings and require multiple confirmed paid sales before buying — the WC market is thin.", trustLevel: "Supporting", sortOrder: 13 },
  { name: "Yahoo Japan Auctions / Mercari JP", sourceType: "Verified sold comp", coverage: "Japanese marketplace sold results — the required comp source for the Japanese Vending Series (1998–99) hunt and for Japanese singles generally. Eevee scout's home ground.", caveat: "Japanese-source comps must be labelled as such, with the marketplace and date. A US ask never prices a vending card: condition (peel / curl / gloss wear) drives value, so only like-condition Japanese sales count as comps.", trustLevel: "Primary", sortOrder: 14 },
  { name: "PicClick", sourceType: "Not served", coverage: "Former eBay-mirror listing pages on picclick.* domains. No longer served anywhere on this dashboard — every PicClick finding was removed on Oct 9, 2026 and sweeps/refreshes discard PicClick candidates at capture.", caveat: "not served — links broken (removed Oct 9, 2026). The owner reported every PicClick link broken; do not save, pin, or follow PicClick URLs — use the direct marketplace listing (eBay, TCGplayer, Mercari, Yahoo Japan, Fanatics Collect) instead.", trustLevel: "Not served", sortOrder: 15 },
];

async function ensureSources(ctx: Ctx) {
  const db = ctx.db<typeof schema>();
  const rows = await db.select().from(schema.priceSources);
  const have = new Set(rows.map((r: any) => r.name));
  for (const s of SOURCES) {
    if (have.has(s.name)) {
      // PicClick may already be on file from before the ban (possibly
      // described as a served source) — force its registry entry to the
      // not-served state so the registry never presents it as served.
      if (s.name === "PicClick") {
        const existing: any = (rows as any[]).find(r => r.name === "PicClick");
        if (existing && (existing.trustLevel !== "Not served" || existing.sourceType !== "Not served")) {
          await db.update(schema.priceSources).set({ sourceType: s.sourceType, coverage: s.coverage, caveat: s.caveat, trustLevel: s.trustLevel, sortOrder: s.sortOrder }).where(eq(schema.priceSources.id, existing.id));
        }
      }
      // Collektr (Oct 14, 2026): the owner scrapped it as a source
      // for eBay ended/sold data — force its registry entry to the
      // re-scoped asks-only state (ended-listings role struck) so a
      // registry row written before the scrap never presents it as
      // an ended/sold source.
      if (s.name === "Collektr") {
        const existing: any = (rows as any[]).find(r => r.name === "Collektr");
        if (existing && existing.caveat !== s.caveat) {
          await db.update(schema.priceSources).set({ sourceType: s.sourceType, coverage: s.coverage, caveat: s.caveat, trustLevel: s.trustLevel, sortOrder: s.sortOrder }).where(eq(schema.priceSources.id, existing.id));
        }
      }
      continue;
    }
    await db.insert(schema.priceSources).values(s);
  }
}

async function ensureWatchlist(ctx: Ctx) {
  const db = ctx.db<typeof schema>();
  const existing = await db.select().from(schema.watchlist);
  const have = new Set(existing.map((r: any) => r.name));
  for (const w of [...WATCH, ...WATCH_VINTAGE, ...WATCH_WC, ...WATCH_VENDING]) {
    if (have.has(w.name)) continue;
    await db.insert(schema.watchlist).values({ name: w.name, kind: w.kind, priceContext: w.priceContext, thesis: w.thesis, actionRule: w.actionRule, lastChecked: w.lastChecked, sortOrder: w.sortOrder, status: w.kind === "avoid" ? "Avoid" : w.kind === "warning" ? "Warning" : "Watching" });
  }
}

/* Passed = hidden forever. the owner's rule (Oct 8, 2026): if he passes on a
   suggestion it disappears from the page entirely and is never re-suggested
   on refreshes. The record is KEPT in the data with a passed/hidden status
   (never deleted) so ensure-seeds and refresh agents can see it was passed
   and skip it; getPortfolio simply never returns passed rows. This applies
   to watchlist suggestions and scout deal finds only — never owned cards. */
function isPassedStatus(status: string | null | undefined): boolean {
  const s = (status ?? "").trim().toLowerCase();
  return s === "pass" || s === "passed" || s === "hidden";
}
/* Owner removal (Oct 14, 2026): a watch item the owner REMOVES is hidden
   exactly like a pass for rendering/scouting (it leaves every surface and
   scouts stop hunting it), but it is a distinct status so the record
   shows it was removed, not passed on as a suggestion. */
function isRemovedStatus(status: string | null | undefined): boolean {
  const s = (status ?? "").trim().toLowerCase();
  return s === "removed" || s === "deleted";
}
function isHiddenWatchStatus(status: string | null | undefined): boolean {
  return isPassedStatus(status) || isRemovedStatus(status);
}
function passedCoreName(name: string): string {
  return (name.split("—")[0] ?? name).replace(/\([^)]*\)/g, "").trim().toLowerCase();
}

/* ——— PicClick: NOT SERVED (Oct 9, 2026 — the owner: "none of the picclick
   links work. so lets not serve them") ———
   Every PicClick link on the dashboard was broken, so PicClick is
   struck from the source list permanently:
   1. EXISTING rows whose listing URL is on ANY picclick domain
      (picclick.com, picclick.co.uk, picclick.* — any TLD, any
      subdomain) are marked passed=1 — the same withheld state as a
      passed item: kept in the data so refreshes/sweeps can see the URL
      was removed and never resurrect it, rendered NOWHERE (Findings
      Ledger, Market Terminal, Trenches, digest counts, alerts — every
      count recomputes from what actually renders). No fabricated
      replacement links are ever substituted.
   2. CAPTURE: scout sweeps (inline hunt + deep hunt) and the daily
      refresh DISCARD any PicClick candidate before it is stored or
      pinned — saveScoutFind / saveMarketListing
      refuse PicClick URLs outright. eBay, TCGplayer, Mercari, Yahoo
      Japan, Fanatics Collect and direct marketplace links remain.
   3. REGISTRY: PicClick stays listed in the Sources registry only as
      "not served — links broken (removed Oct 9, 2026)", never as a
      served source. */
function isPicClickUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.split(".").includes("picclick");
  } catch {
    return /(^|[/.:-])picclick\./i.test(url);
  }
}
function isPicClickRow(row: any): boolean {
  if (!row) return false;
  return isPicClickUrl((row.listingUrl as string | null | undefined) ?? (row.linkUrl as string | null | undefined) ?? null)
    || String(row.marketplace ?? "").toLowerCase().includes("picclick")
    || String(row.venue ?? "").toLowerCase().includes("picclick");
}
/* Durable purge: mark every stored PicClick finding/listing withheld
   (passed=1) so it renders nowhere and no refresh or sweep resurrects
   it, and mark PicClick deal alerts withheld by status. Idempotent —
   safe to run on every read and at the top of every capture path. */
async function ensurePicClickPurge(ctx: Ctx): Promise<void> {
  const db = ctx.db<typeof schema>();
  try {
    const dealRows = await db.select().from(schema.dealFeed);
    for (const d of dealRows as any[]) {
      if (d.passed !== 1 && isPicClickRow(d)) {
        await db.update(schema.dealFeed).set({ passed: 1 }).where(eq(schema.dealFeed.id, d.id));
      }
    }
    const listingRows = await db.select().from(schema.marketListings);
    for (const l of listingRows as any[]) {
      if (l.passed !== 1 && isPicClickRow(l)) {
        await db.update(schema.marketListings).set({ passed: 1 }).where(eq(schema.marketListings.id, l.id));
      }
    }
    try {
      const alertRows = await db.select().from(schema.dealAlerts);
      for (const a of alertRows as any[]) {
        if (a.status !== "withheld_picclick" && isPicClickUrl(a.listingUrl as string | null)) {
          await db.update(schema.dealAlerts).set({ status: "withheld_picclick" }).where(eq(schema.dealAlerts.id, a.id));
        }
      }
    } catch { /* alerts table present on all current DBs; best-effort */ }
  } catch { /* purge is best-effort alongside reads; read-time filters below are the second lock */ }
}

/* ——— Owner-reported ENDED listings (Oct 9, 2026 — the owner, with a
   screenshot of the Trenches queue: "these 3 are all ended listings") ———
   The liveness checker had kept all three on live surfaces: eBay
   bot-blocks the page fetch and ended listings keep surfacing in
   search results for days, so the cross-check read them as still
   listed. the owner's report is POSITIVE evidence of ending, so these
   exact listings are filed Gone/Expired here — the same lifecycle
   state a sweep's positive ended verdict produces:
   - Identification is the exact fingerprint from the owner's screenshot:
     card name + grade + asking price. A DIFFERENT live listing for
     the same card at a different price is a different listing and is
     never touched by this rule.
   - Matched rows in BOTH stores (deal_feed and market_listings) flip
     to status='gone' with ended_at + an owner-reported ended_reason.
     They leave Trenches, the pinned/Close tiers, the ledger's live
     segments, the Market Terminal and every count derived from live
     rows in the same read, and remain visible only in the ledger's
     Expired record. No replacement links are fabricated.
   - Deal alerts pointing at a matched listing URL are withheld
     (status='withheld_ended') so a dead deal stops alerting.
   - TERMINAL: an owner-reported-ended row is never auto-resurrected.
     The save paths (saveScoutFind / saveMarketListing / inline sweep)
     refuse its URL outright via isOwnerReportedEnded — even if a
     later search cross-check still surfaces the ended listing and
     calls it "live". Only the owner can bring a finding back, by marking
     it live himself (updateFindingStatus on a deal row).
   Idempotent — safe to run on every read and at the top of every
   capture path. */
const OWNER_REPORTED_ENDED: Array<{ name: string; gradeLabel: string; askingUsd: number }> = [
];
const OWNER_ENDED_REASON = "Owner reported this listing has ended — removed from Trenches, the live ledger tiers, the Market Terminal and every other live surface; kept only in the Expired record";
function normEndedName(s: string): string {
  return (s ?? "").toLowerCase().replace(/[—–]/g, "-").replace(/\s+/g, " ").trim();
}
function isOwnerReportedEnded(row: any): boolean {
  return !!row && row.status === "gone" && typeof row.endedReason === "string" && row.endedReason.startsWith("Owner reported this listing has ended");
}

/* ——— Owner-marked Closed / Ended (Oct 12, 2026 — the owner: "Should also
   have a btn for closed / ended and if clicked we won't see it again") ———
   The reason deliberately starts with the same "Owner reported this
   listing has ended" prefix, so isOwnerReportedEnded treats a row
   the owner marks Closed / Ended from the dashboard as TERMINAL everywhere
   the Oct 9 / Oct 10 owner-reported rows are terminal: saveScoutFind,
   saveMarketListing and the inline sweep refuse its URL forever,
   re-verification never touches Gone rows, and the row renders only
   in the ledger's Expired record. (The old UI "Mark gone" wrote a
   different reason, so sweeps could revive those rows on a live
   re-check — part of why the same cards kept popping up.) */
const OWNER_MARKED_ENDED_REASON = "Owner reported this listing has ended — marked Closed / Ended from the dashboard: terminal, never re-saved, re-pinned or resurrected by any sweep or refresh; kept only in the Expired record";

/* Canonical listing identity: marketplace URLs for the SAME listing
   differ only by tracking parameters (eBay ?_trkparms / ?_skw /
   ?itmmeta…, regional hosts like ebay.ie / ebay.de, Mercari query
   strings). Exact-string URL matching let the same listing slip past
   the pass / dedupe checks under a re-parameterized URL and pop back
   up as a "new" find — the repeat the owner reported on Oct 12, 2026
   (the stored data holds the same eBay item under several different
   query strings). The canonical key is the marketplace item
   identity: eBay /itm/<id>, Mercari /item/<id>, otherwise host +
   path with the query stripped. */
function canonicalListingKey(url: string | null | undefined): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const path = u.pathname.replace(/\/+$/, "");
    if (host.includes("ebay.")) {
      const m = path.match(/\/itm\/(?:[^/]*\/)?(\d{9,})/) ?? path.match(/(\d{9,})/);
      if (m) return `ebay:${m[1]}`;
    }
    if (host.includes("mercari.")) {
      const m = path.match(/\/item\/([A-Za-z0-9]+)/);
      if (m) return `mercari:${m[1]}`;
    }
    return `${host}${path}`;
  } catch {
    return url.split(/[?#]/)[0]!.toLowerCase();
  }
}
/* Dismissal keys across BOTH finding stores: canonical keys of every
   listing URL the owner has passed (passed=1 in either store) and every
   URL filed owner-ended. A row in one store whose canonical key is
   dismissed via its twin in the other store is the same listing he
   already dismissed — it renders nowhere live and is never re-saved. */
function dismissalKeys(dealRows: any[], listingRows: any[]): { passedKeys: Set<string>; ownerEndedKeys: Set<string> } {
  const passedKeys = new Set<string>();
  const ownerEndedKeys = new Set<string>();
  for (const r of [...dealRows, ...listingRows]) {
    if (!r?.listingUrl) continue;
    const k = canonicalListingKey(r.listingUrl as string);
    if (!k) continue;
    if (r.passed === 1) passedKeys.add(k);
    if (isOwnerReportedEnded(r)) ownerEndedKeys.add(k);
  }
  return { passedKeys, ownerEndedKeys };
}
function matchesOwnerEnded(name: string, gradeLabel: string | null | undefined, askingUsd: number | null | undefined): boolean {
  if (askingUsd == null) return false;
  const n = normEndedName(name);
  const g = (gradeLabel ?? "").trim().toLowerCase();
  return OWNER_REPORTED_ENDED.some(t => normEndedName(t.name) === n && t.gradeLabel.toLowerCase() === g && Math.abs(askingUsd - t.askingUsd) <= 0.51);
}
async function ensureOwnerReportedEnded(ctx: Ctx): Promise<void> {
  const db = ctx.db<typeof schema>();
  try {
    const nowIso = new Date().toISOString();
    const endedUrls = new Set<string>();
    const dealRows = await db.select().from(schema.dealFeed);
    for (const d of dealRows as any[]) {
      if (!matchesOwnerEnded(d.cardName as string, d.gradeLabel as string, d.askingUsd as number)) continue;
      if (d.listingUrl) endedUrls.add(d.listingUrl as string);
      if (d.status !== "gone") {
        await db.update(schema.dealFeed).set({ status: "gone", endedAt: "2026-10-09", endedReason: OWNER_ENDED_REASON, lastCheckAt: nowIso, verifyMissStreak: 0 }).where(eq(schema.dealFeed.id, d.id));
      }
    }
    const listingRows = await db.select().from(schema.marketListings);
    for (const l of listingRows as any[]) {
      if (!matchesOwnerEnded(l.subjectName as string, l.gradeLabel as string, l.askingUsd as number)) continue;
      if (l.listingUrl) endedUrls.add(l.listingUrl as string);
      if (l.status !== "gone") {
        await db.update(schema.marketListings).set({ status: "gone", endedAt: "2026-10-09", endedReason: OWNER_ENDED_REASON, lastCheckAt: nowIso, verifyMissStreak: 0 }).where(eq(schema.marketListings.id, l.id));
      }
    }
    if (endedUrls.size > 0) {
      try {
        const alertRows = await db.select().from(schema.dealAlerts);
        for (const a of alertRows as any[]) {
          if (a.status !== "withheld_ended" && a.listingUrl && endedUrls.has(a.listingUrl as string)) {
            await db.update(schema.dealAlerts).set({ status: "withheld_ended" }).where(eq(schema.dealAlerts.id, a.id));
          }
        }
      } catch { /* alerts table present on all current DBs; best-effort */ }
    }
  } catch { /* filing is best-effort alongside reads; the owner's report is re-applied on every load until it lands */ }
}

/* ——— Owner-reported ENDED — blanket filing ———
   The product supports a blanket owner report ("everything on file has
   ended") that files every stored finding/listing Gone with an
   owner-reported reason, terminally. The private deployment ran this
   once against its own data history; that filing is deployment data,
   not product code, so this export's ensure is a no-op kept for the
   call sites. The generic per-listing mechanisms (fingerprints above,
   Closed / Ended marking, dismissal keys) are unaffected. */
async function ensureOwnerReportedAllEnded(ctx: Ctx): Promise<void> {
  void ctx;
}

/* Demo export: the private deployment retires one specific closed
   auction alert here (a named lot on a named cert); the demo seed
   creates no auction alerts, so there is nothing deployment-specific
   to retire in this export. */
async function ensureClosedAuctionAlerts(ctx: Ctx): Promise<void> {
  void ctx;
}

/* ——— Scout sweeps (decoupled from the daily price refresh) ———
   ROOT CAUSE of the empty feed: sweeps ran only once a day on the 9am
   refresh, and under-market Buy-It-Now listings are sniped within hours,
   so a daily sweep structurally misses them. Sweeps now run every ~2
   hours (12/day), newly-listed BIN / fixed-price first. Each sweep is
   logged per scout in scout_sweeps. */
/* ——— Scout configuration (Oct 14, 2026 — spec R.3) ———
   Defaults = current behavior: active, all focus groups, no ceiling,
   default Tier 1 threshold (15%), territory marketplaces. A config row
   exists only once the owner saves a setup for that scout. */
type ScoutConfig = { scoutId: string; isActive: boolean; focusGroups: string[]; ceilingUsd: number | null; tier1DiscountPct: number | null; marketplaces: string; hasSavedConfig: boolean };
function defaultScoutConfig(scoutId: string): ScoutConfig {
  return { scoutId, isActive: true, focusGroups: [], ceilingUsd: null, tier1DiscountPct: null, marketplaces: "", hasSavedConfig: false };
}
async function scoutConfigMap(ctx: Ctx): Promise<Map<string, ScoutConfig>> {
  const m = new Map<string, ScoutConfig>();
  try {
    const db = ctx.db<typeof schema>();
    const rows = await db.select().from(schema.scoutConfigs);
    for (const r of rows as any[]) {
      m.set(r.scoutId as string, {
        scoutId: r.scoutId as string,
        isActive: (r.isActive as number) !== 0,
        focusGroups: String(r.focusGroups ?? "").split(",").map((s: string) => s.trim()).filter(Boolean),
        ceilingUsd: (r.ceilingUsd as number | null) ?? null,
        tier1DiscountPct: (r.tier1DiscountPct as number | null) ?? null,
        marketplaces: (r.marketplaces as string) ?? "",
        hasSavedConfig: true,
      });
    }
  } catch { /* config table just migrated */ }
  return m;
}
/* Revalue today's portfolio snapshot after a disposition (sold/traded)
   changes the active set — same pattern as updateCardValue. */
async function revalueTodaySnapshot(ctx: Ctx) {
  try {
    const db = ctx.db<typeof schema>();
    const today = new Date().toISOString().slice(0, 10);
    const fresh = await db.select().from(schema.cards);
    const pricedVals = (fresh as any[]).filter((r: any) => r.status === "active").map((r: any) => effectiveOf(r)).filter((v: number | null) => v != null) as number[];
    const total = Math.round(pricedVals.reduce((s: number, v: number) => s + v, 0) * 100) / 100;
    const snaps = await db.select().from(schema.portfolioSnapshots);
    const todaySnap = (snaps as any[]).find((s: any) => s.snapshotDate === today);
    if (todaySnap && total > 0) {
      await db.update(schema.portfolioSnapshots).set({ totalUsd: total, pricedCount: pricedVals.length }).where(eq(schema.portfolioSnapshots.id, todaySnap.id));
    } else if (total > 0) {
      await db.insert(schema.portfolioSnapshots).values({ snapshotDate: today, totalUsd: total, pricedCount: pricedVals.length, note: "Revalued after an owner disposition (sold / traded away) changed the active collection." });
    }
  } catch { /* best-effort alongside the disposition write */ }
}
const SCOUT_SOURCES: Record<string, string> = {
  gengar: "eBay (newly listed BIN, graded slabs) · Fanatics Collect · Mercari US",
  pikachu: "TCGplayer (newly listed) · eBay (newly listed BIN, raw) · Mercari US",
  eevee: "Yahoo Japan · Mercari JP · eBay JP sellers (newly listed first)",
  snorlax: "eBay sealed (newly listed BIN) · TCGplayer sealed · Pokemon Center (MSRP)",
  rocket: "Red team — the live deal feed, the holdings list and the Pump Detector's factors (no marketplaces: Rocket buys nothing, pins nothing)",
};
function fmtSweepLabel(sweptAt: string | null, candidates: number, finds: number): string {
  if (!sweptAt) return "No sweep logged yet — first 2-hourly sweep pending";
  const d = new Date(sweptAt);
  const t = isNaN(d.getTime()) ? sweptAt : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return `Swept ${t} — ${candidates} candidate${candidates === 1 ? "" : "s"}, ${finds} under market`;
}
/* ——— Scout announcements are DERIVED from posted rows (Oct 13, 2026 —
   the owner: "How come the scouts say they find stuff and it doesn't
   post?") ———
   ROOT CAUSE: the scout card / roaming-bubble status line was written
   ONCE by saveScoutFind at save time, from the discount tier alone,
   and never revisited. Three decouplings made it lie:
   1. A Tier 1 price was announced as "Found one / pinned" even when
      the capture-time liveness check was INCONCLUSIVE (the common
      case — marketplaces bot-block the checker). The page renders any
      deal without a positive verified-live stamp as Stale, and every
      live surface (Pinned, Close, digest, Trenches) excludes stale —
      so the announced find never posted as a deal; it sat in the
      Stale bucket while the scout kept announcing it.
   2. Nothing ever cleared the line when the find later ended, went
      stale, or was passed — scouts kept announcing Oct 10 finds that
      were sitting in Expired.
   3. saveSweepResults merged deep-hunt find counts on faith, so the
      sweep log could claim finds no save ever posted.
   FIX: this helper recomputes each scout's announcement on EVERY
   read from the ledger-mapped deals (whose statuses already carry
   the read-time staleness adjustment) plus the latest sweep row.
   An announcement can therefore never outlive, or outrun, the rows
   actually posted. Rocket never pins — his stored line is kept. */
function derivedScoutStatusLine(scout: any, mappedDeals: any[], latestSweep: any): string {
  const stored = (scout.statusLine as string) ?? "";
  if (scout.scoutId === "rocket") return stored;
  const mine = mappedDeals.filter((d: any) => d.scoutId === scout.scoutId && d.listingUrl);
  const isLive = (d: any) => d.status !== "gone" && d.status !== "bought" && d.status !== "stale";
  const money = (n: number) => `$${Number(n).toLocaleString("en-US")}`;
  const pinnedLive = mine.find((d: any) => isLive(d) && d.tier === 1);
  if (pinnedLive) {
    return `Found one: ${pinnedLive.cardName}${pinnedLive.gradeLabel ? " " + pinnedLive.gradeLabel : ""} at ${pinnedLive.marketplace} for ${money(pinnedLive.askingUsd)}${pinnedLive.discountPct != null ? ` — ${Number(pinnedLive.discountPct).toFixed(0)}% under comp` : ""}. Listing linked in the deal feed.`;
  }
  const closeLive = mine.find((d: any) => isLive(d) && d.tier !== 1);
  if (closeLive) {
    return `Found a close one: ${closeLive.cardName}${closeLive.gradeLabel ? " " + closeLive.gradeLabel : ""} at ${closeLive.marketplace} for ${money(closeLive.askingUsd)}${closeLive.discountPct != null ? ` — ${Number(closeLive.discountPct).toFixed(0)}% under comp` : ""}, posted in the Ledger's Close tab. Still watching.`;
  }
  const staleFind = mine.find((d: any) => d.status === "stale");
  if (staleFind) {
    return `Unverified find on file: ${staleFind.cardName} at ${staleFind.marketplace} for ${money(staleFind.askingUsd)} — filed as Stale in the Findings Ledger because the listing checker could not positively verify it live, so it is NOT pinned as a deal. Still watching.`;
  }
  if (/^Found one/i.test(stored)) {
    // The stored line announces a find that is no longer posted live
    // (ended / expired / passed since) — replace the ghost claim with
    // what the latest sweep actually did.
    const when = latestSweep?.sweptAt ? new Date(latestSweep.sweptAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : null;
    return `No live find posted right now — the last find on file has ended and sits in the Ledger's Expired section${when ? `; latest sweep ${when} checked ${latestSweep.candidatesSeen ?? 0} candidates and posted no new live deal` : ""}. Still watching.`;
  }
  return stored;
}
function tierFor(discountPct: number | null, hasLink: boolean, underMaxBuy: boolean, tier1Min = 15, tier2Min = 8): number {
  if (!hasLink) return 0;
  if (discountPct != null && discountPct >= tier1Min) return 1;
  if ((discountPct != null && discountPct >= tier2Min) || underMaxBuy) return 2;
  return 2; // linked but below the Tier 2 floor — still shown as a close look, labelled with its real %
}
/* Lock system REMOVED (Oct 14, 2026 — the owner: "Shouldn't be locked
   anyways. I want this to be more automated, regardless if price
   isn't right"): no cert is pinned. Every card floats to verified
   comps under the normal rules. Historical kept-value evidence rows
   stay on record as context and stay excluded from comps by the
   classifiers; they pin nothing. */

/* ——— Findings Ledger helpers ———
   The ledger is the durable record for every scout finding: deal_feed rows
   ARE the ledger (one row per listing URL, deduped). Status lifecycle:
   new (latest sweep) -> live (re-verified later) -> price_dropped (same
   URL, lower ask, prev price kept) -> gone (link dead / ended, kept for
   record, not actionable) -> bought (acted). Passed stays passed=1 and
   renders nowhere, per the owner's rule. Sightings (no link) never count. */
function targetGroupFor(name: string, subjectKey?: string | null, kindHint?: string | null): string {
  const n = (name ?? "").toLowerCase();
  if (subjectKey && subjectKey.startsWith("owned-")) return "Collection — sell-side";
  if (kindHint === "vending" || n.includes("vending")) return "Japanese Vending Series";
  if (kindHint === "wc" || n.includes("silver-border wc") || n.includes("world championship")) return "Silver-Border WC";
  if (n.includes("lv.x") || n.includes("lvx")) return "LV.X lag";
  if (n.includes("southern islands")) return "Southern Islands";
  if (n.includes("crystal") || n.includes("aquapolis") || n.includes("skyridge") || n.includes("e-series")) return "e-Series / Crystal";
  if (n.includes("prime") || n.includes("call of legends") || n.includes("hgss")) return "HGSS Primes";
  if (n.includes("cosmic eclipse") || n.includes("sun & moon")) return "Sun & Moon mid-modern";
  if (n.includes("xy secret")) return "XY Secret Rares";
  if (n.includes("japanese") || n.includes("yahoo") || n.includes("mercari jp")) return "Japanese imports";
  if (n.includes("sealed") || n.includes("booster box") || n.includes("anniversary")) return "Sealed";
  if (n.includes("151")) return "151 second-tier";
  if (subjectKey && subjectKey.startsWith("watch-")) return "Watchlist";
  return "Watchlist";
}
function ledgerStatusFor(row: any, latestSweepDate: string | null): string {
  const existing = (row.status as string) ?? "";
  if (existing === "bought" || existing === "gone" || existing === "price_dropped") return existing;
  if (!row.listingUrl) return "sighting";
  if (latestSweepDate && (row.firstFoundAt ?? row.foundAt) === latestSweepDate) return "new";
  if (existing === "new" || existing === "live") return existing;
  return latestSweepDate && (row.foundAt as string) >= latestSweepDate ? "new" : "live";
}
async function ensureLedgerBackfill(ctx: Ctx) {
  const db = ctx.db<typeof schema>();
  const dealRows = await db.select().from(schema.dealFeed);
  const sweepRows = await db.select().from(schema.scoutSweeps).orderBy(desc(schema.scoutSweeps.id)).limit(1);
  const latestSweepDate = (sweepRows as any[])[0]?.sweptAt ? String((sweepRows as any[])[0].sweptAt).slice(0, 10) : null;
  const watchRows = await db.select().from(schema.watchlist);
  const watchKindByName = new Map<string, string>();
  for (const w of watchRows as any[]) watchKindByName.set((w.name as string).toLowerCase(), w.kind as string);
  for (const d of dealRows as any[]) {
    const patch: any = {};
    if (!d.firstFoundAt) patch.firstFoundAt = d.foundAt;
    if (!d.lastSeenAt) patch.lastSeenAt = d.checkedDate ?? d.foundAt;
    if (!d.targetGroup) {
      const kindHint = watchKindByName.get((d.cardName as string).toLowerCase()) ?? null;
      patch.targetGroup = targetGroupFor(d.cardName as string, d.subjectKey ?? null, kindHint);
    }
    const wantStatus = ledgerStatusFor(d, latestSweepDate);
    if (!d.status || d.status === "new" || d.status === "live" || d.status === "sighting") {
      if (d.status !== wantStatus) patch.status = wantStatus;
    }
    if (Object.keys(patch).length > 0) {
      await db.update(schema.dealFeed).set(patch).where(eq(schema.dealFeed.id, d.id));
    }
  }
  const listingRows = await db.select().from(schema.marketListings);
  for (const l of listingRows as any[]) {
    const patch: any = {};
    if (!l.firstFoundAt) patch.firstFoundAt = l.foundAt;
    if (!l.status) patch.status = "live";
    if (Object.keys(patch).length > 0) await db.update(schema.marketListings).set(patch).where(eq(schema.marketListings.id, l.id));
  }
}

/* ——— Inline scout hunt (the fix for "sweeps log but never hunt") ———
   ROOT CAUSE found Oct 8, 2026 (the owner: "How come the scouts haven't found
   anything? Are they actually working??"): scoutSweep previously did NO
   hunting itself — it inserted placeholder sweep rows with 0 candidates
   and tried to hand the hunt to a background agent via
   ctx.agent.send({ title, prompt }). That call shape is wrong for the
   SDK: AgentClient takes spawnTask(message: string, { expectsAction,
   dedupeKey }). The bad call failed, the bare catch {} swallowed it, no
   expectsAction contract was ever set, and saveSweepResults was never
   called — so every sweep sat at 0 candidates / 0 finds forever and
   market_listings stayed empty while the UI claimed the scouts were
   hunting. The cron WAS firing; the hunt pipeline behind it was dead.
   FIX: every scoutSweep now hunts INLINE via ctx.tool.web_search over a
   rotating slice of subjects, extracts listings with ctx.inference under
   strict rules (price must be stated in the result; the URL must be a
   verbatim listing-page URL from the search results — enforced in code,
   not just in the prompt), persists real listings/finds, and logs REAL
   counts. A deeper background hunt is still dispatched afterwards, now
   with the correct spawnTask API + expectsAction contract, and its
   dispatch result is written into the log instead of being swallowed. */
type HuntSubject = {
  subjectKey: string; displayName: string; queryName: string; gradeLabel: string;
  marketUsd: number | null; maxBuy: number | null; scoutId: string;
};
function parseMaxBuy(priceContext: string): number | null {
  const m = priceContext.match(/MAX BUY \$([\d,]+)/i);
  return m ? parseFloat(m[1]!.replace(/,/g, "")) : null;
}
function watchMarketOf(priceContext: string): number | null {
  const rangeM = priceContext.match(/\$([\d,]+)\s*[–-]\s*\$([\d,]+)/);
  const maxM = priceContext.match(/MAX BUY \$([\d,]+)/i);
  if (rangeM && maxM) return Math.round(((parseFloat(rangeM[1]!.replace(/,/g, "")) + parseFloat(rangeM[2]!.replace(/,/g, ""))) / 2) * 100) / 100;
  const firstM = priceContext.match(/\$([\d,]+(?:\.\d+)?)/);
  return firstM ? parseFloat(firstM[1]!.replace(/,/g, "")) : null;
}
function queryNameForWatch(name: string): string {
  const afterDash = name.includes("—") ? (name.split("—")[1] ?? name) : name;
  return afterDash.split("·")[0]!.replace(/\([^)]*\)/g, "").trim() || name;
}
function isListingPageUrl(url: string): boolean {
  if (isPicClickUrl(url)) return false; // PicClick is not served — never a listing page (Oct 9, 2026)
  const u = url.toLowerCase();
  if (u.includes("/sch/") || u.includes("search?") || u.includes("/search/")) return false;
  return u.includes("/itm/") || u.includes("/item/") || u.includes("tcgplayer.com/product") || u.includes("mercari.com/item") || u.includes("auctions.yahoo.co.jp") || u.includes("page.auctions.yahoo") || u.includes("fanaticscollect.com/") || u.includes("/listing") || u.includes("cardmarket.com/en/pokemon/products");
}
/* ——— LIVENESS VERIFICATION — never POST an ended listing ———
   the owner's rule (Oct 8, 2026): "Make sure we're not posting ended
   listings." Enforced end-to-end, in code, at three points:
   1. CAPTURE: before a finding is first posted anywhere (pinned deal
      feed, Close tier, Findings Ledger as live, Market Terminal
      listings) its listing page is checked. A page that 404s, redirects
      away from the listing, or reads sold / ended / out of stock is
      NEVER posted as live — the row is stored directly as Gone with
      the reason, or dropped.
   2. RE-VERIFY: every scoutSweep (2-hourly) re-checks EVERY currently
      live finding's URL again; anything POSITIVELY shown ended / sold
      flips to Gone in that same sweep (pinned feed + Terminal drop it
      immediately, the ledger keeps it under Expired, not actionable).
   3. FRESHNESS: every live row carries last_verified_live_at — stamped
      ONLY by a positive live verdict, never by an inconclusive check —
      shown on the card, so proof age is always visible.
   Check method: direct fetch of the listing page — HTTP status,
   redirect target, ended/sold phrase scan, bot-wall detection, and a
   known-end-time harvest. Many marketplaces bot-block plain fetches
   (401/403/429, a network reset, or an HTTP 200 bot-wall page like
   eBay's "Pardon our interruption"); that alone is INCONCLUSIVE,
   never proof of ended, and never proof of live either. A blocked or
   failed check falls back to live-search evidence: still surfacing
   (exact URL / same-host listing id) = live; not surfacing = UNKNOWN.
   TIGHTENED Oct 9, 2026 (the owner: "Still lots of ended lots or dead
   links"): the Oct 9 fail-open fix had no memory and no deadline, so
   a dead eBay listing — bot-blocked on every fetch, invisible to the
   search cross-check — stayed "unknown" and therefore pinned FOREVER,
   and HTTP 200 bot-wall pages were even stamped as fresh "verified
   live" proof. The state machine in reverifyAllLiveListings now
   remembers: each inconclusive check increments verify_miss_streak.
   A single blocked check still never unpins anything (the Ditto
   lesson), but 3 consecutive unverifiable sweeps (~6h) DEMOTE the row
   to 'stale' — out of the pinned feed, Close tier, Trenches, the
   Market Terminal and the live-deals count, kept in the ledger as
   "Stale — unverified" with its link still openable — and 72 hours
   with NO positive live proof RETIRES it to Gone as a presumed
   ended/dead link. A known auction end time (ends_at, supplied at
   save time or harvested from the page) in the past is positive
   evidence and expires the lot immediately, no fetch needed. Any
   later positive live check restores a stale row automatically.
   Read-time backstop in getPortfolio: a row whose last positive proof
   is >30h old is reported as 'stale' even between sweeps, so nothing
   unverified for a day+ ever renders as a live deal.
   BUG FIXED Oct 9, 2026 (the owner: "I don't see the listings found being
   pinned"): the previous code treated "unreachable AND no longer
   surfacing in search" as ended. eBay 403s these fetches and live
   listings routinely don't surface in a search for their own URL, so
   the 05:45 UTC liveness pass flipped Gengar's live pinned Ditto deal
   (pinned 05:42, 77% under comp) to Gone and it vanished from the
   feed. ensureLivenessRepair below restores rows killed that way. */
type LivenessResult = { state: "live" | "ended" | "unknown"; reason: string; checkedAt: string; endsAt: string | null };
const MISS_STREAK_DEMOTE = 3; // consecutive inconclusive sweeps before demotion to 'stale'
const STALE_RETIRE_MS = 72 * 3600 * 1000; // no positive live proof for 72h -> retired as presumed ended
const READ_STALE_MS = 30 * 3600 * 1000; // read-time backstop: proof older than this renders 'stale'
const ENDED_PHRASES = [
  "this listing has ended", "this listing was ended", "listing has ended",
  "this listing was ended by the seller", "ended by the seller",
  "this item has ended", "auction has ended", "bidding has ended",
  "bidding is closed", "bidding closed", "auction is closed", "this auction is closed",
  "auction closed", "auction has concluded", "lot has closed", "this lot is closed", "lot closed", "this lot has closed",
  "no longer available", "item is no longer available", "this item is not available", "item not available",
  "this item is sold", "already sold", "this item has been sold", "out of stock", "sold out",
  "this listing is no longer available", "listing ended", "sale ended", "no longer for sale",
  "listing has been removed", "listing was removed", "this page is no longer available",
];
/* Bot-wall markers: an HTTP 200 page carrying one of these is a
   marketplace block page (eBay "Pardon our interruption", Cloudflare /
   DataDome challenges), NOT the listing — unless the page ALSO carries
   a real live-sale signal, in which case the listing genuinely loaded. */
const BOT_WALL_MARKERS = [
  "pardon our interruption", "verify you are a human", "are you a robot",
  "unusual traffic from your computer", "performing security verification",
  "just a moment...", "attention required", "access denied",
  "please verify you are a human", "bot detection", "incident id:",
];
const LIVE_SIGNALS = [
  "buy it now", "add to cart", "place bid", "make offer", "add to watchlist",
  "best offer", "buy now", "current bid", "time left", "watch this item",
];
/* Harvest a known end time from a loaded listing page. Conservative on
   purpose: structured ISO fields (eBay/Fanatics embed endDate/endTime)
   or an explicit "closes/ends <Month D, YYYY>" phrase. Anything else
   returns null — a guessed end time would expire live lots. */
function harvestEndsAt(text: string): string | null {
  const iso = text.match(/(?:endDate|endTime|endsAt|auctionEnd|end_time)["'\s:=]+(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)/i);
  if (iso) { const d = new Date(iso[1]!); if (!isNaN(d.getTime())) return d.toISOString(); }
  const months = "january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec";
  const named = text.match(new RegExp(`(?:closes|closing|ends|ending|auction ends|end time)[^<>{}]{0,80}?\\b((?:${months})\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4})`, "i"));
  if (named) { const d = new Date(`${named[1]}T23:59:59Z`); if (!isNaN(d.getTime())) return d.toISOString(); }
  return null;
}
/* Age (ms) of a row's last POSITIVE live proof. Proof = the verified
   stamp; a row never positively verified falls back to its first-found
   date (midnight UTC). Null when neither exists (age unknown). */
function proofAgeMs(row: any, nowMs: number): number | null {
  const stamp = (row.lastVerifiedLiveAt as string | null) ?? null;
  if (stamp) { const t = new Date(stamp).getTime(); if (!isNaN(t)) return nowMs - t; }
  const found = (row.firstFoundAt as string | null) ?? (row.foundAt as string | null) ?? null;
  if (found) { const t = new Date(found.length <= 10 ? `${found}T00:00:00Z` : found).getTime(); if (!isNaN(t)) return nowMs - t; }
  return null;
}
/* Read-time staleness: live-ish rows (deals or listings) whose proof is
   older than READ_STALE_MS report as 'stale' without mutating the DB —
   the sweep state machine owns the stored transition. */
function effectiveLiveStatus(row: any, nowMs: number): string {
  const s = (row.status as string) || "live";
  if (s !== "new" && s !== "live" && s !== "price_dropped") return s;
  const age = proofAgeMs(row, nowMs);
  return age != null && age > READ_STALE_MS ? "stale" : s;
}
function listingIdOf(url: string): string | null {
  const m = url.match(/\/itm\/(?:[^/]+\/)?(\d{9,})/) ?? url.match(/[?&](?:item|itemid|product_id|id)=(\d{6,})/i) ?? url.match(/tcgplayer\.com\/product\/(\d+)/i) ?? url.match(/\/item\/([a-z0-9]{8,})/i);
  return m ? m[1]! : null;
}
async function fetchListingPage(url: string): Promise<{ status: number; finalUrl: string; text: string } | { error: string }> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const res: any = await (globalThis as any).fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timer);
    let text = "";
    try { text = String(await res.text()).slice(0, 300000); } catch { text = ""; }
    return { status: res.status as number, finalUrl: (res.url as string) || url, text };
  } catch (e) {
    return { error: e instanceof Error ? e.message.slice(0, 120) : "fetch failed" };
  }
}
async function searchStillLists(ctx: Ctx, url: string): Promise<boolean> {
  const id = listingIdOf(url);
  const hostOf = (u: string): string => { try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } };
  const wantHost = hostOf(url);
  // STRICT match: a result only counts as live evidence when it is the
  // exact listing URL, or a URL on the SAME marketplace host carrying
  // the SAME listing id. (An id substring on an unrelated domain —
  // e.g. "000000000000" inside a fan-site URL — is not evidence.)
  const matches = (results: any[]): boolean => results.some((r: any) => {
    if (typeof r.url !== "string") return false;
    if (r.url === url) return true;
    if (!id) return false;
    return hostOf(r.url) === wantHost && r.url.includes(id);
  });
  // Two queries: the listing id, then the verbatim URL itself. A single
  // ID search routinely misses live listings; the URL query catches the
  // ones the ID query drops.
  const queries = id ? [`"${id}" pokemon card`, `"${id}"`, url] : [url];
  for (const q of queries) {
    try {
      const res: any = await ctx.tool.web_search(q, { timeout_secs: 25 });
      const results: any[] = res?.content?.results ?? [];
      if (matches(results)) return true;
    } catch { /* one failed query is not evidence either way — try the next */ }
  }
  return false;
}
async function verifyListingLive(ctx: Ctx, url: string, opts: { freshEvidence: boolean }): Promise<LivenessResult> {
  const checkedAt = new Date().toISOString();
  const blockedFallback = async (why: string): Promise<LivenessResult> => {
    // The checker never saw the listing page. Fall back to live-search
    // evidence: still surfacing (exact URL / same-host listing id) is
    // positive live evidence; not surfacing is UNKNOWN — never ended on
    // its own, and (tightened Oct 9) never upgraded to "live" just
    // because a caller captured the URL from a search snippet in this
    // pass: search indexes serve ended listings for days. Callers with
    // freshEvidence get the UNKNOWN and decide (the inline sweep files
    // it as stale/unverified; an agent that personally opened the page
    // may still post it, but without a verified-live stamp).
    const still = await searchStillLists(ctx, url);
    const when = opts.freshEvidence ? "capture-time check" : "re-verification";
    return still
      ? { state: "live", reason: `${why}; the listing still surfaces in live search results (exact URL / listing id match)`, checkedAt, endsAt: null }
      : { state: "unknown", reason: `${why} and the listing did not surface in a search cross-check (${when}) — inconclusive, NOT treated as ended (marketplaces bot-block these fetches and live listings often don't surface by URL search); the miss is counted toward demotion/retirement by the re-verification state machine`, checkedAt, endsAt: null };
  };
  const page = await fetchListingPage(url);
  if (!("error" in page)) {
    const { status, finalUrl, text } = page;
    if (status === 404 || status === 410) {
      return { state: "ended", reason: `Listing page returned HTTP ${status} — the listing is gone`, checkedAt, endsAt: null };
    }
    // Redirected away from the listing page (to search / home / category)
    if (finalUrl && finalUrl !== url) {
      const id = listingIdOf(url);
      const keptId = id ? finalUrl.includes(id) : isListingPageUrl(finalUrl);
      if (!keptId) return { state: "ended", reason: "Listing URL redirects away from the listing page (to search/home) — treated as ended", checkedAt, endsAt: null };
    }
    if (status === 200) {
      const scan = text.slice(0, 200000).toLowerCase();
      const hit = ENDED_PHRASES.find(p => scan.includes(p));
      if (hit) return { state: "ended", reason: `Listing page says "${hit}" — ended / sold`, checkedAt, endsAt: null };
      // Bot-wall on HTTP 200 (e.g. eBay's "Pardon our interruption"):
      // the checker saw a block page, not the listing. Without a real
      // live-sale signal on the page this is INCONCLUSIVE — the old
      // code called any clean 200 "live" and stamped fresh proof for
      // pages it never actually saw, which kept dead links looking
      // freshly verified.
      const wall = BOT_WALL_MARKERS.find(m => scan.includes(m));
      const hasSignal = LIVE_SIGNALS.some(s => scan.includes(s));
      if (wall && !hasSignal) {
        return blockedFallback(`Listing page returned a bot-wall page ("${wall}") instead of the listing`);
      }
      return { state: "live", reason: "Listing page resolves and shows the item for sale (no ended/sold signals)", checkedAt, endsAt: harvestEndsAt(text) };
    }
    // Every other non-200 — 401/403/429 bot protection, other 4xx, 5xx
    // marketplace error pages — is INCONCLUSIVE: the checker never saw
    // the listing page, so it cannot call the listing ended OR live.
    return blockedFallback(`Direct page check was blocked (HTTP ${status})`);
  }
  // Network-level failure: inconclusive on its own.
  return blockedFallback(`Direct page check failed (${page.error})`);
}

/* Re-verify EVERY actionable finding (deal_feed + market_listings) —
   the tightened liveness state machine:
   - POSITIVE ENDED (404/410, ended/sold page text, redirect away, or a
     known ends_at now in the past) -> Gone immediately, with reason.
   - POSITIVE LIVE (page loaded clean, or exact search surfacing) ->
     fresh last_verified_live_at stamp (the ONLY way that stamp moves),
     miss streak reset to 0, and a 'stale' row is restored to live.
   - INCONCLUSIVE (bot-blocked / unreachable / bot-wall page) -> miss
     streak +1. One blocked check never unpins anything; at
     MISS_STREAK_DEMOTE consecutive misses the row is DEMOTED to
     'stale' (out of every live surface, kept in the ledger); at 72h
     with no positive proof it is RETIRED to Gone as a presumed
     ended/dead link. EXCEPTION (Oct 10, 2026): market_listings rows
     that are NOT deal findings (Terminal census rows) do not build a
     miss streak and are never demoted/retired on inconclusive checks
     — they leave only on positive ended evidence or a week without
     sweep capture. Shared by scoutSweep (every 2h sweep), the
     standalone verifyLiveness action, and save paths. */
type ReverifyResult = { checked: number; stillLive: number; expired: number; inconclusive: number; demoted: number; restored: number; retired: number; expiredNames: string[]; demotedNames: string[] };
async function reverifyAllLiveListings(ctx: Ctx): Promise<ReverifyResult> {
  const db = ctx.db<typeof schema>();
  const now = new Date().toISOString();
  const nowMs = Date.now();
  const today = now.slice(0, 10);
  const deals = await db.select().from(schema.dealFeed);
  const listings = await db.select().from(schema.marketListings);
  const byUrl = new Map<string, LivenessResult>();
  const check = async (url: string): Promise<LivenessResult> => {
    const hit = byUrl.get(url);
    if (hit) return hit;
    const r = await verifyListingLive(ctx, url, { freshEvidence: false });
    byUrl.set(url, r);
    return r;
  };
  let checked = 0; let stillLive = 0; let expired = 0; let inconclusive = 0; let demoted = 0; let restored = 0; let retired = 0;
  const expiredNames: string[] = []; const demotedNames: string[] = [];
  // One verdict application, shared by both tables: table-specific
  // writers are passed in so the state machine lives in exactly one
  // place.
  const applyVerdict = async (
    row: any,
    write: (patch: any) => Promise<void>,
  ): Promise<void> => {
    const url = row.listingUrl as string;
    // Known end time in the past = positive evidence — no fetch needed.
    const endsAt = (row.endsAt as string | null) ?? null;
    if (endsAt) {
      const endMs = new Date(endsAt).getTime();
      if (!isNaN(endMs) && endMs < nowMs) {
        expired++; expiredNames.push((row.cardName ?? row.subjectName) as string);
        await write({ status: "gone", endedAt: today, endedReason: `Known auction/listing end time (${endsAt}) has passed — lot closed`, lastCheckAt: now, verifyMissStreak: 0 });
        return;
      }
    }
    checked++;
    const r = await check(url);
    if (r.state === "ended") {
      expired++; expiredNames.push((row.cardName ?? row.subjectName) as string);
      await write({ status: "gone", endedAt: today, endedReason: r.reason, lastCheckAt: r.checkedAt, verifyMissStreak: 0 });
    } else if (r.state === "live") {
      stillLive++;
      const wasStale = row.status === "stale";
      if (wasStale) restored++;
      await write({
        lastVerifiedLiveAt: r.checkedAt, lastCheckAt: r.checkedAt, verifyMissStreak: 0, endedAt: null, endedReason: null,
        ...(r.endsAt ? { endsAt: r.endsAt } : {}),
        ...(wasStale ? { status: "live" } : row.status === "new" ? { status: "live" } : {}),
      });
    } else {
      inconclusive++;
      const streak = ((row.verifyMissStreak as number | null) ?? 0) + 1;
      const age = proofAgeMs(row, nowMs);
      if (age != null && age > STALE_RETIRE_MS) {
        // 72h without a single positive live proof, across many checks:
        // retired as a presumed ended/dead link. This is a pattern of
        // evidence, not one blocked fetch.
        retired++; expired++; expiredNames.push((row.cardName ?? row.subjectName) as string);
        await write({ status: "gone", endedAt: today, endedReason: `Retired as presumed ended/dead link: no positive live verification in over 72 hours across ${streak} consecutive inconclusive checks (last check: ${r.reason})`, lastCheckAt: r.checkedAt, verifyMissStreak: streak });
      } else if (streak >= MISS_STREAK_DEMOTE && row.status !== "stale") {
        demoted++; demotedNames.push((row.cardName ?? row.subjectName) as string);
        await write({ status: "stale", lastCheckAt: r.checkedAt, verifyMissStreak: streak });
      } else {
        await write({ lastCheckAt: r.checkedAt, verifyMissStreak: streak });
      }
    }
  };
  for (const d of deals as any[]) {
    if (d.passed === 1 || !d.listingUrl) continue;
    if (isPicClickRow(d)) continue; // PicClick is not served — the purge marks these passed; never re-verify or restore them
    if (d.status === "gone" || d.status === "bought") continue;
    await applyVerdict(d, async (patch) => {
      const p: any = { ...patch };
      // lastSeenAt moves only on a positive live verdict — a demoted or
      // retired row keeps the date it was last genuinely seen live.
      if (patch.lastVerifiedLiveAt) p.lastSeenAt = today;
      await db.update(schema.dealFeed).set(p).where(eq(schema.dealFeed.id, d.id));
    });
  }
  // A URL shared by a deal row and a listing row reuses the one verdict
  // (byUrl cache) — counts were attributed to the deal row already, so
  // listing rows sharing a checked URL apply the same transition
  // without double-counting.
  const countedUrls = new Set(byUrl.keys());
  // TERMINAL-ONLY rows (Oct 10, 2026): a market_listings row whose URL
  // is not also a deal finding is census data, not a deal alert. The
  // strict miss-streak → stale → 72h-retire machine stays on DEAL rows;
  // a Terminal-only row leaves only on POSITIVE ended evidence (404 /
  // ended page / known end time past) or a week without any sweep
  // capture (read-time freshness in getPortfolio). An inconclusive
  // (bot-blocked) check records last_check_at and nothing else — a
  // blocked checker must not starve the Terminal the way it did when
  // every unverifiable capture was filed Stale and hidden.
  const dealUrlSet = new Set((deals as any[]).filter(d => d.passed !== 1 && d.listingUrl).map(d => d.listingUrl as string));
  for (const l of listings as any[]) {
    if (l.passed === 1 || !l.listingUrl) continue;
    if (isPicClickRow(l)) continue; // PicClick is not served — withheld by the purge, never re-verified back to live
    if (l.status === "gone") continue;
    if (!dealUrlSet.has(l.listingUrl as string)) {
      // Terminal-only census row: positive evidence only (see above).
      const endsAtT = (l.endsAt as string | null) ?? null;
      if (endsAtT && new Date(endsAtT).getTime() < nowMs) {
        expired++; expiredNames.push(l.subjectName as string);
        await db.update(schema.marketListings).set({ status: "gone", endedAt: today, endedReason: `Known auction/listing end time (${endsAtT}) has passed — lot closed`, lastCheckAt: now, verifyMissStreak: 0 }).where(eq(schema.marketListings.id, l.id));
        continue;
      }
      checked++;
      const r = await check(l.listingUrl as string);
      if (r.state === "ended") {
        expired++; expiredNames.push(l.subjectName as string);
        await db.update(schema.marketListings).set({ status: "gone", endedAt: today, endedReason: r.reason, lastCheckAt: r.checkedAt, verifyMissStreak: 0 }).where(eq(schema.marketListings.id, l.id));
      } else if (r.state === "live") {
        stillLive++;
        if (l.status === "stale") restored++;
        await db.update(schema.marketListings).set({ lastVerifiedLiveAt: r.checkedAt, lastCheckAt: r.checkedAt, lastSweptAt: now, verifyMissStreak: 0, endedAt: null, endedReason: null, ...(r.endsAt ? { endsAt: r.endsAt } : {}), ...(l.status === "stale" || l.status === "new" ? { status: "live" } : {}) }).where(eq(schema.marketListings.id, l.id));
      } else {
        inconclusive++;
        await db.update(schema.marketListings).set({ lastCheckAt: r.checkedAt }).where(eq(schema.marketListings.id, l.id));
      }
      continue;
    }
    const shared = countedUrls.has(l.listingUrl as string);
    if (shared) {
      // Apply the cached verdict's transition silently (no recount).
      const endsAt = (l.endsAt as string | null) ?? null;
      if (endsAt && new Date(endsAt).getTime() < nowMs) {
        await db.update(schema.marketListings).set({ status: "gone", endedAt: today, endedReason: `Known auction/listing end time (${endsAt}) has passed — lot closed`, lastCheckAt: now, verifyMissStreak: 0 }).where(eq(schema.marketListings.id, l.id));
        continue;
      }
      const r = byUrl.get(l.listingUrl as string)!;
      if (r.state === "ended") {
        await db.update(schema.marketListings).set({ status: "gone", endedAt: today, endedReason: r.reason, lastCheckAt: r.checkedAt, verifyMissStreak: 0 }).where(eq(schema.marketListings.id, l.id));
      } else if (r.state === "live") {
        await db.update(schema.marketListings).set({ lastVerifiedLiveAt: r.checkedAt, lastCheckAt: r.checkedAt, lastSweptAt: now, verifyMissStreak: 0, endedAt: null, endedReason: null, ...(r.endsAt ? { endsAt: r.endsAt } : {}), ...(l.status === "stale" ? { status: "live" } : {}) }).where(eq(schema.marketListings.id, l.id));
      } else {
        const streak = ((l.verifyMissStreak as number | null) ?? 0) + 1;
        const age = proofAgeMs(l, nowMs);
        if (age != null && age > STALE_RETIRE_MS) {
          await db.update(schema.marketListings).set({ status: "gone", endedAt: today, endedReason: `Retired as presumed ended/dead link: no positive live verification in over 72 hours across ${streak} consecutive inconclusive checks (last check: ${r.reason})`, lastCheckAt: r.checkedAt, verifyMissStreak: streak }).where(eq(schema.marketListings.id, l.id));
        } else if (streak >= MISS_STREAK_DEMOTE && l.status !== "stale") {
          await db.update(schema.marketListings).set({ status: "stale", lastCheckAt: r.checkedAt, verifyMissStreak: streak }).where(eq(schema.marketListings.id, l.id));
        } else {
          await db.update(schema.marketListings).set({ lastCheckAt: r.checkedAt, verifyMissStreak: streak }).where(eq(schema.marketListings.id, l.id));
        }
      }
      continue;
    }
    await applyVerdict(l, async (patch) => {
      const p: any = { ...patch };
      if (patch.lastVerifiedLiveAt) p.lastSweptAt = now;
      await db.update(schema.marketListings).set(p).where(eq(schema.marketListings.id, l.id));
    });
  }
  return { checked, stillLive, expired, inconclusive, demoted, restored, retired, expiredNames, demotedNames };
}

/* ——— Liveness repair: restore findings killed by INCONCLUSIVE checks ———
   Rows flipped to Gone before the Oct 9, 2026 fix carry an ended_reason
   that states the inconclusive verdict verbatim ("…no longer surfaces
   in live search…" / "…no longer in live search results…"). Those
   verdicts were never positive evidence of ending, so the rows are
   restored to live here (pin + terminal listing return). Rows ended on
   POSITIVE evidence (404/410, an ended/sold phrase on the page, a
   redirect away from the listing) keep their Gone status untouched. */
const INCONCLUSIVE_ENDED_MARKERS = ["no longer surfaces in live search", "no longer in live search results", "unreachable, treated as ended"];
async function ensureLivenessRepair(ctx: Ctx): Promise<void> {
  const db = ctx.db<typeof schema>();
  const isInconclusive = (reason: string | null | undefined): boolean => !!reason && INCONCLUSIVE_ENDED_MARKERS.some(mk => reason.includes(mk));
  const dealRows = await db.select().from(schema.dealFeed);
  for (const d of dealRows as any[]) {
    if (isPicClickRow(d)) continue; // PicClick is not served — never repaired back to live
    if (d.status === "gone" && d.passed !== 1 && isInconclusive(d.endedReason as string | null)) {
      await db.update(schema.dealFeed).set({ status: "live", endedAt: null, endedReason: null }).where(eq(schema.dealFeed.id, d.id));
    }
  }
  const listingRows = await db.select().from(schema.marketListings);
  for (const l of listingRows as any[]) {
    if (isPicClickRow(l)) continue; // PicClick is not served — never repaired back to live
    if (l.status === "gone" && isInconclusive(l.endedReason as string | null)) {
      await db.update(schema.marketListings).set({ status: "live", endedAt: null, endedReason: null }).where(eq(schema.marketListings.id, l.id));
    }
  }
}

function marketplaceForUrl(url: string): string {
  if (isPicClickUrl(url)) return "PicClick"; // not served — label kept only so the purge can identify the row
  const u = url.toLowerCase();
  if (u.includes("ebay.")) return "eBay";
  if (u.includes("tcgplayer.com")) return "TCGplayer";
  if (u.includes("mercari.")) return "Mercari";
  if (u.includes("yahoo")) return "Yahoo Japan";
  if (u.includes("fanaticscollect.com")) return "Fanatics Collect";
  if (u.includes("cardmarket.com")) return "Cardmarket";
  return "Marketplace";
}
const huntExtractSchema = z.object({
  listings: z.array(z.object({
    subjectKey: z.string(),
    listingUrl: z.string(),
    askingUsd: z.number(),
    seller: z.string().nullable(),
    shipsFrom: z.string().nullable(),
  })),
});

// Effective value helper — COMP-BASED OFFICIAL VALUE POLICY
// (Oct 10, 2026 — the owner: "Make the official number based off comps /
// live"). This supersedes the Oct 9 freeze, under which the official
// value was ONLY the [official:X] tag in notes and refreshes could
// never move the headline (the total sat at a frozen baseline for
// days while checked prices and sales evidence moved underneath).
// Now a card's official value IS its market value — for EVERY card,
// no exceptions (lock system removed Oct 14, 2026):
//   1. A card's latest checkedUsd — the live checked price the
//      refresh derives from verified sold comps (Fanatics Collect /
//      eBay sold primary, aggregators labelled) — IS the official
//      value. saveRefreshFindings books checked prices, so every
//      refresh revalues the officials and moves the headline.
//   2. A card with no comp check on file yet falls back to its
//      [official:] tag (the seed/deliberate baseline), then to its
//      vault estimate — labelled unverified wherever it shows — until
//      a refresh checks it.
//   3. No checked price and no baseline = unpriced (null), never
//      invented.
function effectiveOf(row: any): number | null {
  const m = (row.notes || "").match(/\[official:([\d.]+)\]/);
  const tag = m?.[1] != null ? parseFloat(m[1]) : null;
  if (row.checkedUsd != null) return row.checkedUsd;
  if (tag != null) return tag;
  return row.vaultUsd ?? null;
}
function cleanNotes(notes: string) { return (notes || "").replace(/\s*\[official:[\d.]+\]/, ""); }

/* ——— Official-baseline repair (Oct 9, 2026) — RETIRED Oct 10, 2026 ———
   This repair restored [official:] tags to the frozen Oct 8 baseline.
   the owner's Oct 10, 2026 direction ("make the official number based off
   comps / live") supersedes the freeze: official values are now derived
   from the latest comp-based checked prices in effectiveOf above, so
   there is nothing left to restore tags to — the repair and its call
   site are removed. */

/* ——— V2 ensure: alerts, pops ——— */
async function ensureV2(ctx: Ctx) {
  const db = ctx.db<typeof schema>();
  try {
    const pops = await db.select().from(schema.popHistory);
    if (pops.length === 0) {
      const seedPops: [string, string, number, number | null][] = [
        ["DEMO-1001", "Lugia-Holo", 1850, null],
        ["DEMO-1002", "Charizard-Holo", 21400, 1900],
        ["DEMO-1003", "Umbreon VMAX — Alternate Art", 21500, 21500],
        ["DEMO-SOLD-0203", "Magikarp — Illustration Rare", 12986, 12986],
      ];
      for (const [cert, name, total, grade] of seedPops) {
        await db.insert(schema.popHistory).values({ cert, cardName: name, popTotal: total, popGrade: grade, recordedAt: "2026-10-08" });
      }
    }
    const alerts = await db.select().from(schema.dealAlerts);
    if (alerts.length === 0) {
            const deals = await db.select().from(schema.dealFeed);
      for (const d of deals as any[]) {
        if (d.passed === 1 || !d.listingUrl) continue;
        if (isPicClickRow(d)) continue; // PicClick is not served — no alerts are ever raised for it
        const tier = d.tier ?? 0;
        if (tier === 1) {
          await db.insert(schema.dealAlerts).values({
            alertType: "tier1_find", cardName: d.cardName, price: d.askingUsd, discountPct: d.discountPct, listingUrl: d.listingUrl,
            payload: `Tier 1 pinned find: ${d.cardName} ${d.gradeLabel ?? ""} at ${d.marketplace} for $${d.askingUsd} — ${d.discountPct ?? "?"}% under comp. Link required and present. Pending delivery.`,
            status: "pending_delivery", createdAt: d.foundAt ?? "2026-10-08",
          });
        }
      }
    }
    // Paper-Trading League REMOVED (Oct 14, 2026): paper positions are no
    // longer recorded by sweeps, refreshes, or this ensure path. Historical
    // paper_positions rows stay dormant in the DB, unrendered.
  } catch { /* v2 tables may not exist on very old DB before migration — build applies migration first */ }
}


/* ——— Watchlist price points (Oct 14, 2026) ———
   Each watch item accrues dated reference-price points: the Oct 8, 2026
   seed figure from its original record, plus one point per re-check
   that produced a defensible single figure. The Growth heatmap colours
   watchlist tiles from the first-to-latest point change. Extraction is
   deliberately conservative — only figures stated in a recognizable
   reference form become points; multi-card tapes yield none, and the
   item simply waits for the research re-price to file a real point. */
const WATCH_DATE_RE = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+20\d{2}\b/g;
function watchMoney(s: string): number { return parseFloat(s.replace(/,/g, "")); }
function watchLastSegment(pc: string): string {
  const marks = [...pc.matchAll(WATCH_DATE_RE)];
  return marks.length ? pc.slice(marks[marks.length - 1]!.index) : pc;
}
function watchSeedFigure(pc: string, name = ""): { price: number; source: string } | null {
  const onFile = pc.match(/on-file \$([\d,]+)\s*[–-]\s*\$([\d,]+)/i);
  if (onFile) return { price: Math.round(((watchMoney(onFile[1]!) + watchMoney(onFile[2]!)) / 2) * 100) / 100, source: "TCGplayer-tracked range midpoint \u2014 Oct 8 seed" };
  const rangeM = pc.match(/\$([\d,]+)\s*[–-]\s*\$([\d,]+)/);
  const maxM = pc.match(/MAX BUY \$([\d,]+)/i);
  if (rangeM && maxM) return { price: Math.round(((watchMoney(rangeM[1]!) + watchMoney(rangeM[2]!)) / 2) * 100) / 100, source: "Recorded range midpoint \u2014 Oct 8 seed" };
  // Basket / group anchors (Oct 14, 2026 — workstream 6b): a basket row's
  // reference is its ANCHOR card's figure, taken ONLY from a figure
  // already stated in the item's own record and labelled as an anchor.
  // Rows with no single defensible anchor figure return null and stay
  // in the honest accruing state — never an invented basket price.
  const anchorRules: { test: RegExp; pick: (m: RegExpMatchArray) => number; source: string }[] = [
    { test: /Glaceon LV\.X Japanese 1st Ed PSA 9 still ~\$([\d,]+)/i, pick: m => watchMoney(m[1]!), source: "Basket anchor \u2014 Glaceon LV.X Japanese PSA 9 (item record, Oct 8)" },
    { test: /English Mew PSA 9 averages ~\$([\d,]+)/i, pick: m => watchMoney(m[1]!), source: "Basket anchor \u2014 Southern Islands English Mew PSA 9 average (item record, Oct 8)" },
    { test: /SL shinies raw NM ~\$([\d,]+)\s*[–-]\s*\$([\d,]+)/i, pick: m => Math.round(((watchMoney(m[1]!) + watchMoney(m[2]!)) / 2) * 100) / 100, source: "Basket anchor \u2014 Call of Legends SL shiny raw NM range midpoint (item record, Oct 8)" },
    { test: /Gardevoir EX Secret \(Steam Siege\) raw ~\$([\d,]+)/i, pick: m => watchMoney(m[1]!), source: "Basket anchor \u2014 Gardevoir EX Secret raw (item record, Oct 8)" },
    { test: /Blastoise & Piplup GX Alt Art raw ~\$([\d,]+)/i, pick: m => watchMoney(m[1]!), source: "Basket anchor \u2014 Blastoise & Piplup GX Alt Art raw (item record, Oct 8)" },
    { test: /full sets ~\$([\d,]+)\s*[–-]\s*\$([\d,]+)/i, pick: m => Math.round(((watchMoney(m[1]!) + watchMoney(m[2]!)) / 2) * 100) / 100, source: "Basket anchor \u2014 Japanese 151 trio full-set range midpoint (item record, Oct 8)" },
    { test: /Japanese PSA 10 ~\$([\d,]+)/i, pick: m => watchMoney(m[1]!), source: "Recorded reference \u2014 Japanese PSA 10 (item record, Oct 8 seed)" },
    { test: /PSA 10 now \$([\d,]+)/i, pick: m => watchMoney(m[1]!), source: "Recorded reference \u2014 PSA 10 (item record, Oct 8 seed)" },
  ];
  for (const r of anchorRules) { const m = pc.match(r.test); if (m) return { price: r.pick(m), source: r.source }; }
  void name;
  return null;
}
function watchLatestFigure(pc: string): { price: number; source: string } | null {
  const seg = watchLastSegment(pc);
  const pair = seg.match(/TCGplayer-tracked (?:value|list) \$([\d,.]+)\s*\/\s*market \$([\d,.]+)/i);
  if (pair) return { price: watchMoney(pair[2]!), source: "TCGplayer-tracked market" };
  return null;
}
async function recordWatchPricePointsImpl(ctx: Ctx): Promise<{ seeded: number; recorded: number }> {
  const db = ctx.db<typeof schema>();
  const items = await db.select().from(schema.watchlist);
  const existing = await db.select().from(schema.watchPricePoints);
  const have = new Set((existing as any[]).map(p => `${p.watchId}|${p.recordedOn}`));
  let seeded = 0; let recorded = 0;
  for (const w of items as any[]) {
    if (isHiddenWatchStatus(w.status)) continue;
    const pc = (w.priceContext as string) ?? "";
    if (!have.has(`${w.id}|2026-10-08`)) {
      const seed = watchSeedFigure(pc, w.name as string);
      if (seed) { await db.insert(schema.watchPricePoints).values({ watchId: w.id, priceUsd: seed.price, sourceType: seed.source, recordedOn: "2026-10-08" }); seeded++; }
    }
    const lc = (w.lastChecked as string | null) ?? "";
    if (/^20\d{2}-\d{2}-\d{2}$/.test(lc) && lc > "2026-10-09" && !have.has(`${w.id}|${lc}`)) {
      const latest = watchLatestFigure(pc);
      if (latest) { await db.insert(schema.watchPricePoints).values({ watchId: w.id, priceUsd: latest.price, sourceType: latest.source, recordedOn: lc }); recorded++; }
    }
  }
  return { seeded, recorded };
}

/* ——— Team Rocket red team (round 4, Oct 9 2026) ———
   The bear case is DETERMINISTIC and source-labelled: every point cites
   the record it came from (the deal record itself, the Market Terminal's
   thin-comps flag, Pop Dilution velocity, or the liveness machine).
   Rocket never invents a fact, never pins, and never suggests buying —
   he only argues AGAINST. His holding stress flags also feed the Pump
   Detector as a displayed input signal. */
function fmtMoneyShort(n: number | null | undefined): string { return n == null ? "no comp" : n >= 1000 ? `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `$${Math.round(n)}`; }

function rocketBearForDeal(d: (typeof schema.dealFeed.$inferSelect), ctx: { thinMarket: boolean; popVelocityPct: number | null }): { points: string[]; severity: number } {
  const points: string[] = [];
  const disc = d.discountPct ?? null;
  if (disc != null && disc >= 40) points.push(`A ${disc.toFixed(0)}% discount to the stated comp sits in too-good-to-be-true territory — the usual explanations are a misgraded or mislabelled slab, or a comp that was never a real sale (deal record: ask $${(d.askingUsd ?? 0).toLocaleString()} vs market $${(d.marketUsd ?? 0).toLocaleString()}).`);
  if (d.marketUsd == null) points.push("No verified comp backs this price — the 'discount' is measured against asking prices, not sales (deal record: market value not established).");
  if (!d.seller) points.push("Seller is not recorded for this listing — there is no seller history to check before money moves (deal record).");
  if (ctx.thinMarket) points.push("The market for this card is thin — few verified sales on file, so a single print can invent the comp this discount is measured from (Market Terminal: thin-comps flag).");
  if (ctx.popVelocityPct != null && ctx.popVelocityPct >= 5) points.push(`Graded population is growing +${ctx.popVelocityPct.toFixed(1)}% in the tracked window — scarcity, the reason to pay up for this grade, is diluting (Pop Dilution tracker).`);
  if (d.status === "stale") points.push("This find's own link is currently STALE — unverifiable across repeated sweeps, so the 'deal' may not exist at all right now (liveness state machine).");
  if (points.length === 0) points.push("Verify the cert number in the listing photos matches the title before paying — the one check no discount survives failing (listing data).");
  return { points, severity: points.length };
}

function pumpFor(cert: string, name: string, sales: any[]): { cert: string; name: string; level: string; score: number; factors: string[] } {
  const verified = sales.filter(s => s.cardCert === cert && s.verified);
  const unverified = sales.filter(s => s.cardCert === cert && !s.verified);
  const factors: string[] = [];
  let score = 0;
  if (verified.length > 0) {
    const prices = verified.map(s => s.price as number).sort((a, b) => a - b);
    const median = prices[Math.floor(prices.length / 2)] ?? prices[0] ?? 0;
    const max = prices[prices.length - 1] ?? 0;
    const min = prices[0] ?? 0;
    if (median > 0 && max / median >= 2) { score += 35; factors.push(`Highest verified print $${max.toLocaleString()} is ${(max / median).toFixed(1)}× the median comp $${median.toLocaleString()}`); }
    if (min > 0 && max / min >= 2.5) { score += 25; factors.push(`Wide comp dispersion: $${min.toLocaleString()}–$${max.toLocaleString()} range`); }
    if (verified.length < 3) { score += 20; factors.push(`Thin volume: only ${verified.length} verified sale(s) on file`); }
    const lowTrust = verified.some(s => String(s.source).toLowerCase().includes("pokeprices") || String(s.description).toLowerCase().includes("aggregator"));
    if (lowTrust) { score += 10; factors.push("Some prints come from aggregator / lower-trust sources"); }
  } else {
    score += 20; factors.push("No verified sales on file — value rests on estimates / kept values");
  }
  if (unverified.length > 0) { score += 25; factors.push(`Unverified seller-reported print present ($${Math.max(...unverified.map(s => s.price)).toLocaleString()}) — excluded from headline value`); }
  if (factors.length === 0) factors.push("Multiple verified comps cluster tightly; no single-print spike detected");
  const level = score >= 50 ? "High" : score >= 25 ? "Watch" : "Low";
  return { cert, name, level, score: Math.min(100, score), factors: factors.slice(0, 3) };
}


/* ——— Evidence insert valve (Remedies pass 1, Oct 13, 2026 — item 1a) ———
   Every daily refresh re-files each checked card's latest comp as a
   NEW sales_evidence row; the Oct 13 dedupe audit removed 156
   duplicate filings of just 19 underlying sales, and without an
   insert-time valve they regrow daily. The valve's signature is the
   dedupe audit's own identity rule: same card cert + same price +
   same sale date + same SOURCE FAMILY — the underlying
   marketplace/aggregator, normalized from the source label the way
   the audit grouped filings ("PriceCharting (aggregator value)",
   "PriceCharting — aggregator value" and "Aggregator value —
   PriceCharting (…)" are one family; "eBay sold" and "eBay sold via
   PriceCharting" are NOT — a direct marketplace sale and an
   aggregator's reprint of it stay distinct filings, exactly as the
   audit treated them). A filing whose signature is already on file
   is skipped, never duplicated; distinct sales (different price,
   date, or family) still file. */
function evidenceSourceFamily(source: string): string {
  const s = (source ?? "").toLowerCase();
  if (s.includes("owner-kept") || s.includes("owner kept")) return "owner-kept";
  if (s.includes("fanatics")) return "fanatics collect";
  if (s.includes("pricecharting")) return s.includes("ebay") ? "ebay via pricecharting" : "pricecharting";
  if (s.includes("goldin")) return "goldin";
  if (s.includes("cardtrack")) return "cardtrack";
  if (s.includes("pokeprices")) return "pokeprices";
  if (s.includes("sports card investor")) return "sports card investor";
  if (s.includes("pokeinvesting")) return "pokeinvesting";
  if (s.includes("private sale")) return "private sale";
  if (s.includes("tcgplayer")) return "tcgplayer";
  if (s.includes("mercari")) return "mercari";
  if (s.includes("yahoo")) return "yahoo japan";
  if (s.includes("ebay")) return "ebay";
  if (s.includes("psa")) return "psa";
  return s.replace(/[^a-z0-9]+/g, " ").trim() || "unknown";
}
function evidenceSigKey(cert: string, price: number, saleDate: string, source: string): string {
  return `${cert}|${price}|${saleDate}|${evidenceSourceFamily(source)}`;
}
async function evidenceSigSet(db: any): Promise<Set<string>> {
  const rows = await db.select().from(schema.salesEvidence);
  return new Set((rows as any[]).map((r: any) => evidenceSigKey(r.cardCert as string, r.price as number, r.saleDate as string, r.source as string)));
}

/* ——— Forecast Engine v1 (fc-v1) — deterministic statistics, NO AI ———
   Per-card value RANGES at 30/90/180 days, computed ONLY from verified
   sold comps, logged at issuance in card_forecasts, graded at horizon,
   with live and backtest track records always reported separately.

   EVIDENCE HYGIENE — the classifier below REUSES the codebase's own
   evidence classification, it does not invent a parallel one:
   (1) sales_evidence.verified must be 1 — the same flag pumpFor(),
       the Decision blocks and the chart series already key on
       (verified=0 seller-reported prints, e.g. an unverified
       vendor print, never enter);
   (2) the source-type rules of the price_sources registry (SOURCES
       below) as mirrored by the client's saleType() labelling:
       "Aggregator value" sources (PriceCharting, PSA estimates,
       CardTrack, pokeprices, pokeinvesting) are supporting values,
       not sold comps; "Active listing / ask" rows (asks, live
       auctions, market-ask rows) are not sales; seller-reported /
       unverified language anywhere in the record excludes it.
   Approximation, deliberately conservative: the stored fields do not
   carry a structured best-offer flag, so hidden-price best-offer
   sales (the owner's Oct 11 eBay rule: struck-through price = a lower
   offer was accepted and the true price is hidden) are excluded only
   when the description itself flags the price as hidden / struck /
   undisclosed; a best-offer sale whose accepted price IS the recorded
   price (e.g. Ditto's $2,251.30 Oct 7, 2026 comp) stays in, exactly as
   the existing Decision/chart code treats it. Grade-reference rows
   ("Market context" sources, "reference ~$" descriptions) are
   references for OTHER grades, not sales of this card, and are out. */
type ForecastSale = { cardCert: string; saleDate: string; price: number; source: string; description: string; verified: boolean };
function isForecastComp(s: ForecastSale): boolean {
  if (!s.verified) return false;
  const src = (s.source ?? "").toLowerCase();
  const t = `${src} ${s.description ?? ""}`.toLowerCase();
  // Collectr scrap (Oct 14, 2026): a row tracing to a Collectr relay
  // is never a comp, whatever its verified flag says — Collectr is
  // prohibited for eBay ended/sold data in any capacity.
  if (t.includes("collektr") || t.includes("collectr")) return false;
  if (t.includes("seller-reported") || t.includes("seller reported") || t.includes("unverified")) return false;
  if (src.includes("ask") || t.includes("active listing") || t.includes("live auction") || t.includes("not a sold comp")) return false;
  if (src.includes("pricecharting") || src.includes("cardtrack") || t.includes("pricecharting") || t.includes("cardtrack")) return false;
  if (t.includes("estimate") || t.includes("aggregator") || t.includes("pokeprices") || t.includes("pokeinvesting")) return false;
  if (src.includes("market context") || t.includes("reference ~")) return false;
  if ((t.includes("best-offer") || t.includes("best offer")) && (t.includes("hidden") || t.includes("struck") || t.includes("true price"))) return false;
  return true;
}

const FC_HORIZONS = [30, 90, 180] as const;
const FC_MODEL_VERSION = "fc-v1";
function fcAddDays(iso: string, days: number): string { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }
function fcDayDiff(fromIso: string, toIso: string): number { return Math.round((new Date(`${toIso}T00:00:00Z`).getTime() - new Date(`${fromIso}T00:00:00Z`).getTime()) / 86400000); }
function fcMedian(xs: number[]): number { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 === 1 ? (s[m] ?? 0) : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2; }
function fcQuantile(sortedAsc: number[], q: number): number { if (sortedAsc.length === 0) return 0; const pos = (sortedAsc.length - 1) * q; const lo = Math.floor(pos); const hi = Math.ceil(pos); if (lo === hi) return sortedAsc[lo] ?? 0; const w = pos - lo; return (sortedAsc[lo] ?? 0) * (1 - w) + (sortedAsc[hi] ?? 0) * w; }
const fcRound2 = (n: number): number => Math.round(n * 100) / 100;

type FcComputed = { horizonDays: number; rangeLow: number; rangeHigh: number; midpoint: number; confidence: "A" | "B" | "C"; basisN: number; basisLastSale: string; liquidity: "deep" | "moderate" | "thin" };
/* Issuance math, shared verbatim by live issuance and the backtest
   walk (the backtest passes a historical asOf and only sales dated
   on/before it can enter — fcCompute filters by date itself).
   Eligibility: >= 3 verified comps in the trailing 180d AND the
   latest no more than 90d old; otherwise null (insufficient signal).
   Drift: median of the last 90d vs the prior 90d (fallback when a
   window is sparse: second half vs first half of the 180d window by
   date). Drift is applied DAMPED — each 30d step contributes half the
   previous step's weight (0.5 + 0.25 + 0.125 + …) — and the total
   applied drift is capped at ±25% (the cap the spec sets at 180d;
   damping keeps shorter horizons far inside it). Range width comes
   from the window's interquartile spread, widened by a liquidity
   factor (fewer sales → wider) and by sqrt(t) horizon scaling, with a
   6% half-width floor so even tight comps carry honest uncertainty. */
function fcCompute(comps: { date: string; price: number }[], asOf: string): FcComputed[] | null {
  const past = comps.filter(c => c.date <= asOf).slice().sort((a, b) => a.date.localeCompare(b.date));
  const winStart = fcAddDays(asOf, -180);
  const win = past.filter(c => c.date > winStart);
  if (win.length < 3) return null;
  const latest = win[win.length - 1]!.date;
  const ageDays = fcDayDiff(latest, asOf);
  if (ageDays > 90) return null;
  const n = win.length;
  const confidence: "A" | "B" | "C" = n >= 8 && ageDays <= 30 ? "A" : n >= 5 && ageDays <= 60 ? "B" : "C";
  const liquidity: "deep" | "moderate" | "thin" = n >= 8 ? "deep" : n >= 5 ? "moderate" : "thin";
  const d90 = fcAddDays(asOf, -90);
  const last90 = win.filter(c => c.date > d90);
  const prior90 = win.filter(c => c.date <= d90);
  const base = fcMedian(last90.map(c => c.price));
  let drift = 0;
  if (last90.length >= 2 && prior90.length >= 2) {
    const priorMed = fcMedian(prior90.map(c => c.price));
    if (priorMed > 0) drift = fcMedian(last90.map(c => c.price)) / priorMed - 1;
  } else if (win.length >= 4) {
    const half = Math.floor(win.length / 2);
    const firstMed = fcMedian(win.slice(0, half).map(c => c.price));
    if (firstMed > 0) drift = fcMedian(win.slice(half).map(c => c.price)) / firstMed - 1;
  }
  const prices = win.map(c => c.price).sort((a, b) => a - b);
  const medAll = fcMedian(prices);
  let halfRel = medAll > 0 ? (fcQuantile(prices, 0.75) - fcQuantile(prices, 0.25)) / 2 / medAll : 0.15;
  if (halfRel < 0.06) halfRel = 0.06;
  const liqFactor = liquidity === "deep" ? 1 : liquidity === "moderate" ? 1.3 : 1.7;
  return FC_HORIZONS.map(h => {
    const steps = h / 30;
    let geom = 0; for (let i = 1; i <= steps; i++) geom += Math.pow(0.5, i);
    const applied = Math.max(-0.25, Math.min(0.25, drift * geom));
    const mid = base * (1 + applied);
    const hw = halfRel * liqFactor * Math.sqrt(h / 30);
    return { horizonDays: h, rangeLow: fcRound2(Math.max(1, mid * (1 - hw))), rangeHigh: fcRound2(mid * (1 + hw)), midpoint: fcRound2(mid), confidence, basisN: n, basisLastSale: latest, liquidity };
  });
}

/* One full forecast pass, run inside refreshPrices (the daily
   refresh): (0) seed the backtest exactly once, (a) grade matured
   open live forecasts, (b) issue fresh live forecasts. Returns a
   one-line summary for the refresh log. Never writes official
   values — every card floats to verified comps (the owner-kept lock
   system was removed Oct 14, 2026), so forecasts are computed from
   verified comps and graded against the card's official value. */
async function runForecastEngine(ctx: Ctx): Promise<string> {
  const db = ctx.db<typeof schema>();
  const today = new Date().toISOString().slice(0, 10);
  const cardRows = await db.select().from(schema.cards);
  const active = (cardRows as any[]).filter(r => r.status === "active");
  const salesRows = await db.select().from(schema.salesEvidence);
  const salesPlain: ForecastSale[] = (salesRows as any[]).map((s: any) => ({ cardCert: s.cardCert as string, saleDate: s.saleDate as string, price: s.price as number, source: s.source as string, description: s.description as string, verified: s.verified !== 0 }));
  const compsByCert = new Map<string, { date: string; price: number }[]>();
  for (const s of salesPlain) {
    if (!isForecastComp(s)) continue;
    const arr = compsByCert.get(s.cardCert) ?? []; arr.push({ date: s.saleDate, price: s.price }); compsByCert.set(s.cardCert, arr);
  }
  for (const arr of compsByCert.values()) arr.sort((a, b) => a.date.localeCompare(b.date));
  const pumpByCert = new Map<string, ReturnType<typeof pumpFor>>();
  for (const c of active) pumpByCert.set(c.cert as string, pumpFor(c.cert as string, `${c.name} ${c.grader} ${c.grade}`, salesPlain as any[]));

  // (0) BACKTEST SEED — first run only (idempotent: only when no
  // backtest rows exist). Walk historical issue points through each
  // qualifying card's sale history; at each point the forecast uses
  // ONLY sales dated before that point, and grades against the first
  // verified sale at/after the horizon date (skipped when none).
  let backtestSeeded = 0;
  const existingFc = await db.select().from(schema.cardForecasts);
  if (!(existingFc as any[]).some(r => r.origin === "backtest")) {
    for (const c of active) {
      const comps = compsByCert.get(c.cert as string) ?? [];
      if (comps.length < 6) continue;
      const dates = [...new Set(comps.map(x => x.date))].sort();
      for (let j = 1; j < dates.length; j++) {
        const issuedAt = dates[j - 1]!;
        const computed = fcCompute(comps.filter(x => x.date < dates[j]!), issuedAt);
        if (!computed) continue;
        for (const f of computed) {
          const horizonDate = fcAddDays(issuedAt, f.horizonDays);
          const realized = comps.find(x => x.date >= horizonDate);
          if (!realized) continue;
          await db.insert(schema.cardForecasts).values({ cert: c.cert as string, issuedAt, horizonDays: f.horizonDays, rangeLow: f.rangeLow, rangeHigh: f.rangeHigh, midpoint: f.midpoint, confidence: f.confidence, basisN: f.basisN, basisLastSale: f.basisLastSale, liquidity: f.liquidity, regime: "normal", modelVersion: FC_MODEL_VERSION, origin: "backtest", status: "graded", realizedValue: realized.price, inRange: realized.price >= f.rangeLow && realized.price <= f.rangeHigh ? 1 : 0, gradedAt: realized.date });
          backtestSeeded++;
        }
      }
    }
  }

  // (a) GRADE any open live forecast whose horizon has passed.
  // Realized value: the card's current official (verified-comp)
  // value; falls back to the latest verified comp when a card has
  // no official value on file.
  let graded = 0;
  const fcRows = await db.select().from(schema.cardForecasts);
  for (const f of fcRows as any[]) {
    if (f.origin !== "live" || f.status !== "open") continue;
    if (fcAddDays(f.issuedAt as string, f.horizonDays as number) > today) continue;
    const card: any = (cardRows as any[]).find(r => r.cert === f.cert);
    let realized: number | null = null;
    if (card) realized = effectiveOf(card);
    if (realized == null) { const comps = compsByCert.get(f.cert as string) ?? []; realized = comps.length ? (comps[comps.length - 1]?.price ?? null) : null; }
    if (realized == null) continue;
    await db.update(schema.cardForecasts).set({ status: "graded", realizedValue: realized, inRange: realized >= (f.rangeLow as number) && realized <= (f.rangeHigh as number) ? 1 : 0, gradedAt: today }).where(eq(schema.cardForecasts.id, f.id));
    graded++;
  }

  // (b) ISSUE fresh live forecasts — per card, per horizon: when none
  // is open, when the last issue is more than 14 days old, or when a
  // newer verified sale postdates the last issue. Pump-suspended
  // cards (pumpFor level High) are NOT issued — their forecast state
  // reads suspended at read time, with the pump factors as reason.
  let issued = 0; const byConf = { A: 0, B: 0, C: 0 };
  const openRows = (await db.select().from(schema.cardForecasts) as any[]).filter(r => r.origin === "live" && r.status === "open");
  for (const c of active) {
    const cert = c.cert as string;
    if (pumpByCert.get(cert)?.level === "High") continue;
    const comps = compsByCert.get(cert) ?? [];
    const computed = fcCompute(comps, today);
    if (!computed) continue;
    for (const f of computed) {
      const latestIssue = openRows.filter(r => r.cert === cert && r.horizonDays === f.horizonDays).map(r => r.issuedAt as string).sort().slice(-1)[0];
      let need = !latestIssue;
      if (latestIssue) {
        if (fcDayDiff(latestIssue, today) > 14) need = true;
        else if (comps.some(x => x.date > latestIssue)) need = true;
      }
      if (!need) continue;
      await db.insert(schema.cardForecasts).values({ cert, issuedAt: today, horizonDays: f.horizonDays, rangeLow: f.rangeLow, rangeHigh: f.rangeHigh, midpoint: f.midpoint, confidence: f.confidence, basisN: f.basisN, basisLastSale: f.basisLastSale, liquidity: f.liquidity, regime: "normal", modelVersion: FC_MODEL_VERSION, origin: "live", status: "open", realizedValue: null, inRange: null, gradedAt: null });
      issued++; byConf[f.confidence]++;
    }
  }
  return ` Forecast engine (fc-v1, verified sold comps only): ${backtestSeeded > 0 ? `seeded ${backtestSeeded} backtest forecast(s) (one-time, graded against the first verified sale at/after each horizon); ` : ""}${graded} matured live forecast(s) graded; ${issued} live forecast(s) issued (confidence A ${byConf.A} · B ${byConf.B} · C ${byConf.C}). Pump-suspended and insufficient-signal cards were issued nothing — their states show on their detail pages.`;
}

/* Track record for one origin — live and backtest are ALWAYS built
   from disjoint row sets and reported separately, never blended.
   SUPERSEDED rows (Remedies pass 1, Oct 13, 2026) are excluded from
   every statistic — a forecast retired because its evidence basis
   was corrected is neither a hit nor a miss — and are surfaced only
   as their own count so the Growth panel can footnote them. */
function fcSummarizeOrigin(rows: any[]): { issued: number; graded: number; superseded: number; inRangePct: number | null; meanRangeWidthPct: number | null; byHorizon: { horizonDays: number; issued: number; graded: number; inRangePct: number | null }[]; byConfidence: { confidence: string; issued: number; graded: number; inRangePct: number | null }[] } {
  const superseded = rows.filter(r => r.status === "superseded").length;
  const live = rows.filter(r => r.status !== "superseded");
  const gradedRows = live.filter(r => r.status === "graded");
  const inR = gradedRows.filter(r => r.inRange === 1).length;
  const pctOf = (sub: any[]): number | null => { const g = sub.filter(r => r.status === "graded"); if (g.length === 0) return null; return Math.round((g.filter(r => r.inRange === 1).length / g.length) * 1000) / 10; };
  return {
    issued: live.length,
    graded: gradedRows.length,
    superseded,
    inRangePct: gradedRows.length ? Math.round((inR / gradedRows.length) * 1000) / 10 : null,
    meanRangeWidthPct: live.length ? Math.round((live.reduce((s: number, r: any) => s + ((r.midpoint as number) > 0 ? ((r.rangeHigh as number) - (r.rangeLow as number)) / (r.midpoint as number) : 0), 0) / live.length) * 1000) / 10 : null,
    byHorizon: FC_HORIZONS.map(h => { const sub = live.filter(r => r.horizonDays === h); return { horizonDays: h, issued: sub.length, graded: sub.filter(r => r.status === "graded").length, inRangePct: pctOf(sub) }; }),
    byConfidence: ["A", "B", "C"].map(cf => { const sub = live.filter(r => r.confidence === cf); return { confidence: cf, issued: sub.length, graded: sub.filter(r => r.status === "graded").length, inRangePct: pctOf(sub) }; }),
  };
}

const cardOut = z.object({
  id: z.number(), name: z.string(), year: z.number(), setName: z.string(), number: z.string(),
  grader: z.string(), grade: z.string(), cert: z.string(),
  vaultUsd: z.number().nullable(), checkedUsd: z.number().nullable(), effectiveUsd: z.number().nullable(),
  advisorCall: z.string(), advisorReason: z.string(), notes: z.string(), status: z.string(),
  soldPrice: z.number().nullable(), soldDate: z.string().nullable(), lastChecked: z.string().nullable(),
  popInfo: z.string().nullable(), era: z.string(),
  /* Cost basis + unrealized P&L (Remedies pass 1 — audit remedy P0-3).
     costBasisUsd is null until the owner records what he paid; P&L is
     computed against the card's current official value and is null
     whenever either side is missing. */
  costBasisUsd: z.number().nullable(), costNote: z.string().nullable(), costDate: z.string().nullable(),
  unrealizedPlUsd: z.number().nullable(), unrealizedPlPct: z.number().nullable(),
  /* Real card art URL for this exact printing (Glass Vault phase 1) —
     null for the 7 unresolved Japanese prints. */
  imageUrl: z.string().nullable(),
});
const costSummaryOut = z.object({ cardsWithCost: z.number(), totalCostUsd: z.number(), currentValueOfCostedUsd: z.number(), unrealizedPlUsd: z.number(), unrealizedPlPct: z.number().nullable() });
const saleOut = z.object({ id: z.number(), cardCert: z.string(), saleDate: z.string(), price: z.number(), source: z.string(), description: z.string(), verified: z.boolean() });
const watchOut = z.object({ id: z.number(), name: z.string(), kind: z.string(), priceContext: z.string(), thesis: z.string(), actionRule: z.string(), lastChecked: z.string().nullable(), status: z.string(), sortOrder: z.number(), scoutId: z.string().nullable(), setName: z.string(), cardNumber: z.string(), intent: z.string(), gradeLabel: z.string(), maxBuyUsd: z.number().nullable() });
const scoutConfigOut = z.object({ scoutId: z.string(), isActive: z.boolean(), focusGroups: z.array(z.string()), ceilingUsd: z.number().nullable(), tier1DiscountPct: z.number().nullable(), marketplaces: z.string(), hasSavedConfig: z.boolean() });
const snapshotOut = z.object({ id: z.number(), snapshotDate: z.string(), totalUsd: z.number(), pricedCount: z.number(), note: z.string() });
const scoutOut = z.object({ id: z.number(), scoutId: z.string(), name: z.string(), pokemon: z.string(), emoji: z.string(), territory: z.string(), statusLine: z.string(), lastChecked: z.string().nullable(), findsCount: z.number(), lastSweepAt: z.string().nullable(), lastSweepCandidates: z.number(), lastSweepFinds: z.number(), lastSweepLabel: z.string() });
const dealOut = z.object({ id: z.number(), cardName: z.string(), gradeLabel: z.string(), askingUsd: z.number(), marketUsd: z.number().nullable(), discountPct: z.number().nullable(), pctOfMarket: z.number().nullable(), marketplace: z.string(), seller: z.string().nullable(), listingUrl: z.string().nullable(), foundAt: z.string(), scoutId: z.string(), checkedDate: z.string().nullable(), note: z.string(), isExample: z.boolean(), tier: z.number(), status: z.string(), firstFoundAt: z.string().nullable(), lastSeenAt: z.string().nullable(), prevAskingUsd: z.number().nullable(), subjectKey: z.string().nullable(), targetGroup: z.string(), lastVerifiedLiveAt: z.string().nullable(), endedAt: z.string().nullable(), endedReason: z.string().nullable(), verifyMissStreak: z.number(), lastCheckAt: z.string().nullable(), endsAt: z.string().nullable() });
/* Findings Ledger rows: the deal shape plus which store the finding
   lives in ("deal" = deal_feed, "listing" = market_listings). The
   ledger is the canonical home for EVERY stored finding, so it unions
   both stores (deduped by listing URL, deal_feed wins) — sweeps save
   qualifying finds to deal_feed but every captured listing to
   market_listings, and a ledger built from deal_feed alone renders
   empty while stored findings sit in market_listings. */
const ledgerOut = dealOut.extend({ source: z.enum(["deal", "listing"]) });
const sweepOut = z.object({ id: z.number(), scoutId: z.string(), sweptAt: z.string(), sourcesChecked: z.string(), candidatesSeen: z.number(), findsCount: z.number(), tier1Count: z.number(), tier2Count: z.number(), note: z.string() });
const listingOut = z.object({ id: z.number(), subjectKey: z.string(), subjectName: z.string(), gradeLabel: z.string(), askingUsd: z.number(), marketUsd: z.number().nullable(), pctOfMarket: z.number().nullable(), discountPct: z.number().nullable(), isDeal: z.boolean(), marketplace: z.string(), seller: z.string().nullable(), shipsFrom: z.string().nullable(), listingUrl: z.string().nullable(), foundAt: z.string(), lastSweptAt: z.string().nullable(), scoutId: z.string(), status: z.string(), prevAskingUsd: z.number().nullable(), firstFoundAt: z.string().nullable(), lastVerifiedLiveAt: z.string().nullable(), endedAt: z.string().nullable(), endedReason: z.string().nullable(), verifyMissStreak: z.number(), lastCheckAt: z.string().nullable(), endsAt: z.string().nullable() });
const terminalOut = z.object({ subjectKey: z.string(), subjectType: z.string(), name: z.string(), gradeLabel: z.string(), kind: z.string(), marketUsd: z.number().nullable(), marketSource: z.string(), marketNote: z.string(), salesVolume30d: z.number().nullable(), thinComps: z.boolean(), lastSweptAt: z.string().nullable(), scoutId: z.string().nullable(), listingCount: z.number() });
const sourceOut = z.object({ id: z.number(), name: z.string(), sourceType: z.string(), coverage: z.string(), caveat: z.string(), trustLevel: z.string(), sortOrder: z.number() });
const alertOut = z.object({ id: z.number(), alertType: z.string(), cardName: z.string(), price: z.number().nullable(), discountPct: z.number().nullable(), listingUrl: z.string().nullable(), payload: z.string(), status: z.string(), createdAt: z.string() });
const popOut = z.object({ cert: z.string(), cardName: z.string(), popTotal: z.number(), popGrade: z.number().nullable(), recordedAt: z.string(), velocityPct: z.number().nullable(), alert: z.boolean() });
const pumpOut = z.object({ cert: z.string(), name: z.string(), level: z.string(), score: z.number(), factors: z.array(z.string()) });
const paperOut = z.object({ scoutId: z.string(), bankroll: z.number(), pnl: z.number(), invested: z.number(), winRate: z.number(), finds: z.number(), positions: z.number(), evolution: z.string(), stage: z.number() });
const paperPosOut = z.object({ id: z.number(), scoutId: z.string(), cardName: z.string(), entryUsd: z.number(), marketUsd: z.number().nullable(), sizeFactor: z.number(), pnl: z.number(), status: z.string() });
const indexOut = z.object({ name: z.string(), value: z.number(), note: z.string(), points: z.array(z.object({ date: z.string(), value: z.number() })) });
const spreadOut = z.object({ key: z.string(), name: z.string(), gradeLabel: z.string(), bestAsk: z.number().nullable(), askSource: z.string(), highestBid: z.number().nullable(), bidSource: z.string(), lastSale: z.number().nullable(), saleSource: z.string(), spreadPct: z.number().nullable(), warning: z.string() });
const exitOut = z.object({ id: z.number(), cert: z.string(), cardName: z.string(), title: z.string(), description: z.string(), suggestedPrice: z.number().nullable(), priceSource: z.string(), status: z.string(), salePrice: z.number().nullable(), feeEstimate: z.number().nullable(), netUsd: z.number().nullable(), soldDate: z.string().nullable(), createdAt: z.string() });
const forecastItemOut = z.object({ horizonDays: z.number(), rangeLow: z.number(), rangeHigh: z.number(), midpoint: z.number(), confidence: z.string(), basisN: z.number(), basisLastSale: z.string(), liquidity: z.string(), issuedAt: z.string() });
const cardForecastOut = z.object({ cert: z.string(), state: z.enum(["open", "insufficient", "pump_suspended"]), pumpReason: z.string().nullable(), locked: z.boolean(), keptValue: z.number().nullable(), horizons: z.array(forecastItemOut) });
const fcOriginRecordOut = z.object({ issued: z.number(), graded: z.number(), superseded: z.number(), inRangePct: z.number().nullable(), meanRangeWidthPct: z.number().nullable(), byHorizon: z.array(z.object({ horizonDays: z.number(), issued: z.number(), graded: z.number(), inRangePct: z.number().nullable() })), byConfidence: z.array(z.object({ confidence: z.string(), issued: z.number(), graded: z.number(), inRangePct: z.number().nullable() })) });
const trackRecordOut = z.object({ live: fcOriginRecordOut, backtest: fcOriginRecordOut, coverage: z.object({ totalCards: z.number(), cardsForecast: z.number(), cardsEligible: z.number(), pumpSuspended: z.number(), insufficient: z.number() }) });
const strayForecastCleanupResponse = z.object({ ok: z.literal(true), deleted: z.number(), remaining: z.number() });
const inspectSalesRowOut = z.object({ id: z.number(), cardCert: z.string(), saleDate: z.string(), price: z.number(), source: z.string(), verified: z.boolean(), descLength: z.number(), hasUrl: z.boolean(), isComp: z.boolean() });
const inspectSalesFullRowOut = z.object({ id: z.number(), cardCert: z.string(), saleDate: z.string(), price: z.number(), source: z.string(), verified: z.boolean(), description: z.string(), isComp: z.boolean() });
const inspectPerCertOut = z.object({ cert: z.string(), compIds: z.array(z.number()), basisN: z.number(), eligible: z.boolean(), confidence: z.string().nullable(), liquidity: z.string().nullable(), latestCompDate: z.string().nullable() });
const inspectBacktestPerCertOut = z.object({ cert: z.string(), seeded: z.number(), inRange: z.number() });
const inspectBacktestOut = z.object({ seededForecasts: z.number(), gradedForecasts: z.number(), inRangeCount: z.number(), inRangePct: z.number().nullable(), perCert: z.array(inspectBacktestPerCertOut) });
const inspectSalesEvidenceResponse = z.object({ ok: z.literal(true), rows: z.array(inspectSalesRowOut), fullRows: z.array(inspectSalesFullRowOut), perCert: z.array(inspectPerCertOut), backtestSimulation: inspectBacktestOut.nullable() });
const dedupeGroupOut = z.object({ keepId: z.number(), deleteIds: z.array(z.number()), cert: z.string(), price: z.number(), saleDate: z.string() });
const dedupeSalesEvidenceResponse = z.object({ ok: z.boolean(), error: z.string().optional(), groupIndex: z.number().nullable().optional(), dryRun: z.boolean().optional(), salesBefore: z.number().optional(), salesAfter: z.number().optional(), groups: z.array(dedupeGroupOut).optional(), totalToDelete: z.number().optional(), deletedTotal: z.number().optional(), deletedIds: z.array(z.number()).optional() });
const excludeKeptValueResponse = z.object({ ok: z.boolean(), error: z.string().optional(), failedIds: z.array(z.number()).optional(), updated: z.number().optional(), supersededForecasts: z.number().optional(), salesTotal: z.number().optional() });

/* ——— Show Mode slab-photo scan (camera OCR + QR) ———
   The photo is processed IN MEMORY ONLY by vision inference: it is never
   stored in the DB or as a blob. The model reads the slab label (cert
   number, grader, grade, card identity, any QR payload text it can see);
   the client may also pass a QR payload decoded on-device with the
   BarcodeDetector API. Cert candidates are then matched IN CODE against
   tracked data (owned cards + watchlist) — a scan can only ever
   surface a verdict for a card the dashboard already tracks, exactly
   like a typed search. Untracked certs come back as candidates for
   manual verification, never as an invented verdict. */
const slabOcrSchema = z.object({
  readable: z.boolean(),
  certNumbers: z.array(z.string()).default([]),
  grader: z.string().nullable().default(null),
  grade: z.string().nullable().default(null),
  cardName: z.string().nullable().default(null),
  setName: z.string().nullable().default(null),
  number: z.string().nullable().default(null),
  year: z.number().nullable().default(null),
  qrText: z.string().nullable().default(null),
  visibleText: z.string().default(""),
  confidence: z.enum(["low", "medium", "high"]).default("low"),
});
const scanMatchOut = z.object({
  cert: z.string(), name: z.string(), grader: z.string(), grade: z.string(),
  relation: z.enum(["owned", "watchlist"]),
});
const scanSlabResponse = z.object({
  ok: z.literal(true),
  status: z.enum(["matched_cert", "matched_name", "candidates", "not_tracked", "not_read"]),
  certCandidates: z.array(z.string()),
  qrPayload: z.string().nullable(),
  qrCert: z.string().nullable(),
  extracted: z.object({
    grader: z.string().nullable(), grade: z.string().nullable(),
    cardName: z.string().nullable(), setName: z.string().nullable(),
    number: z.string().nullable(), year: z.number().nullable(),
    visibleText: z.string(),
    confidence: z.enum(["low", "medium", "high"]),
  }),
  matches: z.array(scanMatchOut),
  message: z.string(),
});
function certCandidatesFrom(text: string | null | undefined): string[] {
  if (!text) return [];
  const found = text.match(/\d{6,10}/g) ?? [];
  return [...new Set(found)];
}

export const Actions = {
  getPortfolio: defineAction({
    request: z.object({}),
    response: z.object({
      cards: z.array(cardOut), sales: z.array(saleOut), watchlist: z.array(watchOut),
      snapshots: z.array(snapshotOut), scouts: z.array(scoutOut), deals: z.array(dealOut), ledger: z.array(ledgerOut), sources: z.array(sourceOut),
      sweeps: z.array(sweepOut), listings: z.array(listingOut), terminal: z.array(terminalOut),
      totals: z.object({ officialTotal: z.number(), vaultSumPriced: z.number(), pricedCount: z.number(), totalCount: z.number(), activeCount: z.number(), psaCount: z.number(), cgcCount: z.number(), topHoldingName: z.string(), topHoldingValue: z.number(), topHoldingPct: z.number(), costSummary: costSummaryOut }),
      scoutConfigs: z.array(scoutConfigOut),
      forecasts: z.array(cardForecastOut), trackRecord: trackRecordOut,
      logs: z.array(z.object({ id: z.number(), ranAt: z.string(), summary: z.string(), cardsChecked: z.number() })),
      v2: z.object({ alerts: z.array(alertOut), pops: z.array(popOut), pump: z.array(pumpOut), paper: z.array(paperOut), paperPositions: z.array(paperPosOut), indices: z.array(indexOut), spreads: z.array(spreadOut), exits: z.array(exitOut), passedNames: z.array(z.string()), rocket: z.object({ findIntel: z.array(z.object({ dealId: z.number(), cardName: z.string(), severity: z.number(), points: z.array(z.string()) })), holdingFlags: z.array(z.object({ cert: z.string(), name: z.string(), heldValue: z.number(), bestAsk: z.number(), pctUnder: z.number() })) }), committee: z.array(z.object({ id: z.number(), dealId: z.number(), cardName: z.string(), score: z.number(), verdict: z.string(), bull: z.string(), bear: z.string(), liquidity: z.string(), rationale: z.string(), createdAt: z.string() })), milestones: z.array(z.object({ id: z.string(), label: z.string(), icon: z.string(), condition: z.string(), met: z.boolean(), evidence: z.string() })), journal: z.array(z.object({ scoutId: z.string(), title: z.string(), date: z.string(), body: z.string(), links: z.array(z.object({ label: z.string(), href: z.string() })) })), watchPoints: z.array(z.object({ watchId: z.number(), priceUsd: z.number(), sourceType: z.string(), recordedOn: z.string() })) }),
    }),
    async handler(ctx) {
      await ensureSeed(ctx);
      await ensureCollectrScrap(ctx);
      await ensureWatchlist(ctx);
      await ensureSnapshots(ctx);
      await ensureScouts(ctx);
      await ensureScoutHunts(ctx);
      await ensureDeals(ctx);
      await ensurePicClickPurge(ctx);
      await ensureOwnerReportedEnded(ctx);
      await ensureOwnerReportedAllEnded(ctx);
      await ensureClosedAuctionAlerts(ctx);
      await ensureWatchlistScouts(ctx);
      await ensureSources(ctx);
      await ensureLedgerBackfill(ctx);
      await ensureLivenessRepair(ctx);
      await ensureV2(ctx);
      await ensureCardArt(ctx);
      await ensureDemoForecasts(ctx);
      const cfgMap = await scoutConfigMap(ctx);
      const scoutConfigsOut: ScoutConfig[] = ["gengar", "pikachu", "eevee", "snorlax", "rocket"].map(id => cfgMap.get(id) ?? defaultScoutConfig(id));
      const db = ctx.db<typeof schema>();
      const watchRows = await db.select().from(schema.watchlist).orderBy(asc(schema.watchlist.sortOrder));
      const rows = await db.select().from(schema.cards).orderBy(desc(schema.cards.id));
      const salesRows = await db.select().from(schema.salesEvidence).orderBy(desc(schema.salesEvidence.price));
      const logRows = await db.select().from(schema.refreshLogs).orderBy(desc(schema.refreshLogs.id)).limit(10);
      const snapRows = await db.select().from(schema.portfolioSnapshots).orderBy(asc(schema.portfolioSnapshots.id));
      const scoutRows = await db.select().from(schema.scoutStatus).orderBy(asc(schema.scoutStatus.id));
      const dealRows = await db.select().from(schema.dealFeed).orderBy(desc(schema.dealFeed.discountPct));
      const sourceRows = await db.select().from(schema.priceSources).orderBy(asc(schema.priceSources.sortOrder));
      const sweepRows = await db.select().from(schema.scoutSweeps).orderBy(desc(schema.scoutSweeps.id)).limit(24);
      const listingRows = await db.select().from(schema.marketListings).orderBy(asc(schema.marketListings.askingUsd));
      // DISMISSAL KEYS (Oct 12, 2026): canonical keys of every listing
      // the owner passed or filed owner-ended, across BOTH stores. A live
      // row whose twin in the other store was dismissed is the same
      // listing — the read filters below hide it everywhere (Ledger,
      // Terminal, Trenches, alerts) even for legacy rows written
      // before the cross-store pass/ended mirroring existed.
      const { passedKeys: dismissedPassedKeys, ownerEndedKeys: dismissedEndedKeys } = dismissalKeys(dealRows as any[], listingRows as any[]);
      const isDismissedKey = (url: string | null | undefined): boolean => {
        if (!url) return false;
        const k = canonicalListingKey(url);
        return !!k && (dismissedPassedKeys.has(k) || dismissedEndedKeys.has(k));
      };
      const cards = rows.map((r: any) => {
        const eff = (r.status === "sold" || r.status === "traded") ? r.soldPrice : effectiveOf(r);
        const cost = (r.costBasisUsd as number | null) ?? null;
        const pl = cost != null && eff != null ? Math.round((eff - cost) * 100) / 100 : null;
        return {
          id: r.id, name: r.name, year: r.year, setName: r.setName, number: r.number, grader: r.grader, grade: r.grade, cert: r.cert,
          vaultUsd: r.vaultUsd, checkedUsd: r.checkedUsd, effectiveUsd: eff,
          advisorCall: r.advisorCall, advisorReason: r.advisorReason, notes: cleanNotes(r.notes), status: r.status,
          soldPrice: r.soldPrice, soldDate: r.soldDate, lastChecked: r.lastChecked, popInfo: r.popInfo, era: r.era,
          costBasisUsd: cost, costNote: (r.costNote as string | null) ?? null, costDate: (r.costDate as string | null) ?? null,
          unrealizedPlUsd: pl, unrealizedPlPct: pl != null && cost != null && cost > 0 ? Math.round((pl / cost) * 1000) / 10 : null,
          imageUrl: (r.imageUrl as string | null) ?? CARD_ART[r.cert as string] ?? null,
        };
      });
      const active = cards.filter((c: any) => c.status === "active");
      const priced = active.filter((c: any) => c.effectiveUsd != null);
      const officialTotal = priced.reduce((s: number, c: any) => s + (c.effectiveUsd ?? 0), 0);
      const vaultSum = active.reduce((s: number, c: any) => s + (c.vaultUsd ?? 0), 0);
      const sorted = [...priced].sort((a: any, b: any) => (b.effectiveUsd ?? 0) - (a.effectiveUsd ?? 0));
      const top = sorted[0];
      // LIVENESS — SPLIT BY SURFACE (Oct 10, 2026 — the owner: "There has
      // to be more listings besides the dead/ended ones — Cardboard
      // Terminal has nonstop listings"): the Market Terminal is a
      // listing CENSUS, not a deals feed. Every priced listing the
      // sweeps capture for a tracked card belongs here — at, under or
      // over market, with the deal flag at ≤80% computed on read —
      // including listings whose page check was bot-blocked and never
      // positively verified (their row renders the "never positively
      // verified live" label from lastVerifiedLiveAt). The strict
      // verified-live bar stays where it belongs: on PINNED DEALS and
      // the ledger's live segments (see the ledger mapping below).
      // What still never appears here: passed rows, PicClick, rows
      // filed Gone on POSITIVE ended evidence (404 / ended page /
      // owner report / known end time past), and rows no sweep has
      // captured or verified in 7 days (a week of silence is treated
      // as a dead listing, not a live one). A stored 'stale' status —
      // demoted only for INCONCLUSIVE checks — no longer hides a
      // recently-swept listing from the Terminal.
      const readNowMs = Date.now();
      const TERMINAL_FRESH_MS = 7 * 24 * 3600 * 1000;
      const terminalAnchorMs = (l: any): number | null => {
        let best: number | null = null;
        for (const s of [l.lastVerifiedLiveAt, l.lastSweptAt, l.firstFoundAt, l.foundAt] as Array<string | null | undefined>) {
          if (!s) continue;
          const t = new Date(s.length <= 10 ? `${s}T00:00:00Z` : s).getTime();
          if (!isNaN(t) && (best == null || t > best)) best = t;
        }
        return best;
      };
      const listings = (listingRows as any[]).filter(l => { if (l.passed === 1 || isPicClickRow(l) || l.status === "gone") return false; if (isDismissedKey(l.listingUrl as string | null)) return false; const anchor = terminalAnchorMs(l); return anchor == null || readNowMs - anchor <= TERMINAL_FRESH_MS; }).map((l: any) => {
        const pctOfMarket = l.marketUsd != null && l.marketUsd > 0 ? Math.round((l.askingUsd / l.marketUsd) * 1000) / 10 : null;
        return { id: l.id, subjectKey: l.subjectKey, subjectName: l.subjectName, gradeLabel: l.gradeLabel, askingUsd: l.askingUsd, marketUsd: l.marketUsd, pctOfMarket, discountPct: pctOfMarket != null ? Math.round((100 - pctOfMarket) * 10) / 10 : null, isDeal: pctOfMarket != null && pctOfMarket <= 80, marketplace: l.marketplace, seller: l.seller ?? null, shipsFrom: l.shipsFrom ?? null, listingUrl: l.listingUrl, foundAt: l.foundAt, lastSweptAt: l.lastSweptAt ?? null, scoutId: l.scoutId, status: l.status === "price_dropped" ? "price_dropped" : "live", prevAskingUsd: l.prevAskingUsd ?? null, firstFoundAt: l.firstFoundAt ?? l.foundAt ?? null, lastVerifiedLiveAt: l.lastVerifiedLiveAt ?? null, endedAt: l.endedAt ?? null, endedReason: l.endedReason ?? null, verifyMissStreak: l.verifyMissStreak ?? 0, lastCheckAt: l.lastCheckAt ?? null, endsAt: l.endsAt ?? null };
      });
      const latestSweepByScout = new Map<string, any>();
      for (const sw of sweepRows as any[]) if (!latestSweepByScout.has(sw.scoutId)) latestSweepByScout.set(sw.scoutId, sw);
      const latestSweepAt = (sweepRows as any[])[0]?.sweptAt ?? null;
      // Sales volume (30d window ending at the latest evidence date on file):
      // counts VERIFIED sales evidence per cert dated within 30 days of the
      // newest evidence for that cert. This is evidence on file, not a full
      // market census — labelled as such in the terminal.
      const volByCert = new Map<string, number>();
      {
        const byCert = new Map<string, any[]>();
        for (const s of salesRows as any[]) { if (s.verified === 0) continue; const arr = byCert.get(s.cardCert) ?? []; arr.push(s); byCert.set(s.cardCert, arr); }
        for (const [cert, arr] of byCert) {
          const newest = arr.map(a => a.saleDate).sort().slice(-1)[0] as string;
          const cutoff = new Date(new Date(`${newest}T00:00:00`).getTime() - 30 * 86400000).toISOString().slice(0, 10);
          volByCert.set(cert, arr.filter(a => a.saleDate >= cutoff).length);
        }
      }
      const terminal: any[] = [];
      for (const c of active as any[]) {
        const vol = volByCert.get(c.cert) ?? null;
        const marketSource = c.checkedUsd != null ? "Comp-based official — latest live checked price (verified sold comps / aggregator cross-check)" : c.effectiveUsd != null ? "Vault estimate — unverified (no comp check on file yet)" : "No price yet";
        const thin = c.effectiveUsd == null || vol == null || vol < 3 || c.checkedUsd == null;
        terminal.push({ subjectKey: `owned-${c.cert}`, subjectType: "owned", name: `${c.name} — ${c.setName} #${c.number}`, gradeLabel: `${c.grader} ${c.grade}`, kind: "owned", marketUsd: c.effectiveUsd, marketSource, marketNote: c.popInfo ?? "", salesVolume30d: vol, thinComps: thin, lastSweptAt: latestSweepAt, scoutId: null, listingCount: listings.filter((l: any) => l.subjectKey === `owned-${c.cert}`).length });
      }
      for (const w of watchRows as any[]) {
        if (isHiddenWatchStatus(w.status)) continue;
        // A single defensible market figure exists only where the research
        // gave one (e.g. WC raw ranges use the range midpoint of the
        // TCGplayer-tracked range, labelled as such). Otherwise market is
        // null and the price context itself is the market note.
        let marketUsd: number | null = null; let marketSource = "Price context — see note";
        const rangeM = (w.priceContext as string).match(/\$([\d,]+)\s*[–-]\s*\$([\d,]+)/);
        const maxM = (w.priceContext as string).match(/MAX BUY \$([\d,]+)/i);
        if (rangeM && maxM) { marketUsd = Math.round(((parseFloat(rangeM[1]!.replace(/,/g, "")) + parseFloat(rangeM[2]!.replace(/,/g, ""))) / 2) * 100) / 100; marketSource = "TCGplayer-tracked WC deck value (range midpoint), checked Oct 8, 2026"; }
        const vol: number | null = null;
        terminal.push({ subjectKey: `watch-${w.id}`, subjectType: "watchlist", name: w.name, gradeLabel: w.kind === "wc" ? "Raw (grading candidate)" : w.kind === "vending" ? "Raw / sheet" : "As listed", kind: w.kind, marketUsd, marketSource, marketNote: w.priceContext, salesVolume30d: vol, thinComps: true, lastSweptAt: latestSweepAt, scoutId: w.scoutId ?? scoutForWatch(w.name), listingCount: listings.filter((l: any) => l.subjectKey === `watch-${w.id}`).length });
      }
      // ——— V2 computed ———
      let v2Alerts: any[] = []; let v2Pops: any[] = []; let v2PaperRows: any[] = []; let v2Exits: any[] = []; let v2WatchPointRows: any[] = [];
      try {
        v2Alerts = await db.select().from(schema.dealAlerts).orderBy(desc(schema.dealAlerts.id));
        const popRows = await db.select().from(schema.popHistory).orderBy(asc(schema.popHistory.id));
        const byCert = new Map<string, any[]>();
        for (const p of popRows as any[]) { const a = byCert.get(p.cert) ?? []; a.push(p); byCert.set(p.cert, a); }
        for (const [cert, arr] of byCert) {
          const latest = arr[arr.length - 1]; const first = arr[0];
          const vel = arr.length > 1 && first.popTotal > 0 ? Math.round(((latest.popTotal - first.popTotal) / first.popTotal) * 1000) / 10 : null;
          v2Pops.push({ cert, cardName: latest.cardName, popTotal: latest.popTotal, popGrade: latest.popGrade ?? null, recordedAt: latest.recordedAt, velocityPct: vel, alert: vel != null && vel > 10 });
        }
        v2PaperRows = await db.select().from(schema.paperPositions);
        try { v2WatchPointRows = await db.select().from(schema.watchPricePoints).orderBy(asc(schema.watchPricePoints.recordedOn)); } catch { /* table just migrated */ }
        v2Exits = await db.select().from(schema.exitDrafts).orderBy(desc(schema.exitDrafts.id));
      } catch { /* tables just migrated */ }
      const salesPlain = (salesRows as any[]).map((s: any) => ({ cardCert: s.cardCert, price: s.price, verified: s.verified !== 0, source: s.source, description: s.description }));
      const pumpList: any[] = active.map((c: any) => pumpFor(c.cert, `${c.name} ${c.grader} ${c.grade}`, salesPlain));
      pumpList.push({ cert: "WC-MEW-STAR", name: "Mew Gold Star — Silver-Border WC PSA 10 (watchlist pattern)", level: "High", score: 92, factors: ["Single print $50,100 (Jul 2026) is ~3.8× the $11k–$15k cluster of other PSA 10 sales — classic outlier, never a comp", "Thin WC market: bulk for two decades, very few verified paid sales", "Comp dispersion is extreme ($11,000–$50,100) — buy only on multiple confirmed paid sales"] });
      pumpList.sort((a: any, b: any) => b.score - a.score);
      /* ——— Forecast Engine (fc-v1) read model ———
         Current open live set per card (latest issue per horizon),
         the card's forecast state (open / insufficient / pump-
         suspended with the pump factors as the reason), and the
         track record with live and backtest ALWAYS separate.
         Issuance and grading happen in refreshPrices — this read
         never issues, grades, or alters a value. */
      let fcRowsAll: any[] = [];
      try { fcRowsAll = await db.select().from(schema.cardForecasts); } catch { /* forecasts table just migrated */ }
      const fcToday = new Date().toISOString().slice(0, 10);
      const fcCompsByCert = new Map<string, { date: string; price: number }[]>();
      for (const s of salesRows as any[]) {
        const fs: ForecastSale = { cardCert: s.cardCert as string, saleDate: s.saleDate as string, price: s.price as number, source: s.source as string, description: s.description as string, verified: s.verified !== 0 };
        if (!isForecastComp(fs)) continue;
        const arr = fcCompsByCert.get(fs.cardCert) ?? []; arr.push({ date: fs.saleDate, price: fs.price }); fcCompsByCert.set(fs.cardCert, arr);
      }
      const openLiveRows = (fcRowsAll as any[]).filter(r => r.origin === "live" && r.status === "open");
      const forecastsOut: any[] = (active as any[]).map((c: any) => {
        const byH = new Map<number, any>();
        for (const r of openLiveRows.filter(r => r.cert === c.cert)) {
          const cur = byH.get(r.horizonDays as number);
          if (!cur || (r.issuedAt as string) > (cur.issuedAt as string) || ((r.issuedAt as string) === (cur.issuedAt as string) && (r.id as number) > (cur.id as number))) byH.set(r.horizonDays as number, r);
        }
        const horizons = FC_HORIZONS.filter(h => byH.has(h)).map(h => { const r = byH.get(h); return { horizonDays: r.horizonDays as number, rangeLow: r.rangeLow as number, rangeHigh: r.rangeHigh as number, midpoint: r.midpoint as number, confidence: r.confidence as string, basisN: r.basisN as number, basisLastSale: r.basisLastSale as string, liquidity: r.liquidity as string, issuedAt: r.issuedAt as string }; });
        const pump = pumpList.find((p: any) => p.cert === c.cert);
        // Lock system removed Oct 14, 2026 — no card is locked; the
        // locked/keptValue fields stay in the schema, permanently inert.
        const state = horizons.length > 0 ? "open" as const : pump?.level === "High" ? "pump_suspended" as const : "insufficient" as const;
        return { cert: c.cert as string, state, pumpReason: state === "pump_suspended" ? ((pump?.factors ?? []).join(" · ") || null) : null, locked: false, keptValue: null, horizons };
      });
      const fcEligibleCount = (active as any[]).filter((c: any) => fcCompute(fcCompsByCert.get(c.cert as string) ?? [], fcToday) != null).length;
      const trackRecord = {
        live: fcSummarizeOrigin((fcRowsAll as any[]).filter(r => r.origin === "live")),
        backtest: fcSummarizeOrigin((fcRowsAll as any[]).filter(r => r.origin === "backtest")),
        coverage: { totalCards: (active as any[]).length, cardsForecast: forecastsOut.filter(f => f.state === "open").length, cardsEligible: fcEligibleCount, pumpSuspended: forecastsOut.filter(f => f.state === "pump_suspended").length, insufficient: forecastsOut.filter(f => f.state === "insufficient").length },
      };
      const paperPositionsOut = (v2PaperRows as any[]).filter((p: any) => {
        // A paper position opened from a PicClick find (now withheld by
        // the purge) is withheld too — PicClick renders nowhere.
        const deal = (dealRows as any[]).find((d: any) => d.id === p.dealId);
        return !(deal && (deal.passed === 1 || isPicClickRow(deal)));
      }).map((p: any) => {
        // mark to market: use latest deal market if deal still exists, else stored market
        const deal = (dealRows as any[]).find((d: any) => d.id === p.dealId);
        const mkt = deal?.marketUsd ?? p.marketUsd ?? p.entryUsd;
        const pnl = Math.round(((mkt - p.entryUsd) * (p.sizeFactor ?? 1)) * 100) / 100;
        return { id: p.id, scoutId: p.scoutId, cardName: p.cardName, entryUsd: p.entryUsd, marketUsd: mkt, sizeFactor: p.sizeFactor ?? 1, pnl, status: p.status };
      });
      const paperOutMap = new Map<string, any>();
      for (const s of scoutRows as any[]) {
        if (s.scoutId === "rocket") continue; // Rocket is red team — he never trades, paper or otherwise.
        const pos = paperPositionsOut.filter((p: any) => p.scoutId === s.scoutId);
        const pnl = Math.round(pos.reduce((sum: number, p: any) => sum + p.pnl, 0) * 100) / 100;
        const invested = Math.round(pos.reduce((sum: number, p: any) => sum + p.entryUsd * p.sizeFactor, 0) * 100) / 100;
        const wins = pos.filter((p: any) => p.pnl > 0).length;
        const winRate = pos.length ? Math.round((wins / pos.length) * 1000) / 10 : 0;
        const stage = (pnl > 1500 || (winRate >= 60 && pnl > 500)) ? 3 : (pnl > 300 || winRate >= 55) ? 2 : (pos.length > 0) ? 1 : 0;
        const evoNames: Record<string, string[]> = { eevee: ["Eevee", "Eevee ★ Scout Form", "Eevee ★★ Evolved — Vaporeon Scout", "Eevee ★★★ Master Scout"], gengar: ["Gengar", "Gengar ★", "Gengar ★★", "Gengar ★★★ Shadow Master"], pikachu: ["Pikachu", "Pikachu ★", "Pikachu ★★", "Raichu Scout ★★★"], snorlax: ["Snorlax", "Snorlax ★", "Snorlax ★★", "Snorlax ★★★ Awake"] };
        const evo = (evoNames[s.scoutId] ?? [s.pokemon, s.pokemon + " ★", s.pokemon + " ★★", s.pokemon + " ★★★"])[stage] ?? s.pokemon;
        paperOutMap.set(s.scoutId, { scoutId: s.scoutId, bankroll: 10000, pnl, invested, winRate, finds: s.findsCount ?? pos.length, positions: pos.length, evolution: evo, stage });
      }
      const firstSnap = (snapRows as any[])[0];
      const portfolioPoints = (snapRows as any[]).map((s: any) => ({ date: s.snapshotDate, value: firstSnap && firstSnap.totalUsd > 0 ? Math.round((s.totalUsd / firstSnap.totalUsd) * 1000) / 10 : 100 }));
      const idxNote = "Base 100 at first honest data point (Oct 8, 2026). Back-data is thin — category indices start at 100 today and accrue from refreshes; no history fabricated.";
      const indicesOut = [
        { name: "the owner's Portfolio", value: portfolioPoints.length ? portfolioPoints[portfolioPoints.length - 1]!.value : 100, note: idxNote, points: portfolioPoints.length ? portfolioPoints : [{ date: "2026-10-08", value: 100 }] },
        { name: "LV.X Index", value: 100, note: idxNote + " Category momentum tracked in Growth (LV.X +13.5% median 30d, Sep 27 tracker) — index line accrues forward.", points: [{ date: "2026-10-08", value: 100 }] },
        { name: "Gold Star Index", value: 100, note: idxNote, points: [{ date: "2026-10-08", value: 100 }] },
        { name: "Crystal / e-Series Index", value: 100, note: idxNote + " Crystal was +23.1% median 30d in Sep 27 tracker — shown in Growth, not backfilled into this line.", points: [{ date: "2026-10-08", value: 100 }] },
        { name: "EX-Era Index", value: 100, note: idxNote, points: [{ date: "2026-10-08", value: 100 }] },
        { name: "Modern Index", value: 100, note: idxNote, points: [{ date: "2026-10-08", value: 100 }] },
      ];
      const spreadsOut: any[] = [];
      for (const c of sorted.slice(0, 8) as any[]) {
        const ls = listings.filter((l: any) => l.subjectKey === `owned-${c.cert}`);
        const bestAsk = ls.length ? Math.min(...ls.map((l: any) => l.askingUsd)) : null;
        const highestBid: number | null = null;
        const vs = salesPlain.filter((s: any) => s.cardCert === c.cert && s.verified);
        const lastSale = vs.length ? (vs[0]?.price ?? null) : null;
        const spreadPct = bestAsk != null && highestBid != null && bestAsk > 0 ? Math.round(((bestAsk - highestBid) / bestAsk) * 1000) / 10 : null;
        spreadsOut.push({ key: `owned-${c.cert}`, name: `${c.name} — ${c.setName} #${c.number}`, gradeLabel: `${c.grader} ${c.grade}`, bestAsk, askSource: bestAsk != null ? "Active listing / ask (Market Terminal)" : "No live ask on file", highestBid, bidSource: highestBid != null ? "Live auction state (not a sold comp)" : "No live bid tracked", lastSale, saleSource: lastSale != null ? "Verified sold comp on file" : "No verified sale on file", spreadPct, warning: highestBid == null ? "No bids tracked — liquidity unproven" : spreadPct != null && spreadPct > 30 ? "Wide spread — thin / illiquid" : "" });
      }
      for (const w of (watchRows as any[]).filter((x: any) => x.kind === "wc").slice(0, 4)) {
        const ls = listings.filter((l: any) => l.subjectKey === `watch-${w.id}`);
        const bestAsk = ls.length ? Math.min(...ls.map((l: any) => l.askingUsd)) : null;
        spreadsOut.push({ key: `watch-${w.id}`, name: w.name, gradeLabel: "Raw (grading candidate)", bestAsk, askSource: bestAsk != null ? "Active listing / ask" : "No live ask on file — see price context (TCGplayer-tracked range)", highestBid: null, bidSource: "No live bid tracked", lastSale: null, saleSource: "No verified sale on file in dashboard", spreadPct: null, warning: "No bids tracked — liquidity unproven" });
      }
      /* ——— Round 4 (Oct 9 2026): Rocket red team, Investment Committee,
         Town Milestones, Field Journal — all computed from the same rows
         already loaded above; nothing here invents a fact. ——— */
      const termByKey = new Map<string, any>((terminal as any[]).map((t: any) => [t.subjectKey, t]));
      const popVelByCert = new Map<string, number | null>(v2Pops.map((p: any) => [p.cert, p.velocityPct]));
      const dealTier = (d: any): number => d.listingUrl ? (d.tier ?? (d.discountPct != null && d.discountPct >= 15 ? 1 : 2)) : 0;
      const rocketFindIntel: any[] = [];
      for (const d of dealRows as any[]) {
        if (d.passed === 1 || isPicClickRow(d) || !d.listingUrl || d.status === "gone" || d.status === "bought") continue;
        const tier = dealTier(d);
        if (tier !== 1 && tier !== 2) continue;
        const term = d.subjectKey ? termByKey.get(d.subjectKey) : undefined;
        const cert = d.subjectKey && d.subjectKey.startsWith("owned-") ? d.subjectKey.slice(6) : null;
        const bear = rocketBearForDeal(d as any, { thinMarket: term?.thinComps === true, popVelocityPct: cert ? (popVelByCert.get(cert) ?? null) : null });
        rocketFindIntel.push({ dealId: d.id, cardName: d.cardName, severity: bear.severity, points: bear.points });
      }
      const rocketHoldingFlags: any[] = [];
      for (const c of active as any[]) {
        const eff = c.effectiveUsd ?? null;
        if (eff == null || eff <= 0) continue;
        const ls = (listings as any[]).filter((l: any) => l.subjectKey === `owned-${c.cert}`);
        if (!ls.length) continue;
        const bestAsk = Math.min(...ls.map((l: any) => l.askingUsd));
        if (bestAsk < eff * 0.92) rocketHoldingFlags.push({ cert: c.cert, name: `${c.name} ${c.grader} ${c.grade}`, heldValue: eff, bestAsk, pctUnder: Math.round((1 - bestAsk / eff) * 1000) / 10 });
      }
      // Rocket feeds the Pump Detector as a DISPLAYED input signal (no score change).
      for (const f of rocketHoldingFlags) {
        const entry = pumpList.find((p: any) => p.cert === f.cert);
        if (entry && !entry.factors.some((x: string) => x.includes("Rocket stress test"))) entry.factors.push(`🚀 Rocket stress test (input signal): cheapest live ask $${f.bestAsk.toLocaleString()} is ${f.pctUnder}% under the held $${f.heldValue.toLocaleString()} value — asks are not sales, but this premium is not confirmed by the live market (Market Terminal listings).`);
      }
      // ——— Investment Committee: one persisted record per qualifying deal ———
      let committeeOut: any[] = [];
      try {
        const existing = await db.select().from(schema.committeeRecords);
        const haveDeal = new Set((existing as any[]).map((r: any) => r.dealId));
        const intelByDeal = new Map<number, any>(rocketFindIntel.map((r: any) => [r.dealId, r]));
        const newRows: any[] = [];
        for (const d of dealRows as any[]) {
          if (d.passed === 1 || isPicClickRow(d) || !d.listingUrl || d.status === "gone" || d.status === "bought") continue;
          const tier = dealTier(d);
          if (!(tier === 1 || (d.askingUsd ?? 0) >= 150)) continue;
          if (haveDeal.has(d.id)) continue;
          const term = d.subjectKey ? termByKey.get(d.subjectKey) : undefined;
          const intel = intelByDeal.get(d.id);
          const scoutName = (scoutRows as any[]).find((s: any) => s.scoutId === d.scoutId)?.name ?? "the finding scout";
          const disc = d.discountPct ?? null;
          const bull = `${scoutName} (finding scout): ask $${(d.askingUsd ?? 0).toLocaleString()} on ${d.marketplace}${disc != null ? ` is ${disc.toFixed(0)}% under the ${fmtMoneyShort(d.marketUsd)} comp` : " has no established comp yet"}${d.seller ? `; seller recorded (${d.seller})` : ""}; liveness ${d.lastVerifiedLiveAt ? `last positively verified ${d.lastVerifiedLiveAt}` : "not yet positively verified"}.`;
          const bearPts: string[] = intel?.points ?? [];
          const bearDefault = bearPts.length === 1 && (bearPts[0] ?? "").startsWith("Verify the cert number");
          const bearShort = (((bearPts[0] ?? "none").split(" — ")[0] ?? "").split(" (")[0] ?? "").toLowerCase();
          const bear = bearDefault ? "Rocket filed no material objection beyond cert verification — discount, seller and market depth all read clean on the records above." : bearPts.join(" ");
          const vol30 = term?.salesVolume30d ?? null;
          const liquidity = `Snorlax (liquidity): ${vol30 != null ? `${vol30} verified sale(s) in the trailing 30-day evidence window for this subject` : "no verified sales-volume figure on file for this subject"}; ${term?.thinComps ? "comps are flagged THIN — expect a slower exit and a wider bid/ask." : "market depth is not flagged thin."}`;
          let score = 50;
          if (disc != null) score += Math.min(25, disc * 0.8); else score -= 10;
          if (tier === 1) score += 8;
          if (term?.thinComps) score -= 15;
          const cert = d.subjectKey && d.subjectKey.startsWith("owned-") ? d.subjectKey.slice(6) : null;
          const pumpEntry = cert ? pumpList.find((p: any) => p.cert === cert) : undefined;
          if (pumpEntry?.level === "High") score -= 20; else if (pumpEntry?.level === "Watch") score -= 8;
          score -= 6 * Math.min(bearDefault ? 0 : (intel?.severity ?? 0), 3);
          if (vol30 != null && vol30 >= 3) score += 8; else if (vol30 === 0) score -= 8;
          if (d.seller) score += 3;
          score = Math.max(0, Math.min(100, Math.round(score)));
          const verdict = score >= 65 ? "BUY-lean" : score >= 45 ? "WATCH" : "PASS-lean";
          const rationale = disc != null ? `Ask is ${disc.toFixed(0)}% under the ${fmtMoneyShort(d.marketUsd)} comp${vol30 != null ? ` with ${vol30} verified sale(s) in 30d` : ""}; strongest objection: ${bearDefault ? "none material on file" : bearShort}.` : `No verified comp behind this ask yet; strongest objection: ${bearDefault ? "none material on file" : bearShort}.`;
          newRows.push({ dealId: d.id, cardName: d.cardName, score, verdict, bull, bear, liquidity, rationale, createdAt: new Date().toISOString().slice(0, 10) });
        }
        for (const r of newRows) {
          // Per-insert guard: two getPortfolio loads can race on first
          // composition (phone + desktop open together) — the UNIQUE
          // deal_id index makes the loser a no-op, never an error.
          try { await db.insert(schema.committeeRecords).values(r); existing.push(r as any); } catch { /* already composed by a concurrent load */ }
        }
        committeeOut = (existing as any[]).filter((r: any) => { const d: any = (dealRows as any[]).find((x: any) => x.id === r.dealId); return !(d && (d.passed === 1 || isPicClickRow(d))); }).map((r: any) => ({ id: r.id ?? 0, dealId: r.dealId, cardName: r.cardName, score: r.score, verdict: r.verdict, bull: r.bull, bear: r.bear, liquidity: r.liquidity, rationale: r.rationale, createdAt: r.createdAt }));
      } catch { /* committee table just migrated — first open composes records */ }
      // ——— Town milestones: read EXISTING real data only ———
      const soldExits = (v2Exits as any[]).filter((e: any) => e.status === "sold");
      const evolvedScout = [...paperOutMap.values()].find((p: any) => p.stage >= 2) as any;
      const milestonesOut: any[] = [
        { id: "fountain", label: "Fountain plaza", icon: "⛲", condition: "Any Tier 1 deal pinned in the live feed", met: (dealRows as any[]).some((d: any) => d.passed !== 1 && d.status !== "gone" && d.status !== "bought" && d.status !== "stale" && dealTier(d) === 1), evidence: `${(dealRows as any[]).filter((d: any) => d.passed !== 1 && d.status !== "gone" && d.status !== "bought" && d.status !== "stale" && dealTier(d) === 1).length} Tier 1 deal(s) live in the feed right now (deal ledger).` },
        { id: "garden", label: "Scout garden & statue plinth", icon: "🌷", condition: "Any scout reaches Paper League stage 2 (evolution)", met: !!evolvedScout, evidence: evolvedScout ? `${evolvedScout.scoutId} is at stage ${evolvedScout.stage} (${evolvedScout.evolution}) in the Paper League.` : "No scout has reached stage 2 yet (Paper League)." },
        { id: "markethall", label: "Market hall", icon: "🏛️", condition: "First completed Exit Desk sale", met: soldExits.length > 0, evidence: soldExits.length > 0 ? `${soldExits.length} completed sale(s) in the sold ledger (Exit Desk).` : "No completed Exit Desk sale yet — the hall stays a construction plot." },
        { id: "gym", label: "Vapor Gym", icon: "🏟️", condition: "Portfolio value reaches $25,000", met: officialTotal >= 25000, evidence: `Portfolio is $${Math.round(officialTotal).toLocaleString()} of $25,000 (vault totals).` },
        { id: "statue", label: "Champion statue", icon: "🗿", condition: "Portfolio value reaches $30,000", met: officialTotal >= 30000, evidence: `Portfolio is $${Math.round(officialTotal).toLocaleString()} of $30,000 (vault totals).` },
      ];
      // ——— Field Journal: generated ONLY from logged sweep records ———
      const journalOut: any[] = [];
      const seenScout = new Set<string>();
      for (const sw of sweepRows as any[]) {
        if (seenScout.has(sw.scoutId) || sw.scoutId === "rocket") continue;
        seenScout.add(sw.scoutId);
        const sName = (scoutRows as any[]).find((s: any) => s.scoutId === sw.scoutId)?.name ?? sw.scoutId;
        // Journal matching compares DATES: deal rows carry a date
        // (YYYY-MM-DD) while sweptAt is a full ISO timestamp — the old
        // strict equality between the two never matched, so journal
        // entries cited sweep find counts but never linked the finds.
        const nearMiss = (dealRows as any[]).filter((d: any) => d.passed !== 1 && !isPicClickRow(d) && d.scoutId === sw.scoutId && dealTier(d) === 2 && (d.firstFoundAt ?? d.foundAt) === String(sw.sweptAt).slice(0, 10)).slice(0, 2).map((d: any) => d.cardName);
        const finds = (dealRows as any[]).filter((d: any) => d.passed !== 1 && !isPicClickRow(d) && d.scoutId === sw.scoutId && (d.firstFoundAt ?? d.foundAt) === String(sw.sweptAt).slice(0, 10)).slice(0, 3);
        journalOut.push({
          scoutId: sw.scoutId, title: `${sName} — shift log`, date: sw.sweptAt,
          body: `Swept ${sw.sourcesChecked} on ${sw.sweptAt}: ${sw.candidatesSeen} candidates reviewed, ${sw.findsCount} find(s) filed (${sw.tier1Count} Tier 1, ${sw.tier2Count} Tier 2)${nearMiss.length ? `; near-misses kept in the Trenches: ${nearMiss.join(", ")}` : ""}. ${(sw.note ?? "").slice(0, 240)}`,
          links: finds.map((d: any) => ({ label: d.cardName as string, href: `#ledger-${d.id}` })),
        });
      }
      if (rocketFindIntel.length || rocketHoldingFlags.length) {
        journalOut.unshift({
          scoutId: "rocket", title: "🚀 Intercepted transmission — Rocket Grunt", date: (sweepRows as any[])[0]?.sweptAt ?? "",
          body: `Boss, the twerp's operation, audited: ${rocketFindIntel.length} active find(s) challenged with written bear cases${rocketHoldingFlags.length ? ` and ${rocketHoldingFlags.length} holding(s) failing the live-ask stress test (${rocketHoldingFlags.map((f: any) => `${f.name} — cheapest live ask ${f.pctUnder}% under held value`).join("; ")})` : " and no holding failing the live-ask stress test"}. Every claim cites its record — Rocket intel rides with the finds, and the full stress list sits in Risk. — R`,
          links: [{ label: "Risk — Rocket stress tests", href: "#v2-risk" }],
        });
      }
      const v2 = {
        alerts: (v2Alerts as any[]).filter((a: any) => a.status !== "withheld_picclick" && a.status !== "withheld_ended" && a.status !== "withheld_passed" && a.status !== "resolved_closed" && !isPicClickUrl(a.listingUrl as string | null) && !isDismissedKey(a.listingUrl as string | null)).map((a: any) => ({ id: a.id, alertType: a.alertType, cardName: a.cardName, price: a.price ?? null, discountPct: a.discountPct ?? null, listingUrl: a.listingUrl ?? null, payload: a.payload, status: a.status, createdAt: a.createdAt })),
        pops: v2Pops,
        pump: pumpList,
        paper: [...paperOutMap.values()],
        paperPositions: paperPositionsOut,
        indices: indicesOut,
        spreads: spreadsOut,
        exits: (v2Exits as any[]).map((e: any) => ({ id: e.id, cert: e.cert, cardName: e.cardName, title: e.title, description: e.description, suggestedPrice: e.suggestedPrice ?? null, priceSource: e.priceSource, status: e.status, salePrice: e.salePrice ?? null, feeEstimate: e.feeEstimate ?? null, netUsd: e.netUsd ?? null, soldDate: e.soldDate ?? null, createdAt: e.createdAt })),
        passedNames: [...(watchRows as any[]).filter((w: any) => isPassedStatus(w.status)).map((w: any) => w.name as string), ...(dealRows as any[]).filter((d: any) => d.passed === 1).map((d: any) => d.cardName as string)],
        rocket: { findIntel: rocketFindIntel, holdingFlags: rocketHoldingFlags },
        committee: committeeOut,
        milestones: milestonesOut,
        journal: journalOut,
        watchPoints: (v2WatchPointRows as any[]).map((p: any) => ({ watchId: p.watchId, priceUsd: p.priceUsd, sourceType: p.sourceType, recordedOn: p.recordedOn })),
      };
      /* ——— Findings Ledger union ———
         EVERY stored finding, from both stores, deduped by listing URL
         (deal_feed wins). Passed rows stay withheld (they render
         nowhere, per the owner's rule). Gone/stale listing rows ARE
         included — the ledger's Expired/Stale tabs are their home.
         LEDGER LIVENESS STAYS STRICT (Oct 10, 2026): a linked row with
         NO positive live verification on file reports as 'stale' here
         even while the same listing shows in the Market Terminal
         census — unverified listings are never ledger-live, never
         Close, and never Pinned. */
      const ledgerDeals: any[] = (dealRows as any[]).filter((d: any) => d.passed !== 1 && !isPicClickRow(d) && !((d.status as string) !== "gone" && isDismissedKey(d.listingUrl as string | null))).map((d: any) => { const tier = d.listingUrl ? (d.tier ?? (d.discountPct != null && d.discountPct >= 15 ? 1 : 2)) : 0; const pctOfMarket = d.marketUsd != null && d.marketUsd > 0 ? Math.round((d.askingUsd / d.marketUsd) * 1000) / 10 : null; const rawStatus = (d.status as string) || (!d.listingUrl ? "sighting" : "live"); const status = d.listingUrl ? (rawStatus === "gone" || rawStatus === "bought" ? rawStatus : !d.lastVerifiedLiveAt ? "stale" : effectiveLiveStatus({ ...d, status: rawStatus }, readNowMs)) : rawStatus; return { id: d.id, source: "deal" as const, cardName: d.cardName, gradeLabel: d.gradeLabel, askingUsd: d.askingUsd, marketUsd: d.marketUsd, discountPct: d.discountPct, pctOfMarket, marketplace: d.marketplace, seller: d.seller ?? null, listingUrl: d.listingUrl, foundAt: d.foundAt, scoutId: d.scoutId, checkedDate: d.checkedDate, note: d.note, isExample: d.isExample !== 0, tier, status, firstFoundAt: d.firstFoundAt ?? d.foundAt ?? null, lastSeenAt: d.lastSeenAt ?? d.checkedDate ?? d.foundAt ?? null, prevAskingUsd: d.prevAskingUsd ?? null, subjectKey: d.subjectKey ?? null, targetGroup: (d.targetGroup as string) || targetGroupFor(d.cardName as string, d.subjectKey ?? null, null), lastVerifiedLiveAt: d.lastVerifiedLiveAt ?? null, endedAt: d.endedAt ?? null, endedReason: d.endedReason ?? null, verifyMissStreak: d.verifyMissStreak ?? 0, lastCheckAt: d.lastCheckAt ?? null, endsAt: d.endsAt ?? null }; });
      const ledgerDealUrls = new Set(ledgerDeals.map((d: any) => d.listingUrl).filter((u: any): u is string => !!u));
      // Canonical dedupe (Oct 12, 2026): a listing twin stored under a
      // re-parameterized URL variant is the SAME finding as its deal —
      // the exact-string set let both render as separate ledger cards.
      const ledgerDealKeys = new Set([...ledgerDealUrls].map(u => canonicalListingKey(u)));
      const ledgerListings: any[] = (listingRows as any[]).filter((l: any) => l.passed !== 1 && !isPicClickRow(l) && !(l.listingUrl && ledgerDealUrls.has(l.listingUrl)) && !(l.listingUrl && ledgerDealKeys.has(canonicalListingKey(l.listingUrl as string))) && !((l.status as string) !== "gone" && isDismissedKey(l.listingUrl as string | null))).map((l: any) => { const pctOfMarket = l.marketUsd != null && l.marketUsd > 0 ? Math.round((l.askingUsd / l.marketUsd) * 1000) / 10 : null; const discountPct = pctOfMarket != null ? Math.round((100 - pctOfMarket) * 10) / 10 : null; const tier = !l.listingUrl ? 0 : discountPct != null && discountPct >= 15 ? 1 : 2; const rawStatus = (l.status as string) || "live"; const status = l.listingUrl ? (rawStatus === "gone" ? "gone" : !l.lastVerifiedLiveAt ? "stale" : effectiveLiveStatus({ ...l, status: rawStatus }, readNowMs)) : rawStatus; return { id: l.id, source: "listing" as const, cardName: l.subjectName, gradeLabel: l.gradeLabel, askingUsd: l.askingUsd, marketUsd: l.marketUsd, discountPct, pctOfMarket, marketplace: l.marketplace, seller: l.seller ?? null, listingUrl: l.listingUrl, foundAt: l.foundAt, scoutId: l.scoutId, checkedDate: null, note: "", isExample: false, tier, status, firstFoundAt: l.firstFoundAt ?? l.foundAt ?? null, lastSeenAt: l.lastSweptAt ?? l.foundAt ?? null, prevAskingUsd: l.prevAskingUsd ?? null, subjectKey: l.subjectKey ?? null, targetGroup: targetGroupFor(l.subjectName as string, l.subjectKey ?? null, null), lastVerifiedLiveAt: l.lastVerifiedLiveAt ?? null, endedAt: l.endedAt ?? null, endedReason: l.endedReason ?? null, verifyMissStreak: l.verifyMissStreak ?? 0, lastCheckAt: l.lastCheckAt ?? null, endsAt: l.endsAt ?? null }; });
      const ledger = [...ledgerDeals, ...ledgerListings];
      /* Cost summary (Remedies pass 1 — audit remedy P0-3): P&L over
         ACTIVE cards that carry a recorded cost only. It is a
         partial-coverage figure by construction — cards without a
         cost on file contribute nothing to either side — and the
         hero line that renders it says so. */
      const costedCards = active.filter((c: any) => c.costBasisUsd != null && c.effectiveUsd != null);
      const totalCostUsd = Math.round(costedCards.reduce((s: number, c: any) => s + (c.costBasisUsd as number), 0) * 100) / 100;
      const currentValueOfCostedUsd = Math.round(costedCards.reduce((s: number, c: any) => s + (c.effectiveUsd as number), 0) * 100) / 100;
      const unrealizedPlUsd = Math.round((currentValueOfCostedUsd - totalCostUsd) * 100) / 100;
      const costSummary = { cardsWithCost: costedCards.length, totalCostUsd, currentValueOfCostedUsd, unrealizedPlUsd, unrealizedPlPct: costedCards.length > 0 && totalCostUsd > 0 ? Math.round((unrealizedPlUsd / totalCostUsd) * 1000) / 10 : null };
      return {
        cards,
        sales: salesRows.map((s: any) => ({ id: s.id, cardCert: s.cardCert, saleDate: s.saleDate, price: s.price, source: s.source, description: s.description, verified: s.verified !== 0 })),
        snapshots: snapRows.map((s: any) => ({ id: s.id, snapshotDate: s.snapshotDate, totalUsd: s.totalUsd, pricedCount: s.pricedCount, note: s.note })),
        scouts: scoutRows.map((s: any) => { const sw = latestSweepByScout.get(s.scoutId); const sweptAt = s.lastSweepAt ?? sw?.sweptAt ?? null; const cand = s.lastSweepAt ? (s.lastSweepCandidates ?? 0) : (sw?.candidatesSeen ?? 0); const finds = s.lastSweepAt ? (s.lastSweepFinds ?? 0) : (sw?.findsCount ?? 0); return { id: s.id, scoutId: s.scoutId, name: s.name, pokemon: s.pokemon, emoji: s.emoji, territory: s.territory, statusLine: derivedScoutStatusLine(s, ledger, sw ?? null), lastChecked: s.lastChecked, findsCount: (dealRows as any[]).filter((d: any) => d.scoutId === s.scoutId && d.passed !== 1).length, lastSweepAt: sweptAt, lastSweepCandidates: cand, lastSweepFinds: finds, lastSweepLabel: fmtSweepLabel(sweptAt, cand, finds) }; }),
        deals: ledgerDeals.map((d: any) => { const { source: _source, ...rest } = d; return rest; }),
        ledger,
        sweeps: (sweepRows as any[]).map((s: any) => ({ id: s.id, scoutId: s.scoutId, sweptAt: s.sweptAt, sourcesChecked: s.sourcesChecked, candidatesSeen: s.candidatesSeen, findsCount: s.findsCount, tier1Count: s.tier1Count, tier2Count: s.tier2Count, note: s.note })),
        listings,
        terminal,
        sources: sourceRows.map((s: any) => ({ id: s.id, name: s.name, sourceType: s.sourceType, coverage: s.coverage, caveat: s.caveat, trustLevel: s.trustLevel, sortOrder: s.sortOrder })),
        watchlist: watchRows.filter((w: any) => !isHiddenWatchStatus(w.status)).map((w: any) => ({ id: w.id, name: w.name, kind: w.kind, priceContext: w.priceContext, thesis: w.thesis, actionRule: w.actionRule, lastChecked: w.lastChecked, status: w.status, sortOrder: w.sortOrder, scoutId: w.scoutId ?? scoutForWatch(w.name), setName: (w.setName as string) ?? "", cardNumber: (w.cardNumber as string) ?? "", intent: (w.intent as string) ?? "", gradeLabel: (w.gradeLabel as string) ?? "", maxBuyUsd: (w.maxBuyUsd as number | null) ?? parseMaxBuy(w.priceContext as string) })),
        scoutConfigs: scoutConfigsOut,
        totals: {
          officialTotal: Math.round(officialTotal * 100) / 100,
          vaultSumPriced: Math.round(vaultSum * 100) / 100,
          pricedCount: priced.length, totalCount: active.length, activeCount: active.length,
          psaCount: active.filter((c: any) => c.grader === "PSA").length,
          cgcCount: active.filter((c: any) => c.grader === "CGC").length,
          topHoldingName: top ? `${top.name} — ${top.grader} ${top.grade}` : "—",
          topHoldingValue: top?.effectiveUsd ?? 0,
          topHoldingPct: officialTotal > 0 && top ? Math.round(((top.effectiveUsd ?? 0) / officialTotal) * 1000) / 10 : 0,
          costSummary,
        },
        logs: logRows.map((l: any) => ({ id: l.id, ranAt: l.ranAt.toISOString(), summary: l.summary, cardsChecked: l.cardsChecked })),
        forecasts: forecastsOut,
        trackRecord,
        v2,
      };
    },
  }),

  /* Show Mode camera scan: OCR / QR-read a slab photo, match in code
     against tracked certs + names, and return what was read plus any
     tracked matches. The photo itself is never persisted. */
  scanSlabPhoto: defineAction({
    request: z.object({
      imageBase64: z.string().min(100).max(12_000_000),
      mimeType: z.enum(["image/jpeg", "image/png"]),
      qrPayload: z.string().max(2000).nullable().default(null),
    }),
    response: scanSlabResponse,
    async handler(ctx, args): Promise<z.infer<typeof scanSlabResponse>> {
      const emptyExtracted = { grader: null, grade: null, cardName: null, setName: null, number: null, year: null, visibleText: "", confidence: "low" as const };
      const qrCerts = certCandidatesFrom(args.qrPayload);
      let ocr: z.infer<typeof slabOcrSchema> | null = null;
      let ocrFailed = false;
      try {
        ocr = await ctx.inference.complete(
          "Read this photo of a graded trading-card slab (or its label / QR code). Extract ONLY what is actually visible in the photo — never guess or complete a partially visible number. certNumbers: every distinct digit sequence of 6 to 10 digits printed on the label (the certification number is usually the longest one), copied digit-for-digit. grader: the grading company shown (e.g. PSA, CGC, BGS) or null. grade: the numeric grade shown or null. cardName / setName / number / year: the card's name, set name, collector number and year as printed, or null when not visible. qrText: if a QR code is present and you can read its payload, return that payload text, otherwise null. visibleText: the main label text you could read, briefly. readable: true only when at least the cert number or the card name + grade are legible. confidence: how certain you are of the cert number digits specifically.",
          { schema: slabOcrSchema, images: [{ dataBase64: args.imageBase64, mimeType: args.mimeType, filename: "slab-photo", caption: "Graded slab label photo taken in Show Mode" }] },
        );
      } catch { ocrFailed = true; }

      const certCandidates = [...new Set([
        ...qrCerts,
        ...certCandidatesFrom(ocr?.qrText),
        ...(ocr?.certNumbers ?? []).flatMap(n => certCandidatesFrom(n)),
      ])];
      const extracted = ocr
        ? { grader: ocr.grader, grade: ocr.grade, cardName: ocr.cardName, setName: ocr.setName, number: ocr.number, year: ocr.year, visibleText: ocr.visibleText, confidence: ocr.confidence }
        : emptyExtracted;

      // ——— Match IN CODE against tracked data only ———
      const db = ctx.db<typeof schema>();
      const cardRows = await db.select().from(schema.cards);
      const matches: z.infer<typeof scanMatchOut>[] = [];
      const seenCerts = new Set<string>();
      for (const cert of certCandidates) {
        const c = (cardRows as any[]).find(x => x.cert === cert && x.status === "active");
        if (c && !seenCerts.has(c.cert as string)) {
          seenCerts.add(c.cert as string);
          matches.push({ cert: c.cert as string, name: `${c.name} — ${c.setName} #${c.number}`, grader: c.grader as string, grade: c.grade as string, relation: "owned" });
        }
      }
      const nameKey = (ocr?.cardName ?? "").trim().toLowerCase();
      if (matches.length === 0 && nameKey.length >= 3) {
        for (const c of cardRows as any[]) {
          if (c.status !== "active") continue;
          const cn = (c.name as string).toLowerCase();
          if (cn.includes(nameKey) || nameKey.includes(cn.split("—")[0]!.trim().toLowerCase())) {
            if (!seenCerts.has(c.cert as string)) {
              seenCerts.add(c.cert as string);
              matches.push({ cert: c.cert as string, name: `${c.name} — ${c.setName} #${c.number}`, grader: c.grader as string, grade: c.grade as string, relation: "owned" });
            }
          }
          if (matches.length >= 4) break;
        }
      }

      const qrCert = qrCerts[0] ?? certCandidatesFrom(ocr?.qrText)[0] ?? null;
      let status: z.infer<typeof scanSlabResponse>["status"];
      let message: string;
      if (matches.length > 0 && certCandidates.some(c => seenCerts.has(c) && matches.some(m => m.cert === c))) {
        status = "matched_cert";
        message = `Cert ${matches[0]!.cert} matched a tracked slab — its verdict is loaded below.`;
      } else if (matches.length > 0) {
        status = "matched_name";
        message = `No cert match, but the card name read from the label matches ${matches.length} tracked card${matches.length === 1 ? "" : "s"} — pick the right one below and confirm the cert by eye.`;
      } else if (certCandidates.length > 0) {
        status = "not_tracked";
        message = `Read cert candidate${certCandidates.length === 1 ? "" : "s"} ${certCandidates.join(", ")} — none is in the tracked collection, so no verdict is shown. Check the digits against the label; a misread digit is the usual cause.`;
      } else if (ocrFailed && !args.qrPayload) {
        status = "not_read";
        message = "The photo couldn't be read — retake it straight-on, filling the frame with the slab label, with glare off the cert number and QR code.";
      } else if (ocr && !ocr.readable) {
        status = "not_read";
        message = "The label wasn't legible in that photo — retake it closer, straight-on, with glare off the cert number and QR code. What little was read is shown below.";
      } else if (certCandidates.length === 0 && matches.length === 0) {
        status = "candidates";
        message = "Some label text was read but no cert number could be extracted — confirm the details below, or type the cert manually.";
      } else {
        status = "not_tracked";
        message = "Nothing in the tracked data matches what was read — check the label and try again, or search by name.";
      }
      if (ocrFailed && args.qrPayload) {
        message = `QR code decoded on your device (${args.qrPayload.slice(0, 80)}), but the photo OCR pass failed — cert candidates from the QR are shown; verify them against the label.`;
        if (matches.length === 0 && certCandidates.length > 0) status = "not_tracked";
      }
      return { ok: true as const, status, certCandidates, qrPayload: args.qrPayload ?? ocr?.qrText ?? null, qrCert, extracted, matches, message };
    },
  }),

  createExitDraft: defineAction({
    request: z.object({ cert: z.string() }),
    response: z.object({ ok: z.literal(true), id: z.number() }),
    async handler(ctx, args): Promise<{ ok: true; id: number }> {
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.cards);
      const c: any = rows.find((r: any) => r.cert === args.cert);
      if (!c) return { ok: true as const, id: 0 };
      const eff = effectiveOf(c);
      const prov = String(c.notes ?? "").includes("Provenance:") ? String(c.notes).split("Provenance:")[1]?.trim().split(" Market watch")[0] ?? "" : "";
      const title = `${c.year} Pokemon ${c.setName} ${c.name} #${c.number} ${c.grader} ${c.grade} — Cert ${c.cert}`;
      const description = `${c.name} from ${c.year} ${c.setName} (#${c.number}), graded ${c.grader} ${c.grade} (cert ${c.cert}). ${c.popInfo ? "Population: " + c.popInfo + ". " : ""}${prov ? "Provenance: " + prov + " " : ""}Advisor note: ${c.advisorReason} Photos: front slab, back slab, cert close-up, holo angle, any edge/corner detail. Draft only — the owner lists and sells himself; no automated selling.`;
      const priceSource = eff != null ? (c.checkedUsd != null ? "Comp-based official — latest live checked price (verified sold comps / aggregator cross-check)" : "Vault estimate — unverified, verify before listing") : "No price on file";
      const inserted: any = await db.insert(schema.exitDrafts).values({ cert: c.cert, cardName: `${c.name} ${c.grader} ${c.grade}`, title, description, suggestedPrice: eff, priceSource, status: "draft", createdAt: new Date().toISOString() }).returning({ id: schema.exitDrafts.id });
      ctx.invalidateQueries();
      return { ok: true as const, id: inserted[0]?.id ?? 0 };
    },
  }),

  updateExitDraft: defineAction({
    request: z.object({ id: z.number(), status: z.enum(["draft", "listed", "sold"]), salePrice: z.number().nullable().optional(), soldDate: z.string().nullable().optional() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      const patch: any = { status: args.status };
      if (args.status === "sold" && args.salePrice != null) {
        const fee = Math.round(args.salePrice * 0.13 * 100) / 100;
        patch.salePrice = args.salePrice; patch.feeEstimate = fee; patch.netUsd = Math.round((args.salePrice - fee) * 100) / 100; patch.soldDate = args.soldDate ?? new Date().toISOString().slice(0, 10);
      }
      await db.update(schema.exitDrafts).set(patch).where(eq(schema.exitDrafts.id, args.id));
      ctx.invalidateQueries();
      return { ok: true as const };
    },
  }),

  /* Delete an Exit Desk draft (owner, Oct 13): a REAL delete of the
     draft record only — the card, its Decision, comps and values are
     untouched, and deletion is NOT a pass: the card can generate a
     fresh draft again immediately (no suppression anywhere). */
  deleteExitDraft: defineAction({
    request: z.object({ id: z.number() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      await db.delete(schema.exitDrafts).where(eq(schema.exitDrafts.id, args.id));
      ctx.invalidateQueries();
      return { ok: true as const };
    },
  }),

  passListing: defineAction({
    request: z.object({ id: z.number() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      await db.update(schema.marketListings).set({ passed: 1 }).where(eq(schema.marketListings.id, args.id));
      // CROSS-STORE PASS (Oct 12, 2026): the same listing usually also
      // lives in deal_feed. Passing only the Terminal row left the
      // deal twin visible — it resurfaced in the Ledger and Trenches
      // as the "same card popping up" the owner reported. Pass every row
      // for this listing (canonical key, so tracking-parameter URL
      // variants match too) and withhold its deal alerts.
      const listingRows = await db.select().from(schema.marketListings);
      const row: any = (listingRows as any[]).find(r => r.id === args.id);
      if (row?.listingUrl) {
        const key = canonicalListingKey(row.listingUrl as string);
        const dealRows = await db.select().from(schema.dealFeed);
        for (const d of dealRows as any[]) {
          if (d.passed !== 1 && d.listingUrl && canonicalListingKey(d.listingUrl as string) === key) {
            await db.update(schema.dealFeed).set({ passed: 1 }).where(eq(schema.dealFeed.id, d.id));
          }
        }
        try {
          const alertRows = await db.select().from(schema.dealAlerts);
          for (const a of alertRows as any[]) {
            if (a.listingUrl && canonicalListingKey(a.listingUrl as string) === key && a.status !== "withheld_passed") {
              await db.update(schema.dealAlerts).set({ status: "withheld_passed" }).where(eq(schema.dealAlerts.id, a.id));
            }
          }
        } catch { /* alerts table present on all current DBs; best-effort */ }
      }
      ctx.invalidateQueries();
      return { ok: true as const };
    },
  }),

  updateCardValue: defineAction({
    request: z.object({ cert: z.string(), checkedUsd: z.number().nullable(), advisorCall: z.string().optional(), advisorReason: z.string().optional() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.cards);
      const row = rows.find((r: any) => r.cert === args.cert);
      if (row) {
        const newNotes = args.checkedUsd != null ? cleanNotes(row.notes) + ` [official:${args.checkedUsd}]` : cleanNotes(row.notes);
        await db.update(schema.cards).set({ checkedUsd: args.checkedUsd, advisorCall: args.advisorCall ?? row.advisorCall, advisorReason: args.advisorReason ?? row.advisorReason, notes: newNotes, lastChecked: new Date().toISOString().slice(0, 10) }).where(eqId(row.id));
        // SNAPSHOT CONSISTENCY (phase 2, Oct 13, 2026): a manual value
        // save moves the official total in this same write, so today's
        // snapshot is revalued from the fresh officials here too —
        // this was the one value-changing write that never touched
        // the snapshot, leaving the growth line's latest point lagging
        // the headline total until the next findings-bearing refresh.
        try {
          const today = new Date().toISOString().slice(0, 10);
          const fresh = await db.select().from(schema.cards);
          const pricedVals = (fresh as any[]).filter((r: any) => r.status === "active").map((r: any) => effectiveOf(r)).filter((v: number | null) => v != null) as number[];
          const total = Math.round(pricedVals.reduce((s: number, v: number) => s + v, 0) * 100) / 100;
          if (total > 0) {
            const snaps = await db.select().from(schema.portfolioSnapshots);
            const todaySnap = (snaps as any[]).find((s: any) => s.snapshotDate === today);
            if (todaySnap) {
              await db.update(schema.portfolioSnapshots).set({ totalUsd: total, pricedCount: pricedVals.length }).where(eq(schema.portfolioSnapshots.id, todaySnap.id));
            } else {
              await db.insert(schema.portfolioSnapshots).values({ snapshotDate: today, totalUsd: total, pricedCount: pricedVals.length, note: "Comp-based revaluation — official values updated from live checked comps on refresh." });
            }
          }
        } catch { /* snapshot upsert is best-effort alongside the value save */ }
      }
      ctx.invalidateQueries();
      return { ok: true as const };
    },
  }),

  /* Cost basis entry (Remedies pass 1, Oct 13, 2026 — audit remedy
     P0-3): records what the owner actually paid for a card, with an
     optional note and purchase date. costUsd null CLEARS the cost
     (note and date clear with it). Nothing seeds these fields — the
     vault CSV cost column was blank, and inventing allocations is
     forbidden — so every card starts with no cost on file. Follows
     updateCardValue's shape; never touches values, notes, or the
     [official:] tag. */
  updateCardCost: defineAction({
    request: z.object({ cert: z.string(), costUsd: z.number().nonnegative().nullable(), note: z.string().max(500).nullable().optional(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.cards);
      const row = rows.find((r: any) => r.cert === args.cert);
      if (row) {
        const clearing = args.costUsd == null;
        await db.update(schema.cards).set({
          costBasisUsd: args.costUsd,
          costNote: clearing ? null : (args.note !== undefined ? args.note : ((row.costNote as string | null) ?? null)),
          costDate: clearing ? null : (args.date !== undefined ? args.date : ((row.costDate as string | null) ?? null)),
        }).where(eqId(row.id));
      }
      ctx.invalidateQueries();
      return { ok: true as const };
    },
  }),

  refreshPrices: defineAction({
    // fullSweep (owner order, Oct 13, 2026): a ONE-TIME hard push that
    // overrides the rotating slice for that run only — every active
    // card gets worked under the depth protocol. Default (absent /
    // false) is the unchanged daily rotation.
    request: z.object({ fullSweep: z.boolean().optional() }),
    response: z.object({ ok: z.literal(true), summary: z.string() }),
    async handler(ctx, args): Promise<{ ok: true; summary: string }> {
      await ensureSeed(ctx);
      await ensureCollectrScrap(ctx);
      await ensureWatchlist(ctx);
      await ensureSnapshots(ctx);
      await ensureScouts(ctx);
      await ensureScoutHunts(ctx);
      await ensurePicClickPurge(ctx);
      await ensureOwnerReportedEnded(ctx);
      await ensureOwnerReportedAllEnded(ctx);
      await ensureClosedAuctionAlerts(ctx);
      const db = ctx.db<typeof schema>();
      let summary = "Daily price refresh — PICCLICK NOT SERVED (links broken, removed Oct 9, 2026: PicClick findings are withheld and PicClick candidates are discarded at capture — eBay, TCGplayer, Mercari, Yahoo Japan, Fanatics Collect and direct marketplace links remain). Prices re-check (scout sweeps are decoupled and run every ~2 hours via scoutSweep, newly-listed BIN first; ≥15% under comp pins Tier 1, 8–15% under shows as Tier 2 Close; sweeps capture EVERY priced listing for tracked cards into the Market Terminal — ask vs market % with a deal flag at ≤80% — so the Terminal is a full listing census like Cardboard Terminal, not a deals-only feed, while pinned deals keep the strict verified-live bar), and prices re-check against the SOURCE HIERARCHY (Oct 14, 2026): (1) eBay SOLD search PRIMARY (signed-in session; completed/sold search renders per-sale prices + dates; exact printing + grade mandatory; clean price = sold at that price and bookable; struck-through / best-offer-accepted = true price hidden, flagged context only, never a clean comp); (2) Fanatics Collect co-primary for auctions / high-end; (3) major auction houses; (4) aggregators (PriceCharting, PSA, CardTrack) CROSS-CHECK / CONTEXT ONLY — never the filed source when an eBay sold record exists, never named in a verified filing. SESSION-EXPIRY FALLBACK: a run that finds the session signed out / walled / prices not rendering must SAY SO LOUDLY at the top of its summary and label fallback filings as fallback — never a silent downgrade. pokeprices.io with caution (never unlabeled, never sole source); pokeinvesting.com for PSA 10 values / pop only (no sales); Collektr and CardCodex as asks only — and Collektr is SCRAPPED for eBay ended/sold data (Oct 14, 2026): never a relay for ended listings in any capacity, direct eBay sold search only; eBay listing pages and PSA cert pages are not sold data. Unpriced CGC cards, unverified estimates and watchlist prices re-checked — including the silver-border WC raw targets (TCGplayer-tracked values vs max-buys) and the Japanese Vending Series hunt (first refresh establishes Japanese comps; no max-buy until then). OFFICIAL VALUE POLICY (Oct 10, 2026 — owner: 'make the official number based off comps / live'): the headline portfolio total is COMP-BASED — every card's official value is its latest checked price from verified comps / live checks, and saveRefreshFindings revalues the officials (and today's snapshot) automatically when findings land. The Oct 9 freeze is retired. No card is locked — the owner-kept lock system was removed Oct 14, 2026 (owner: values fully automated, regardless of where they land), so every card revalues from verified comps under the multiple-verified-sales rule; unverified seller-reported prints stay excluded forever. Cards unlocked from former kept values float to their own printing's verified comps; never use a different printing as a comp.";
      // (Refresh log is inserted AFTER the research dispatch below, so the
      // stored summary includes the dispatch result — the old code logged
      // "queued" before a dispatch that silently never happened.)
      // Append today's portfolio snapshot (one per day) so the growth line accrues honestly.
      try {
        const today = new Date().toISOString().slice(0, 10);
        const cardRows = await db.select().from(schema.cards);
        const activeRows = (cardRows as any[]).filter(r => r.status === "active");
        const pricedRows = activeRows.map(r => effectiveOf(r)).filter((v: number | null) => v != null) as number[];
        const total = Math.round(pricedRows.reduce((s, v) => s + v, 0) * 100) / 100;
        const snaps = await db.select().from(schema.portfolioSnapshots);
        if (total > 0 && !(snaps as any[]).some(s => s.snapshotDate === today)) {
          await db.insert(schema.portfolioSnapshots).values({ snapshotDate: today, totalUsd: total, pricedCount: pricedRows.length, note: "Daily refresh snapshot — comp-based official total (saveRefreshFindings revalues it when today's findings land)." });
        }
        const scoutRows = await db.select().from(schema.scoutStatus);
        for (const s of scoutRows as any[]) {
          await db.update(schema.scoutStatus).set({ lastChecked: today }).where(eq(schema.scoutStatus.id, s.id));
        }
      } catch { /* snapshot / scout stamp is best-effort alongside the log */ }
      // ——— Forecast Engine (fc-v1): grade matured live forecasts,
      // seed the one-time backtest, issue fresh ranges — inside this
      // daily refresh, so no cron changes are needed. Runs BEFORE the
      // research dispatch so it grades/issues on evidence on file; a
      // failure here is reported in the log, never swallowed. ———
      try {
        summary += await runForecastEngine(ctx);
      } catch (e) {
        summary += ` Forecast engine pass FAILED (${e instanceof Error ? e.message.slice(0, 120) : "unknown error"}) — no forecasts were graded or issued by this run; official values unchanged.`;
      }
      const refreshPrompt = "Research current market prices for this Pokemon graded-card portfolio. SOURCE HIERARCHY (Oct 14, 2026 — owner law for ALL evidence collection): (1) eBay SOLD search is the PRIMARY comp source — the working browser carries the owner's signed-in eBay session (he signed in himself; never enter credentials), so completed/sold search (LH_Sold=1&LH_Complete=1) renders per-sale prices + dates: pull each checked card's sold results FIRST, match the EXACT printing + grade (wrong-printing results — e.g. promo variants sharing a name — are NOT comps), and file distinct verified sales from there first. eBay capture rules: a CLEAN displayed price means it sold at that price and is bookable; a STRUCK-THROUGH price / 'Best offer accepted' means the true price is HIDDEN — file it ONLY as flagged hidden-price context, never as a clean comp at the displayed figure. (2) Fanatics Collect stays CO-PRIMARY for auctions / high-end. (3) Major auction houses (Heritage, Goldin, PWCC) unchanged. (4) Aggregators (PriceCharting, CardTrack, PSA estimates and kin) are CROSS-CHECK / CONTEXT ONLY — never the filed source for a sale when an eBay sold record exists, and never named in a verified filing (the classifier rule below stands). SESSION-EXPIRY FALLBACK (mandatory): if the eBay session is signed out, walled, or sold prices are not rendering, SAY SO LOUDLY at the TOP of your saveRefreshFindings summary (start it with 'EBAY SESSION FALLBACK:') and proceed with Fanatics / auction / aggregator-context filings clearly LABELLED as the fallback — never silently degrade to aggregator-only evidence while claiming the usual standard. General source list (under the hierarchy above): eBay sold, Fanatics Collect, major auction houses, then aggregators as cross-check only. THE SLICE (unchanged breadth — the owner, Oct 12, 2026: leave the rotation as it is): check roughly 8-14 owned cards this run — the still-unpriced cards and the unverified-estimate cards while they remain unverified, plus a rotating spot-check slice across the rest of the collection — the spot-check slice rotates across runs (Gengar, Magikarp and Lugia were the original examples), plus the watchlist and theme re-checks below. Do NOT attempt all 45 owned cards in one run. DEPTH PROTOCOL (Oct 13, 2026 — depth per checked card, not a wider slice): for EACH owned card you check, research its completed sales across the trailing 180 days and file EVERY distinct verified sold comp you can source (cap ~10 per card per run), not just the latest one — forecast eligibility needs at least 3 verified sold comps in the trailing 180 days with the latest no more than 90 days old, and one-comp-per-run filing is why almost every card sits below that bar. Before researching, read the evidence already on file (getPortfolio sales evidence, or the inspectSalesEvidence diagnostics) and work the slice in this order: (1) cards with exactly 2 verified comps on file in the window — one more sourced sale makes them forecast-eligible; (2) cards with exactly 1; (3) cards whose latest verified comp is oldest; (4) the rest of the slice. VERIFIED means an actual completed sale at eBay sold, Fanatics Collect, or a major auction house (Heritage, Goldin, PWCC) with a readable CLEAN price. The owner's eBay rule: a clean displayed price means it sold at that price; a STRUCK-THROUGH price means a lower best offer was accepted and the true price is hidden — file struck-through sales ONLY as flagged hidden-price context (the description must state the true price is hidden and unknown), NEVER as a clean comp, and never let one be the filing that sets a checked price. FILING FORMAT (mandatory — the dashboard's forecast-comp classifier reads your labels literally): each sale is its own saveRefreshFindings update; the source label names the PRIMARY VENUE ONLY (eBay sold / Fanatics Collect / Goldin / Heritage Auctions / PWCC / Mercari JP sold / Yahoo Japan sold); the description carries the sale facts only (card + grade, seller, end date, price basis including buyer's premium where applicable, cert number when printed, and the verbatim sold-listing or result URL). NEVER name an aggregator index (PriceCharting, CardTrack, PSA value estimates, Sports Card Investor, pokeprices) anywhere in a verified filing's source or description — any filing that mentions one is classified as aggregator context and the sale is lost as a comp. If a sale is visible only through an aggregator's table and the underlying marketplace sale cannot be identified, file it as aggregator-labelled context instead (source: Aggregator value with the index named), never as a verified comp. ORDER WITHIN A CARD: file a card's updates oldest sale first — the LAST update filed for a card sets its checked price, so a card's batch ends with its most recent REPRESENTATIVE clean verified sale. File any aggregator context for a card BEFORE its verified sales. A flagged single-print outlier (far outside the card's own cluster — see the Diamond and Pearl rule below) is filed in date order with the flag in its description, EXCEPT when it is the newest sale: then file it just before the most recent representative clean sale and say so in your saveRefreshFindings summary, so the official value rests on the cluster, never on one print. Every card is in the normal rotation (the owner-kept lock system was REMOVED Oct 14, 2026 at the owner's instruction — values are fully automated, regardless of where they land): verified sales are filed as sold comps and DO move official values under the policy below. The forecast engine grades and issues automatically inside refreshPrices from the evidence on file — your depth filings are what it eats; you take no forecast action yourself. OFFICIAL VALUE POLICY (Oct 10, 2026): the portfolio's official number is COMP-BASED — for every card, with NO exceptions (the owner-kept lock system was removed Oct 14, 2026), the checked price you report via saveRefreshFindings BECOMES that card's official value and moves the headline total, so report the price the verified comps actually support (eBay sold primary, Fanatics Collect co-primary for auctions/high-end; aggregator values labelled cross-check/context only and never a sole source where sold comps exist). There are NO locked or owner-kept values anymore — every card revalues from its verified comps, even when the comp-based value lands far from an old kept figure; never soften, floor or blend a value toward an old kept figure. Cards unlocked from former kept values float to their own printing's verified comps, which BECOME their official values; never use a different printing of the same character as a comp. ALSO re-check the acquisition watchlist: Japanese Mega Venusaur ex SAR PSA 10 and Mega Lucario ex SAR PSA 10 vs their English SIR raw prices, Japanese 151 Art Rare trio PSA 10 (Bulbasaur 166, Charmander 168, Squirtle 170), English 151 second-tier IRs (Bulbasaur 166, Squirtle 170, Alakazam ex SIR, Erikas Invitation SIR - Mar 2026 prices are stale), SWSH sealed box prices and sales volume (Lost Origin, Brilliant Stars, Silver Tempest), Yu Nagaba Eeveelution PSA 9 singles, 30th Anniversary sealed secondary prices vs MSRP, and the do-not-buy list (Giratina V Alt Art PSA 10, Prismatic Umbreon ex SIR, 151 Charizard ex SIR) to confirm they are still at the top. ALSO re-check the mid-era / vintage themes: LV.X PSA 9 prices (esp. Porygon-Z and Japanese Glaceon LV.X) after PSA 10 Fanatics sales, Southern Islands PSA 8/9 vs PSA 10, Crystal category momentum and non-Charizard Crystal / Aquapolis / Skyridge holo mid grades, HGSS non-Gengar Primes, LEGEND pairs and Call of Legends SL shinies raw NM, EX-era stamped reverse holos, XY secret rares, and Cosmic Eclipse / Team Up lagging singles vs sealed box prices. For Diamond and Pearl era, only trust multiple confirmed PAID sales - flag any single-print spike (e.g. Cresselia +15900 percent) as suspected manipulation, never as a price. ALSO re-check the SILVER-BORDER WORLD CHAMPIONSHIP (WC) group: TCGplayer-tracked WC deck raw values and eBay sold for each WC target on the watchlist, against its recorded max-buy. Targets are RAW near-mint grading candidates ONLY - never recommend a graded PSA 10 WC card (already top of market). Treat any single anomalous PSA 10 print as an anomaly, never as a comp. WC is a thin market that was bulk for two decades: buy signals require multiple confirmed paid sales, top species only, and verification of silver border + signature + WC back. ALSO run the JAPANESE VENDING SERIES hunt (Eevee scout, Yahoo Japan / Mercari / eBay JP sellers): unpeeled Series 1-3 sheets and clean glossy singles (Ooyamas Pikachu Series 3, Snorlax Series 1, starters / Eevee / Porygon singles). On the FIRST refresh, establish real comps from confirmed Japanese sales for each vending target and update its priceContext with the comp, source marketplace and date, labelled Japanese-source comp; only after comps exist may a max-buy be proposed. Until then keep price research on first refresh - NEVER invent a vending price or max-buy, never price vending cards off US asks, and always note condition (peel / curl / gloss wear) because it drives value in this thin niche. Update watchlist priceContext and lastChecked via the dashboard data when sourced. Call saveRefreshFindings with sourced prices, dates and sources. Never invent a price. PRICE POINTS (Oct 14, 2026): whenever a re-check gives a watchlist item ONE defensible current reference figure (verified sold comp preferred, labelled ask otherwise), ALSO call saveWatchPricePoint for that item with the figure and its source type, so its dated price-point history accrues. SOURCE RULES (mandatory): label every figure with its source type - verified sold comp (eBay sold primary, Fanatics Collect co-primary), aggregator value (PriceCharting, PSA estimates, CardTrack), active listing/ask (Collektr, CardCodex, eBay listing pages ebay.com/ebay.de), cert verification (PSA cert pages - never a price), or seller-reported/unverified. pokeprices.io is USE WITH CAUTION: it produced a dubious $2500 PSA 10 sale and unlabeled Mewtwo sales that the owner EXCLUDED - never use it unlabeled or as a sole comp source. pokeinvesting.com is values/population ONLY (it lists no individual sales) - never cite it as a comp. Collektr and CardCodex are asks only, never sold prices. COLLEKTR SCRAP (Oct 14, 2026 — owner order): Collectr is PROHIBITED as a source for eBay ended/sold listings in any capacity — never use it, cite it, or relay its data for ended/sold listings; direct eBay sold search (the signed-in session) is the ONLY eBay ended source, and Fanatics Collect is co-primary for auctions. Aggregator or single-source prints NEVER override verified sold comps. SCOUT DUTY: also sweep live listings for watchlist targets (eBay graded slabs, TCGplayer raw, Yahoo Japan/Mercari/eBay JP Japanese listings, sealed at MSRP). TERMINAL CENSUS: for every live listing you open for a tracked card (owned or watchlist) at ANY price — at, under or over market — call saveMarketListing with its subjectKey (owned-<cert> / watch-<id> from getPortfolio's terminal data), verbatim listing URL, asking price, market value, marketplace, seller and ships-from when shown; the Market Terminal must show the full listing census priced as % of market, not only under-market finds. Save each under-market candidate (at least 15 percent under verified comp, or 8-15 percent for Tier 2) via saveScoutFind with marketplace, seller if shown, asking price, verified comp, date and scoutId. HARD LINK RULE: a find only PINS to the deal feed when saveScoutFind receives the real, reachable listing URL copied verbatim from the listing page - never construct, shorten or guess a listing URL. POSTING RULE (Oct 13, 2026): the server re-checks the listing at save time — if its checker cannot positively verify the listing live (bot-blocked), saveScoutFind returns pinned=false and the find is filed as Stale — unverified in the Ledger, NOT pinned and NOT a posted deal; never report such a find (or a refused/Gone save) as a pinned or posted find. A candidate with no reachable listing URL must be saved with listingUrl omitted and linkState sighting - it stays an unverified sighting below the pinned deals and never counts as a pinned deal. LIVENESS RULE (mandatory): NEVER save an ended, sold, or out-of-stock listing as a find — open the listing page and confirm it is currently live and for sale before saving a FIND; the server re-checks the page at save time and again on every 2-hourly sweep, and files positively-ended listings as Gone/Expired, never live. Market Terminal census listings (saveMarketListing) follow the looser Terminal bar: they post even when the server's own re-check is bot-blocked, labelled unverified, and leave only on positive ended evidence. PASSED ITEMS RULE (mandatory): The owner passes on suggestions by marking them Passed/hidden in the data - NEVER re-suggest, re-add, re-price or resurrect any watchlist item or deal find whose record is Passed/passed, and never suggest a new item that is the same card/theme as a passed one. Passed records are kept precisely so you skip them; they render nowhere on the page. PICCLICK RULE (mandatory): PicClick is NOT SERVED — every PicClick link was broken and it was removed Oct 9, 2026. NEVER save, pin, cite, or follow any URL on a picclick domain (picclick.com, picclick.co.uk, picclick.* any TLD); discard PicClick candidates at capture and use the direct marketplace listing (eBay, TCGplayer, Mercari, Yahoo Japan, Fanatics Collect) instead, or skip the candidate. OWNER-REPORTED ENDED RULE (mandatory): listings the owner has reported ended are filed Gone/Expired in the data and the server refuses their URLs — NEVER re-save, re-pin or resurrect those listings. OWNER BLANKET RULE (mandatory): if the owner reports that all scout listings on file have ended, every finding/listing stored before that report is filed Gone/Expired with an owner-reported reason and is terminal the same way; NEVER re-save, re-pin or resurrect any of them. Only a listing genuinely first found after such a report may be posted to the Terminal, and only one with fresh positive live proof may be PINNED as a deal.";
      // Dispatch with the CORRECT agent API: spawnTask(message string,
      // { expectsAction, dedupeKey }). The previous code called
      // agent.send({ title, prompt }) — a shape the SDK does not accept —
      // and swallowed the failure in a bare catch, so the research task
      // never ran while the log claimed a refresh was queued. The
      // dispatch outcome is now appended to the summary and stored in
      // the refresh log, so a failed dispatch reads as failed.
      // FULL SWEEP (owner order, Oct 13, 2026 — one-time hard push):
      // when fullSweep is set, an override brief is prepended that
      // supersedes THE SLICE paragraph for THIS RUN ONLY (all 45
      // active cards, depth protocol unchanged, locks untouched, the
      // five named CGC cards as priority targets); the daily rotation
      // resumes unchanged on the next ordinary run.
      const fullSweepPrefix = "FULL SWEEP OVERRIDE (owner order, Oct 13, 2026 — THIS RUN ONLY): the paragraph below headed THE SLICE is superseded for this run, including its line 'Do NOT attempt all owned cards in one run'. This run works ALL active owned cards under the same DEPTH PROTOCOL (every distinct verified sold comp in the trailing 180 days, primary-venue-only labels, strikethrough rule, no single-print revalues, order-within-a-card filing rule). PRIORITY TARGETS FIRST — fetch fresh data on the still-unpriced cards before the rest — for each: fresh verified sold comps, checked value confirmed or updated from those comps, pop/info refreshed where sourceable. Then rotate through every remaining active card until each one has either a fresh check or an explicit no-new-comp outcome stated in your saveRefreshFindings summary. No card is locked (the owner-kept locks were removed Oct 14, 2026): every card revalues from verified comps. Pop data refreshes where sources support it; forecasts re-issue/grade through the engine as usual. The rotating slice resumes unchanged after this run. ——— THE STANDARD BRIEF FOLLOWS (its depth, filing, source and scout rules all still apply; only its slice breadth is overridden above): ";
      const effectivePrompt = args.fullSweep ? fullSweepPrefix + refreshPrompt : refreshPrompt;
      if (args.fullSweep) summary = "FULL SWEEP (owner-ordered one-time hard push, Oct 13, 2026 — all 45 active cards, five priority CGC cards first; daily rotation unchanged afterwards). " + summary;
      try {
        const res = await ctx.agent.spawnTask(effectivePrompt, { expectsAction: "saveRefreshFindings", dedupeKey: `${args.fullSweep ? "full-sweep" : "daily-refresh"}-${new Date().toISOString().slice(0, 10)}` });
        summary += res.ok ? ` Research task dispatched (task ${res.taskId.slice(0, 8)}…) — findings land via saveRefreshFindings when it completes.` : ` Research dispatch FAILED: ${res.error} — prices were NOT re-checked by this run; treat values as unchanged, not refreshed.`;
      } catch (e) {
        summary += ` Research dispatch FAILED: ${e instanceof Error ? e.message.slice(0, 140) : "unknown error"} — prices were NOT re-checked by this run; treat values as unchanged, not refreshed.`;
      }
      await db.insert(schema.refreshLogs).values({ summary, cardsChecked: args.fullSweep ? 45 : 8 });
      ctx.invalidateQueries();
      return { ok: true as const, summary };
    },
  }),

  // Watchlist price points (Oct 14, 2026): record the Oct 8, 2026 seed
  // figure and any later re-check figure already stated in an item's
  // record, as dated points. Idempotent; conservative extraction only.
  recordWatchPricePoints: defineAction({
    request: z.object({}),
    response: z.object({ ok: z.literal(true), seeded: z.number(), recorded: z.number() }),
    async handler(ctx): Promise<{ ok: true; seeded: number; recorded: number }> {
      const r = await recordWatchPricePointsImpl(ctx);
      ctx.invalidateQueries();
      return { ok: true as const, seeded: r.seeded, recorded: r.recorded };
    },
  }),

  // One dated reference-price point for one watchlist item, filed by the
  // re-price research task (and by refreshes going forward). One point
  // per item per day — a same-day re-file replaces it. Passed items are
  // never re-priced (owner rule).
  saveWatchPricePoint: defineAction({
    request: z.object({ watchId: z.number(), priceUsd: z.number(), sourceType: z.string() }),
    response: z.object({ ok: z.literal(true), recordedOn: z.string() }),
    async handler(ctx, args): Promise<{ ok: true; recordedOn: string }> {
      const db = ctx.db<typeof schema>();
      const today = new Date().toISOString().slice(0, 10);
      const rows = await db.select().from(schema.watchlist);
      const item = (rows as any[]).find(w => w.id === args.watchId);
      if (item && !isHiddenWatchStatus(item.status) && args.priceUsd > 0) {
        const existing = await db.select().from(schema.watchPricePoints);
        const dupe = (existing as any[]).find(p => p.watchId === args.watchId && p.recordedOn === today);
        if (dupe) await db.update(schema.watchPricePoints).set({ priceUsd: args.priceUsd, sourceType: args.sourceType }).where(eq(schema.watchPricePoints.id, dupe.id));
        else await db.insert(schema.watchPricePoints).values({ watchId: args.watchId, priceUsd: args.priceUsd, sourceType: args.sourceType, recordedOn: today });
        await db.update(schema.watchlist).set({ lastChecked: today }).where(eq(schema.watchlist.id, args.watchId));
        ctx.invalidateQueries();
      }
      return { ok: true as const, recordedOn: today };
    },
  }),

  // Owner-ordered watchlist re-price (Oct 14, 2026): first record the
  // points already on file (seed + recorded re-checks), then dispatch a
  // research task to file a FRESH reference point for every active
  // watchlist item — verified sold comps preferred, labelled asks
  // otherwise — so every item gains its second recorded point.
  repriceWatchlist: defineAction({
    request: z.object({}),
    response: z.object({ ok: z.literal(true), seeded: z.number(), recorded: z.number(), dispatched: z.boolean() }),
    async handler(ctx): Promise<{ ok: true; seeded: number; recorded: number; dispatched: boolean }> {
      const db = ctx.db<typeof schema>();
      const r = await recordWatchPricePointsImpl(ctx);
      const items = await db.select().from(schema.watchlist);
      const activeItems = (items as any[]).filter(w => !isHiddenWatchStatus(w.status));
      const list = activeItems.map(w => `${w.id} — ${w.name}`).join("; ");
      const brief = `Re-price every active watchlist item on this Pokemon graded-card dashboard. For EACH item below, find ONE defensible current reference figure: prefer a representative price from verified sold comps (eBay sold, Fanatics Collect, or a major auction house — a clean displayed price means it sold at that price; a struck-through price means a hidden best offer was accepted, so never use it as the figure); where no verified sold reference exists, use a current asking price and label it as an ask in the source type. Call saveWatchPricePoint({ watchId, priceUsd, sourceType }) exactly once per item, with sourceType naming the basis (for example "Verified sold comp — eBay sold", "TCGplayer-tracked market", "Ask — eBay listing"). If no defensible figure exists for an item, skip it — never invent a price. If the eBay session is signed out or sold prices are not rendering, say so in the item's source type label (fallback evidence labelled as such) — never silently downgrade. Do not edit the items' narrative text; price points only. Items: ${list}`;
      let dispatched = false;
      try {
        const res = await ctx.agent.spawnTask(brief, { expectsAction: "saveWatchPricePoint", dedupeKey: `watch-reprice-${new Date().toISOString().slice(0, 10)}` });
        dispatched = !!res.ok;
      } catch { dispatched = false; }
      ctx.invalidateQueries();
      return { ok: true as const, seeded: r.seeded, recorded: r.recorded, dispatched };
    },
  }),

  // Scout finds. POSTING is decided by the link AND the capture-time
  // liveness verdict (Oct 13, 2026): a find with a real listing URL that
  // the checker positively verifies live posts as a live deal (Tier 1 =
  // pinned); a linked find the checker cannot verify (inconclusive /
  // bot-blocked) is filed as Stale — unverified in the Ledger and never
  // announced or counted as pinned; without a URL it is stored as a
  // sighting and never counts as a pinned deal.
  saveScoutFind: defineAction({
    request: z.object({
      cardName: z.string(), gradeLabel: z.string().default(""),
      askingUsd: z.number(), marketUsd: z.number().nullable().default(null), discountPct: z.number().nullable().default(null),
      marketplace: z.string(), seller: z.string().nullable().default(null),
      listingUrl: z.string().url().nullable().default(null),
      scoutId: z.string(), note: z.string().default(""),
      foundAt: z.string().optional(), checkedDate: z.string().optional(),
      underMaxBuy: z.boolean().default(false),
      subjectKey: z.string().optional(), shipsFrom: z.string().nullable().default(null),
      // Known auction/listing end (ISO datetime) when the listing page
      // shows one — a past end time expires the row automatically.
      endsAt: z.string().nullable().default(null),
    }),
    response: z.object({ ok: z.literal(true), pinned: z.boolean(), tier: z.number(), id: z.number() }),
    async handler(ctx, args): Promise<{ ok: true; pinned: boolean; tier: number; id: number }> {
      // PICCLICK EXCLUSION (Oct 9, 2026): a PicClick candidate is
      // discarded at capture — never stored, never pinned, no
      // replacement link fabricated. Same for a find whose marketplace
      // is PicClick even if the URL was rewritten.
      if (isPicClickUrl(args.listingUrl) || args.marketplace.toLowerCase().includes("picclick")) return { ok: true as const, pinned: false, tier: 0, id: 0 };
      const db = ctx.db<typeof schema>();
      await ensureScouts(ctx);
      await ensurePicClickPurge(ctx);
      await ensureOwnerReportedEnded(ctx);
      await ensureOwnerReportedAllEnded(ctx);
      // Never resurrect a passed suggestion: if the owner already passed on this
      // card (a passed deal with the same name, or a Passed watchlist item
      // whose core name matches), store nothing visible and report not pinned.
      const existingDeals = await db.select().from(schema.dealFeed);
      const passedDeal = (existingDeals as any[]).find(d => d.passed === 1 && d.cardName.trim().toLowerCase() === args.cardName.trim().toLowerCase());
      if (passedDeal) return { ok: true as const, pinned: false, tier: 0, id: passedDeal.id };
      const watchRowsAll = await db.select().from(schema.watchlist);
      const core = passedCoreName(args.cardName);
      const passedWatch = (watchRowsAll as any[]).find(w => isPassedStatus(w.status) && core.length >= 4 && (passedCoreName(w.name).includes(core) || core.includes(passedCoreName(w.name))));
      if (passedWatch) return { ok: true as const, pinned: false, tier: 0, id: 0 };
      const today = new Date().toISOString().slice(0, 10);
      const rawUrl = args.listingUrl && /^https?:\/\//i.test(args.listingUrl) ? args.listingUrl : null;
      const listingRows0 = await db.select().from(schema.marketListings);
      if (rawUrl) {
        const key = canonicalListingKey(rawUrl);
        // PASSED BY URL, BOTH STORES (Oct 12, 2026): the owner may have
        // passed this exact listing as a deal OR as a Terminal listing
        // — either way it never comes back. Matching is by canonical
        // key: the same listing re-saved under a re-parameterized URL
        // (different eBay tracking params / regional host) is the same
        // listing he dismissed. The old checks matched names and exact
        // URL strings only, so variant URLs inserted brand-new visible
        // rows — the same cards kept popping up.
        const passedByUrl: any = (existingDeals as any[]).find(d => d.passed === 1 && d.listingUrl && canonicalListingKey(d.listingUrl as string) === key)
          ?? (listingRows0 as any[]).find(l => l.passed === 1 && l.listingUrl && canonicalListingKey(l.listingUrl as string) === key);
        if (passedByUrl) return { ok: true as const, pinned: false, tier: 0, id: 0 };
        // OWNER-REPORTED ENDED (Oct 9, 2026): a URL the owner reported
        // ended is terminal — never re-pinned, never resurrected, even
        // when a search cross-check still surfaces the ended listing.
        // Canonical-key matching (Oct 12, 2026): variant URLs of the
        // same ended listing are refused too.
        const ownerGoneDeal: any = (existingDeals as any[]).find(d => d.listingUrl && canonicalListingKey(d.listingUrl as string) === key && isOwnerReportedEnded(d));
        if (ownerGoneDeal) return { ok: true as const, pinned: false, tier: 0, id: ownerGoneDeal.id as number };
        const ownerGoneListing: any = (listingRows0 as any[]).find(l => l.listingUrl && canonicalListingKey(l.listingUrl as string) === key && isOwnerReportedEnded(l));
        if (ownerGoneListing) return { ok: true as const, pinned: false, tier: 0, id: 0 };
      }
      // PASSED BY SUBJECT (Oct 12, 2026): a passed deal find carries
      // its subjectKey — a later find for the same subject is the same
      // suggestion the owner dismissed, whatever name/URL variant it
      // arrives under.
      if (args.subjectKey) {
        const passedBySubject: any = (existingDeals as any[]).find(d => d.passed === 1 && d.subjectKey && (d.subjectKey as string) === args.subjectKey);
        if (passedBySubject) return { ok: true as const, pinned: false, tier: 0, id: passedBySubject.id as number };
      }
      // LIVENESS GATE (capture time): a find is verified BEFORE it is
      // first posted. If the listing page already reads ended / sold /
      // 404 / redirected, it is stored directly as Gone with the reason
      // — never pinned, never shown as live anywhere. freshEvidence is
      // FALSE here on purpose: the caller's say-so is not evidence. When
      // the direct page fetch is inconclusive (bot block / 5xx / network)
      // the verdict is UNKNOWN — the find is posted on the saving
      // agent's own fresh open of the page, and only POSITIVE ended
      // evidence (404, ended/sold page text, redirect away) files it
      // as Gone. A blocked check never unpins or blocks a find.
      // TIGHTENED: the verified-live stamp is set ONLY on a positive
      // live verdict — an UNKNOWN capture posts WITHOUT a stamp, so its
      // staleness clock runs from first-found and the sweep state
      // machine (miss streak -> stale -> retired) applies from day one.
      let liveness: LivenessResult | null = null;
      if (rawUrl) liveness = await verifyListingLive(ctx, rawUrl, { freshEvidence: false });
      if (rawUrl && liveness && liveness.state === "ended") {
        const existingDupe: any = (existingDeals as any[]).find(d => d.listingUrl && canonicalListingKey(d.listingUrl as string) === canonicalListingKey(rawUrl));
        if (existingDupe && existingDupe.passed === 1) return { ok: true as const, pinned: false, tier: 0, id: existingDupe.id as number };
        if (existingDupe) {
          await db.update(schema.dealFeed).set({ status: "gone", endedAt: today, endedReason: liveness.reason, lastCheckAt: liveness.checkedAt, verifyMissStreak: 0 }).where(eq(schema.dealFeed.id, existingDupe.id));
          ctx.invalidateQueries();
          return { ok: true as const, pinned: false, tier: 0, id: existingDupe.id as number };
        }
        const insertedGone: any = await db.insert(schema.dealFeed).values({
          cardName: args.cardName, gradeLabel: args.gradeLabel, askingUsd: args.askingUsd, marketUsd: args.marketUsd, discountPct: args.discountPct,
          marketplace: args.marketplace, seller: args.seller, listingUrl: rawUrl,
          foundAt: args.foundAt ?? today, scoutId: args.scoutId, checkedDate: args.checkedDate ?? today,
          note: `NOT POSTED AS LIVE — liveness check at capture failed: ${liveness.reason}. Recorded directly as Gone/Expired so an ended listing is never presented as a deal.`,
          isExample: 0, tier: 0, status: "gone", firstFoundAt: args.foundAt ?? today, lastSeenAt: today, prevAskingUsd: null, subjectKey: args.subjectKey ?? null, targetGroup: targetGroupFor(args.cardName, args.subjectKey ?? null, null), endedAt: today, endedReason: liveness.reason,
        }).returning({ id: schema.dealFeed.id });
        ctx.invalidateQueries();
        return { ok: true as const, pinned: false, tier: 0, id: insertedGone[0]?.id ?? 0 };
      }
      const url = rawUrl;
      const discount = args.discountPct ?? (args.marketUsd != null && args.marketUsd > 0 ? Math.round(((args.marketUsd - args.askingUsd) / args.marketUsd) * 1000) / 10 : null);
      // Scout setup (Oct 14, 2026 — spec R.3): an inactive scout
      // files nothing, and a listing above the scout's ceiling is kept
      // out of the deal feed entirely (the Terminal census still takes
      // it — ceilings govern deals, not the census).
      const scoutCfg = (await scoutConfigMap(ctx)).get(args.scoutId) ?? defaultScoutConfig(args.scoutId);
      if (!scoutCfg.isActive) {
        return { ok: true as const, pinned: false, tier: 0, id: 0 };
      }
      if (scoutCfg.ceilingUsd != null && args.askingUsd > scoutCfg.ceilingUsd) {
        return { ok: true as const, pinned: false, tier: 0, id: 0 };
      }
      const tier = tierFor(discount, url != null, args.underMaxBuy, scoutCfg.tier1DiscountPct ?? 15);
      // PINNED MEANS POSTED AS PINNED (Oct 13, 2026): a Tier 1 price
      // alone does not pin — the page renders a deal as a live pinned
      // deal only with a POSITIVE verified-live stamp. When the
      // capture check is inconclusive (bot-blocked — the common case),
      // the find is filed as Stale — unverified and NOT pinned, and
      // this action must say so: the old tier-only `pinned` made the
      // saving agent (and the scout's "Found one" status line) claim
      // a pinned deal the page never posted.
      const verifiedLive = !!(url && liveness?.state === "live");
      const pinned = tier === 1 && verifiedLive;
      const targetGroup = targetGroupFor(args.cardName, args.subjectKey ?? null, null);
      // LEDGER DEDUPE: same listing = same finding (canonical key —
      // a re-parameterized URL variant is the same listing, not a new
      // find). Update last-seen + price (price_dropped when lower)
      // instead of duplicating. A PASSED row is never the dupe target:
      // the old `passed !== 1` filter made a re-save of a passed URL
      // fall through and INSERT a fresh visible row — the same card
      // popped back up (Oct 12, 2026). Passed rows short-circuit here.
      if (url) {
        const dupeDeal: any = (existingDeals as any[]).find(d => d.listingUrl && canonicalListingKey(d.listingUrl as string) === canonicalListingKey(url));
        if (dupeDeal && dupeDeal.passed === 1) return { ok: true as const, pinned: false, tier: 0, id: dupeDeal.id as number };
        if (dupeDeal) {
          const dropped = args.askingUsd < (dupeDeal.askingUsd as number);
          const provenLive = liveness?.state === "live";
          await db.update(schema.dealFeed).set({
            askingUsd: args.askingUsd, marketUsd: args.marketUsd ?? dupeDeal.marketUsd, discountPct: discount, tier,
            prevAskingUsd: dropped ? dupeDeal.askingUsd : (dupeDeal.prevAskingUsd ?? null),
            lastSeenAt: today, checkedDate: today, endedAt: null, endedReason: null,
            // Stamp + streak reset ONLY on positive proof; an
            // inconclusive re-save keeps the existing stamp and streak.
            ...(provenLive ? { lastVerifiedLiveAt: liveness!.checkedAt, verifyMissStreak: 0 } : {}),
            ...(liveness ? { lastCheckAt: liveness.checkedAt } : {}),
            endsAt: args.endsAt ?? liveness?.endsAt ?? dupeDeal.endsAt ?? null,
            status: (dupeDeal.status === "bought") ? dupeDeal.status
              : provenLive ? (dropped ? "price_dropped" : "live")
              : (dupeDeal.status === "gone") ? dupeDeal.status
              : dropped ? "price_dropped"
              : dupeDeal.status,
            targetGroup: (dupeDeal.targetGroup as string) || targetGroup, subjectKey: args.subjectKey ?? dupeDeal.subjectKey ?? null,
          }).where(eq(schema.dealFeed.id, dupeDeal.id));
          // A re-save that positively verifies a Tier 1 find is the
          // moment it actually posts as pinned — announce it on the
          // scout (the read-derived line also reflects it, this keeps
          // the stored line consistent for other readers).
          if (pinned) {
            const scoutRowsD = await db.select().from(schema.scoutStatus);
            const scoutD = (scoutRowsD as any[]).find(s => s.scoutId === args.scoutId);
            if (scoutD) await db.update(schema.scoutStatus).set({ statusLine: `Found one: ${args.cardName}${args.gradeLabel ? " " + args.gradeLabel : ""} at ${args.marketplace} for $${args.askingUsd.toLocaleString("en-US")}${discount != null ? ` — ${discount.toFixed(0)}% under comp` : ""}. Listing linked in the deal feed.`, lastChecked: today }).where(eq(schema.scoutStatus.id, scoutD.id));
          }
          ctx.invalidateQueries();
          return { ok: true as const, pinned, tier, id: dupeDeal.id as number };
        }
      }
      const inserted: any = await db.insert(schema.dealFeed).values({
        cardName: args.cardName, gradeLabel: args.gradeLabel, askingUsd: args.askingUsd, marketUsd: args.marketUsd, discountPct: discount,
        marketplace: args.marketplace, seller: args.seller, listingUrl: url,
        foundAt: args.foundAt ?? today, scoutId: args.scoutId, checkedDate: args.checkedDate ?? today,
        note: url ? (verifiedLive ? args.note : (args.note ? args.note + " " : "") + "Filed as Stale — unverified: the capture-time liveness check could not positively verify this listing live (bot-blocked / inconclusive), so it is NOT pinned as a deal; it posts to the Ledger's Stale tab and is promoted to a live deal only when a sweep positively verifies it.")
          : (args.note ? args.note + " " : "") + "Sighting — no reachable listing URL captured, so this is link-unverified and not a pinned deal.",
        // Stored status matches how the page will render it: an
        // unverified linked find IS stale from the moment it is filed
        // (the read mapping has always reported it that way — storing
        // "new" here was the other half of the announcement gap).
        isExample: 0, tier, status: url ? (verifiedLive ? "new" : "stale") : "sighting", firstFoundAt: args.foundAt ?? today, lastSeenAt: today, prevAskingUsd: null, subjectKey: args.subjectKey ?? null, targetGroup,
        lastVerifiedLiveAt: url && liveness?.state === "live" ? liveness.checkedAt : null,
        lastCheckAt: url ? (liveness?.checkedAt ?? null) : null, verifyMissStreak: 0,
        endsAt: args.endsAt ?? liveness?.endsAt ?? null,
      }).returning({ id: schema.dealFeed.id });
      // Cross-populate the Market Terminal: a linked find is also a live
      // listing for its subject (matched by subjectKey when the sweep
      // provides one, otherwise by card name).
      if (url && args.subjectKey) {
        const existingListings = await db.select().from(schema.marketListings);
        const dupeL: any = (existingListings as any[]).find(l => l.listingUrl && canonicalListingKey(l.listingUrl as string) === canonicalListingKey(url));
        if (dupeL && dupeL.passed === 1) {
          // the owner passed this listing in the Terminal — never refresh
          // or resurrect its census row from a deal save (Oct 12, 2026).
        } else if (dupeL) {
          const droppedL = args.askingUsd < (dupeL.askingUsd as number);
          const provenLiveL = liveness?.state === "live";
          await db.update(schema.marketListings).set({ askingUsd: args.askingUsd, marketUsd: args.marketUsd ?? dupeL.marketUsd, lastSweptAt: new Date().toISOString(), endedAt: null, endedReason: null, prevAskingUsd: droppedL ? dupeL.askingUsd : (dupeL.prevAskingUsd ?? null), ...(provenLiveL ? { lastVerifiedLiveAt: liveness!.checkedAt, verifyMissStreak: 0 } : {}), ...(liveness ? { lastCheckAt: liveness.checkedAt } : {}), endsAt: args.endsAt ?? liveness?.endsAt ?? dupeL.endsAt ?? null, status: droppedL ? "price_dropped" : provenLiveL ? "live" : dupeL.status }).where(eq(schema.marketListings.id, dupeL.id));
        } else {
          await db.insert(schema.marketListings).values({ subjectKey: args.subjectKey, subjectName: args.cardName, gradeLabel: args.gradeLabel, askingUsd: args.askingUsd, marketUsd: args.marketUsd, marketplace: args.marketplace, seller: args.seller, shipsFrom: args.shipsFrom, listingUrl: url, foundAt: args.foundAt ?? today, lastSweptAt: new Date().toISOString(), scoutId: args.scoutId, status: "live", firstFoundAt: args.foundAt ?? today, lastVerifiedLiveAt: liveness?.state === "live" ? liveness.checkedAt : null, lastCheckAt: liveness?.checkedAt ?? null, verifyMissStreak: 0, endsAt: args.endsAt ?? liveness?.endsAt ?? null });
        }
      }
      const scoutRows = await db.select().from(schema.scoutStatus);
      const scout = (scoutRows as any[]).find(s => s.scoutId === args.scoutId);
      if (scout) {
        await db.update(schema.scoutStatus).set({
          findsCount: (scout.findsCount ?? 0) + 1, lastChecked: today,
          // The stored announcement must match what actually posted:
          // pinned → "Found one"; a linked but unverified find → the
          // Stale filing, named as such; anything else keeps the
          // existing line. (getPortfolio also re-derives this line on
          // every read, so it can never go stale again.)
          statusLine: pinned ? `Found one: ${args.cardName}${args.gradeLabel ? " " + args.gradeLabel : ""} at ${args.marketplace} for $${args.askingUsd.toLocaleString("en-US")}${discount != null ? ` — ${discount.toFixed(0)}% under comp` : ""}. Listing linked in the deal feed.`
            : url && tier >= 1 ? `Unverified find on file: ${args.cardName} at ${args.marketplace} for $${args.askingUsd.toLocaleString("en-US")} — filed as Stale in the Findings Ledger because the listing checker could not positively verify it live, so it is NOT pinned as a deal. Still watching.`
            : scout.statusLine,
        }).where(eq(schema.scoutStatus.id, scout.id));
      }
      ctx.invalidateQueries();
      return { ok: true as const, pinned, tier, id: inserted[0]?.id ?? 0 };
    },
  }),

  updateWatchlistItem: defineAction({
    request: z.object({ id: z.number(), status: z.string().optional(), priceContext: z.string().optional(), maxBuyUsd: z.number().positive().nullable().optional(), setName: z.string().max(120).optional(), cardNumber: z.string().max(40).optional(), intent: z.string().max(40).optional(), gradeLabel: z.string().max(60).optional() }),
    response: z.object({ ok: z.literal(true), id: z.number() }),
    async handler(ctx, args): Promise<{ ok: true; id: number }> {
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.watchlist);
      const row = (rows as any[]).find((r: any) => r.id === args.id);
      if (row) {
        // Pass is persisted as "Passed" (hidden) — the row is kept so the
        // seed/refresh can never resurrect it, but getPortfolio filters it
        // out so it renders nowhere on the page.
        const patch: Record<string, unknown> = {};
        if (args.status != null) patch.status = isPassedStatus(args.status) ? "Passed" : args.status;
        let pc = args.priceContext !== undefined ? args.priceContext : ((row.priceContext as string) ?? "");
        if (args.maxBuyUsd !== undefined && args.maxBuyUsd != null) {
          patch.maxBuyUsd = args.maxBuyUsd;
          const mb = "MAX BUY $" + (Number.isInteger(args.maxBuyUsd) ? String(args.maxBuyUsd) : args.maxBuyUsd.toFixed(2));
          pc = /MAX BUY \$[\d,]+(?:\.\d+)?/i.test(pc) ? pc.replace(/MAX BUY \$[\d,]+(?:\.\d+)?/i, mb) : (pc ? pc.replace(/\.+\s*$/, "") + ". " + mb + "." : mb + ".");
        }
        if (args.priceContext !== undefined || args.maxBuyUsd !== undefined) patch.priceContext = pc;
        if (args.setName !== undefined) patch.setName = args.setName;
        if (args.cardNumber !== undefined) patch.cardNumber = args.cardNumber;
        if (args.intent !== undefined) patch.intent = args.intent;
        if (args.gradeLabel !== undefined) patch.gradeLabel = args.gradeLabel;
        patch.lastChecked = new Date().toISOString().slice(0, 10);
        await db.update(schema.watchlist).set(patch).where(eq(schema.watchlist.id, row.id));
        ctx.invalidateQueries();
      }
      return { ok: true as const, id: args.id };
    },
  }),

  // Owner adds a watchlist item (Oct 14, 2026 — spec Q.1): card name,
  // set, number, raw-or-graded intent + grade, max-buy. The item enters
  // price accrual from creation — a defensible current reference supplied
  // at add time is filed as its first dated point, source-labelled;
  // otherwise it starts in the explicit no-reference accruing state.
  // A reference is NEVER invented here.
  addWatchItem: defineAction({
    request: z.object({
      name: z.string().min(2).max(160),
      setName: z.string().max(120).optional(),
      cardNumber: z.string().max(40).optional(),
      intent: z.enum(["raw", "graded"]).optional(),
      gradeLabel: z.string().max(60).optional(),
      maxBuyUsd: z.number().positive().optional(),
      referenceUsd: z.number().positive().optional(),
      referenceSource: z.string().max(160).optional(),
      scoutId: z.string().max(40).optional(),
    }),
    response: z.object({ ok: z.literal(true), id: z.number(), accrued: z.boolean() }),
    async handler(ctx, args): Promise<{ ok: true; id: number; accrued: boolean }> {
      const db = ctx.db<typeof schema>();
      const today = new Date().toISOString().slice(0, 10);
      const rows = await db.select().from(schema.watchlist);
      const maxSort = (rows as any[]).reduce((m: number, r: any) => Math.max(m, (r.sortOrder as number) ?? 0), 0);
      const intent = args.intent ?? (args.gradeLabel ? "graded" : "raw");
      const gradeLabel = args.gradeLabel ?? (intent === "graded" ? "" : "Raw NM");
      const parts: string[] = [];
      if (args.setName) parts.push(args.setName + (args.cardNumber ? " #" + args.cardNumber : ""));
      parts.push(intent === "graded" ? ("Graded target" + (gradeLabel ? " \u2014 " + gradeLabel : "")) : "Raw NM target \u2014 grading candidate");
      if (args.maxBuyUsd) parts.push("MAX BUY $" + (Number.isInteger(args.maxBuyUsd) ? String(args.maxBuyUsd) : args.maxBuyUsd.toFixed(2)));
      if (args.referenceUsd) parts.push("Current reference $" + args.referenceUsd.toFixed(2) + (args.referenceSource ? " (" + args.referenceSource + ")" : "") + " \u2014 " + today);
      const priceContext = parts.join(". ") + ".";
      const [ins] = await db.insert(schema.watchlist).values({
        name: args.name, kind: "watch", priceContext,
        thesis: "Owner-added target \u2014 " + today + ".",
        actionRule: "Owner target \u2014 buy at or under max-buy only with verified comps.",
        lastChecked: args.referenceUsd ? today : null, status: "Watching",
        sortOrder: maxSort + 1, scoutId: args.scoutId ?? scoutForWatch(args.name),
        setName: args.setName ?? "", cardNumber: args.cardNumber ?? "",
        intent, gradeLabel, maxBuyUsd: args.maxBuyUsd ?? null,
      }).returning({ id: schema.watchlist.id });
      const newId = ((ins as any)?.id as number) ?? 0;
      if (newId && args.referenceUsd) {
        await db.insert(schema.watchPricePoints).values({ watchId: newId, priceUsd: args.referenceUsd, sourceType: args.referenceSource || "Owner-supplied reference at add", recordedOn: today });
      }
      ctx.invalidateQueries();
      return { ok: true as const, id: newId, accrued: !!args.referenceUsd };
    },
  }),

  // Owner removes a watchlist item (Oct 14, 2026 — spec Q.1): status
  // becomes Removed — hidden from every surface like a pass, and scouts
  // stop hunting the target (sweep subjects, Terminal census and
  // re-pricing all skip removed rows). Record + price history are kept;
  // nothing is hard-deleted.
  removeWatchItem: defineAction({
    request: z.object({ id: z.number() }),
    response: z.object({ ok: z.literal(true), id: z.number() }),
    async handler(ctx, args): Promise<{ ok: true; id: number }> {
      const db = ctx.db<typeof schema>();
      await db.update(schema.watchlist).set({ status: "Removed" }).where(eq(schema.watchlist.id, args.id));
      ctx.invalidateQueries();
      return { ok: true as const, id: args.id };
    },
  }),

  // Acquisitions add-a-card — REMOVED (owner, Oct 14, 2026). The
  // Acquisitions panel and its entry point on Collection are gone, and
  // this write path is disabled server-side: a removed feature keeps
  // no live write path. The handler refuses every call without
  // touching the cards table. Mark sold / traded-away
  // (markCardDisposition below) is a separate Sell-side feature and
  // stays fully live, as do the Previously Owned records.
  addCard: defineAction({
    request: z.object({
      name: z.string().min(2).max(160),
      setName: z.string().max(120).optional(),
      number: z.string().max(40).optional(),
      year: z.number().int().min(1995).max(2030).optional(),
      grader: z.enum(["PSA", "CGC", "BGS", "SGC"]).optional(),
      grade: z.string().min(1).max(20),
      cert: z.string().min(4).max(40),
      valueUsd: z.number().positive().optional(),
      costBasisUsd: z.number().min(0).optional(),
      costNote: z.string().max(300).optional(),
      costDate: z.string().max(10).optional(),
      era: z.string().max(40).optional(),
    }),
    response: z.object({ ok: z.boolean(), id: z.number().nullable(), error: z.string().nullable(), existingName: z.string().nullable() }),
    async handler(_ctx, _args): Promise<{ ok: boolean; id: number | null; error: string | null; existingName: string | null }> {
      return { ok: false, id: null, error: "Acquisitions has been removed — adding cards is no longer available.", existingName: null };
    },
  }),

  // Owner removes a card from the active collection (Oct 14, 2026 —
  // spec R.2): mark SOLD (price + date) or TRADED AWAY (note). NEVER a
  // hard delete — the card moves to Previously Owned with its terms,
  // totals exclude it from the moment it is marked (today's snapshot is
  // revalued), and history / P&L stay true.
  markCardDisposition: defineAction({
    request: z.object({ cert: z.string(), disposition: z.enum(["sold", "traded"]), salePriceUsd: z.number().min(0).optional(), date: z.string().max(10).optional(), note: z.string().max(300).optional() }),
    response: z.object({ ok: z.boolean(), error: z.string().nullable() }),
    async handler(ctx, args): Promise<{ ok: boolean; error: string | null }> {
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.cards);
      const card = (rows as any[]).find(r => (r.cert as string) === args.cert);
      if (!card) return { ok: false, error: "No card with cert " + args.cert + " was found." };
      if (card.status !== "active") return { ok: false, error: "That card is already in the previously-owned records." };
      const today = new Date().toISOString().slice(0, 10);
      const note = (args.note ?? "").trim();
      const patch: Record<string, unknown> = {
        status: args.disposition,
        soldPrice: args.disposition === "sold" ? (args.salePriceUsd ?? null) : null,
        soldDate: args.date ?? today,
      };
      if (note) patch.notes = ((card.notes as string) ? (card.notes as string) + " " : "") + (args.disposition === "sold" ? "Sold \u2014 " : "Traded away \u2014 ") + note;
      await db.update(schema.cards).set(patch).where(eq(schema.cards.cert, args.cert));
      await revalueTodaySnapshot(ctx);
      ctx.invalidateQueries();
      return { ok: true, error: null };
    },
  }),

  // Owner saves a scout's setup (Oct 14, 2026 — spec R.3): active on/off,
  // hunt focus (target-group keys; empty = all groups), per-scout
  // ceiling, Tier 1 discount threshold, marketplace scope. The 2-hour
  // sweep and the refresh read this; defaults equal today's behavior.
  // Existing five scouts only — this configures, it does not create.
  updateScoutConfig: defineAction({
    request: z.object({ scoutId: z.string(), isActive: z.boolean().optional(), focusGroups: z.array(z.string()).optional(), ceilingUsd: z.number().positive().nullable().optional(), tier1DiscountPct: z.number().min(1).max(60).nullable().optional(), marketplaces: z.string().max(200).optional() }),
    response: z.object({ ok: z.literal(true), scoutId: z.string() }),
    async handler(ctx, args): Promise<{ ok: true; scoutId: string }> {
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.scoutConfigs);
      const existing = (rows as any[]).find(r => r.scoutId === args.scoutId);
      const base = existing ? {
        isActive: (existing.isActive as number) !== 0,
        focusGroups: String(existing.focusGroups ?? "").split(",").map((s: string) => s.trim()).filter(Boolean),
        ceilingUsd: (existing.ceilingUsd as number | null) ?? null,
        tier1DiscountPct: (existing.tier1DiscountPct as number | null) ?? null,
        marketplaces: (existing.marketplaces as string) ?? "",
      } : { isActive: true, focusGroups: [] as string[], ceilingUsd: null as number | null, tier1DiscountPct: null as number | null, marketplaces: "" };
      const next = {
        isActive: args.isActive !== undefined ? (args.isActive ? 1 : 0) : (base.isActive ? 1 : 0),
        focusGroups: (args.focusGroups !== undefined ? args.focusGroups : base.focusGroups).join(","),
        ceilingUsd: args.ceilingUsd !== undefined ? args.ceilingUsd : base.ceilingUsd,
        tier1DiscountPct: args.tier1DiscountPct !== undefined ? args.tier1DiscountPct : base.tier1DiscountPct,
        marketplaces: args.marketplaces !== undefined ? args.marketplaces : base.marketplaces,
      };
      if (existing) await db.update(schema.scoutConfigs).set(next).where(eq(schema.scoutConfigs.id, existing.id));
      else await db.insert(schema.scoutConfigs).values({ scoutId: args.scoutId, ...next });
      ctx.invalidateQueries();
      return { ok: true as const, scoutId: args.scoutId };
    },
  }),

  passDeal: defineAction({
    request: z.object({ id: z.number() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      await db.update(schema.dealFeed).set({ passed: 1 }).where(eq(schema.dealFeed.id, args.id));
      // CROSS-STORE PASS (Oct 12, 2026): the same listing usually also
      // lives in market_listings (saveScoutFind cross-populates the
      // Terminal). Passing only the deal row left the twin visible —
      // once the passed deal stopped winning the ledger's URL dedupe,
      // the listing twin resurfaced in the Ledger, Trenches and the
      // Terminal: the "same cards popping up" the owner reported. Pass
      // every row for this listing (canonical key, so
      // tracking-parameter URL variants match too) and withhold its
      // deal alerts.
      const dealRows = await db.select().from(schema.dealFeed);
      const row: any = (dealRows as any[]).find(r => r.id === args.id);
      if (row?.listingUrl) {
        const key = canonicalListingKey(row.listingUrl as string);
        const listingRows = await db.select().from(schema.marketListings);
        for (const l of listingRows as any[]) {
          if (l.passed !== 1 && l.listingUrl && canonicalListingKey(l.listingUrl as string) === key) {
            await db.update(schema.marketListings).set({ passed: 1 }).where(eq(schema.marketListings.id, l.id));
          }
        }
        try {
          const alertRows = await db.select().from(schema.dealAlerts);
          for (const a of alertRows as any[]) {
            if (a.listingUrl && canonicalListingKey(a.listingUrl as string) === key && a.status !== "withheld_passed") {
              await db.update(schema.dealAlerts).set({ status: "withheld_passed" }).where(eq(schema.dealAlerts.id, a.id));
            }
          }
        } catch { /* alerts table present on all current DBs; best-effort */ }
      }
      ctx.invalidateQueries();
      return { ok: true as const };
    },
  }),

  // Findings Ledger lifecycle: the owner marks a finding Bought (moves to
  // 'Acquired via scouts') or Gone (link dead / ended — kept for record,
  // collapsed expired state, not actionable). Sweeps set new/live/
  // price_dropped automatically via the dedupe path.
  updateFindingStatus: defineAction({
    request: z.object({ id: z.number(), status: z.enum(["bought", "gone", "live"]) }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      const todayD = new Date().toISOString().slice(0, 10);
      const patch: any = { status: args.status, lastSeenAt: todayD };
      if (args.status === "live") { patch.lastVerifiedLiveAt = new Date().toISOString(); patch.verifyMissStreak = 0; patch.lastCheckAt = new Date().toISOString(); patch.endedAt = null; patch.endedReason = null; }
      // the owner's own gone-marking is TERMINAL (Oct 12, 2026): the
      // owner-reported reason prefix makes every capture path refuse
      // this URL forever. The previous "Marked gone / ended by the owner"
      // reason was not recognized as owner-reported, so a sweep could
      // revive the row on a live re-check and the card popped back up.
      if (args.status === "gone") { patch.endedAt = todayD; patch.endedReason = OWNER_MARKED_ENDED_REASON; }
      await db.update(schema.dealFeed).set(patch).where(eq(schema.dealFeed.id, args.id));
      if (args.status === "gone") {
        const rows = await db.select().from(schema.dealFeed);
        const row: any = (rows as any[]).find(r => r.id === args.id);
        if (row?.listingUrl) {
          const key = canonicalListingKey(row.listingUrl as string);
          const listings = await db.select().from(schema.marketListings);
          const match: any = (listings as any[]).find(l => l.listingUrl && canonicalListingKey(l.listingUrl as string) === key);
          if (match) await db.update(schema.marketListings).set({ status: "gone", endedAt: todayD, endedReason: OWNER_MARKED_ENDED_REASON }).where(eq(schema.marketListings.id, match.id));
        }
      }
      ctx.invalidateQueries();
      return { ok: true as const };
    },
  }),

  /* ——— Closed / Ended button (Oct 12, 2026 — the owner: "Should also
     have a btn for closed / ended and if clicked we won't see it
     again") ———
     the owner marks a finding Closed / Ended from the Ledger or Trenches.
     The row — and its twin in the other store, matched by canonical
     listing key — is filed Gone with the owner-reported reason,
     which makes it TERMINAL: saveScoutFind / saveMarketListing / the
     inline sweep refuse the URL forever (isOwnerReportedEnded),
     re-verification never touches Gone rows, and its deal alerts are
     withheld. The record stays in the ledger's Expired section; it
     never renders live again. Works for deal_feed findings AND
     market_listings-only findings alike — the old updateFindingStatus
     could only file deal rows, so Terminal-only listings had no
     ended control at all. A sighting (no URL) files just its own row. */
  markFindingEnded: defineAction({
    request: z.object({ source: z.enum(["deal", "listing"]), id: z.number() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      const todayD = new Date().toISOString().slice(0, 10);
      const nowIso = new Date().toISOString();
      const dealRows = await db.select().from(schema.dealFeed);
      const listingRows = await db.select().from(schema.marketListings);
      const srcDeal: any = args.source === "deal" ? (dealRows as any[]).find(r => r.id === args.id) : undefined;
      const srcListing: any = args.source === "listing" ? (listingRows as any[]).find(r => r.id === args.id) : undefined;
      const url = (srcDeal?.listingUrl ?? srcListing?.listingUrl ?? null) as string | null;
      const key = url ? canonicalListingKey(url) : "";
      const patch: any = { status: "gone", endedAt: todayD, endedReason: OWNER_MARKED_ENDED_REASON, lastCheckAt: nowIso, verifyMissStreak: 0 };
      if (srcDeal) await db.update(schema.dealFeed).set(patch).where(eq(schema.dealFeed.id, srcDeal.id));
      if (srcListing) await db.update(schema.marketListings).set(patch).where(eq(schema.marketListings.id, srcListing.id));
      if (key) {
        for (const d of dealRows as any[]) {
          if (d.id !== srcDeal?.id && d.listingUrl && canonicalListingKey(d.listingUrl as string) === key && d.status !== "gone" && d.status !== "bought") {
            await db.update(schema.dealFeed).set(patch).where(eq(schema.dealFeed.id, d.id));
          }
        }
        for (const l of listingRows as any[]) {
          if (l.id !== srcListing?.id && l.listingUrl && canonicalListingKey(l.listingUrl as string) === key && l.status !== "gone") {
            await db.update(schema.marketListings).set(patch).where(eq(schema.marketListings.id, l.id));
          }
        }
        try {
          const alertRows = await db.select().from(schema.dealAlerts);
          for (const a of alertRows as any[]) {
            if (a.listingUrl && canonicalListingKey(a.listingUrl as string) === key && a.status !== "withheld_ended") {
              await db.update(schema.dealAlerts).set({ status: "withheld_ended" }).where(eq(schema.dealAlerts.id, a.id));
            }
          }
        } catch { /* alerts table present on all current DBs; best-effort */ }
      }
      ctx.invalidateQueries();
      return { ok: true as const };
    },
  }),

  /* ——— Scout sweep (every ~2 hours, decoupled from daily refresh) ———
     FIXED Oct 8, 2026: the sweep now hunts INLINE (web search over a
     rotating slice of subjects, strict extraction, real listings/finds
     persisted before returning) instead of only logging a placeholder
     and firing a broken agent handoff. A background deep hunt is still
     dispatched afterwards with the correct spawnTask API; its dispatch
     outcome is recorded in the summary/log, never silently swallowed. */
  scoutSweep: defineAction({
    request: z.object({}),
    response: z.object({ ok: z.literal(true), summary: z.string(), sweptAt: z.string() }),
    async handler(ctx): Promise<{ ok: true; summary: string; sweptAt: string }> {
      await ensureSeed(ctx);
      await ensureWatchlist(ctx);
      await ensureScouts(ctx);
      await ensureWatchlistScouts(ctx);
      try { await recordWatchPricePointsImpl(ctx); } catch { /* accrual best-effort */ }
      await ensurePicClickPurge(ctx);
      await ensureOwnerReportedEnded(ctx);
      await ensureOwnerReportedAllEnded(ctx);
      const db = ctx.db<typeof schema>();
      const sweptAt = new Date().toISOString();
      const today = sweptAt.slice(0, 10);

      // ——— LIVENESS RE-VERIFICATION (every sweep, before the hunt) ———
      // Every actionable finding's URL is re-checked NOW through the
      // tightened state machine (see reverifyAllLiveListings): positive
      // ended evidence (incl. a known end time now past) flips to Gone
      // in THIS sweep; positive live proof re-stamps
      // last_verified_live_at and restores stale rows; inconclusive
      // checks build a miss streak — 3 in a row demote to 'stale' (out
      // of every live surface), 72h without any positive proof retires
      // the row to Gone as a presumed dead link.
      await ensureLivenessRepair(ctx);
      let reverify: ReverifyResult = { checked: 0, stillLive: 0, expired: 0, inconclusive: 0, demoted: 0, restored: 0, retired: 0, expiredNames: [], demotedNames: [] };
      try { reverify = await reverifyAllLiveListings(ctx); } catch (e) { reverify = { checked: 0, stillLive: 0, expired: 0, inconclusive: 0, demoted: 0, restored: 0, retired: 0, expiredNames: [`re-verify pass failed: ${e instanceof Error ? e.message.slice(0, 100) : "unknown"}`], demotedNames: [] }; }

      // ——— Build the hunt subject list (watchlist + owned) ———
      const watchRows = await db.select().from(schema.watchlist).orderBy(asc(schema.watchlist.sortOrder));
      const cardRows = await db.select().from(schema.cards);
      const subjects: HuntSubject[] = [];
      const cfgMap = await scoutConfigMap(ctx);
      const cfgOf = (id: string): ScoutConfig => cfgMap.get(id) ?? defaultScoutConfig(id);
      for (const w of watchRows as any[]) {
        if (isHiddenWatchStatus(w.status)) continue;
        if (w.kind === "avoid" || w.kind === "warning") continue;
        const sid0 = (w.scoutId as string) ?? scoutForWatch(w.name as string);
        const cfg0 = cfgOf(sid0);
        // Scout setup (Oct 14, 2026 — spec R.3): an inactive scout's
        // subjects are not hunted at all; a focus list restricts the
        // scout to its groups; a per-scout ceiling caps the effective
        // max-buy for its targets. Defaults = current behavior.
        if (!cfg0.isActive) continue;
        if (cfg0.focusGroups.length > 0 && !cfg0.focusGroups.includes(targetGroupFor(w.name as string, null, w.kind as string))) continue;
        subjects.push({
          subjectKey: `watch-${w.id}`,
          displayName: w.name as string,
          queryName: queryNameForWatch(w.name as string),
          gradeLabel: w.kind === "wc" ? "Raw (grading candidate)" : w.kind === "vending" ? "Raw / sheet" : (((w.gradeLabel as string) || "As listed")),
          marketUsd: watchMarketOf(w.priceContext as string),
          maxBuy: (() => { const im = parseMaxBuy(w.priceContext as string) ?? ((w.maxBuyUsd as number | null) ?? null); return cfg0.ceilingUsd != null ? (im != null ? Math.min(im, cfg0.ceilingUsd) : cfg0.ceilingUsd) : im; })(),
          scoutId: (w.scoutId as string) ?? scoutForWatch(w.name as string),
        });
      }
      for (const c of cardRows as any[]) {
        if (c.status !== "active") continue;
        const market = effectiveOf(c);
        if (market == null) continue;
        const isJp = ((c.name as string) + " " + (c.setName as string)).toLowerCase().includes("japanese");
        if (!cfgOf(isJp ? "eevee" : "gengar").isActive) continue;
        subjects.push({
          subjectKey: `owned-${c.cert}`,
          displayName: `${c.name} — ${c.setName} #${c.number}`,
          queryName: `${c.name} ${c.setName} ${c.grader} ${c.grade}`,
          gradeLabel: `${c.grader} ${c.grade}`,
          marketUsd: market,
          maxBuy: null,
          scoutId: isJp ? "eevee" : "gengar",
        });
      }
      // Priority: WC + vending hunts first, then other watchlist, then owned
      // by value — then rotate a slice of 10 so consecutive 2-hourly sweeps
      // cycle through the whole board instead of re-checking the same six.
      const ordered = [...subjects].sort((a, b) => {
        const aw = a.subjectKey.startsWith("watch-") ? 0 : 1; const bw = b.subjectKey.startsWith("watch-") ? 0 : 1;
        if (aw !== bw) return aw - bw;
        return (b.marketUsd ?? 0) - (a.marketUsd ?? 0);
      });
      const SLICE = 10;
      const bucket = Math.floor(Date.now() / (2 * 3600 * 1000));
      const start = ordered.length > 0 ? (bucket * SLICE) % ordered.length : 0;
      const slice: HuntSubject[] = [];
      for (let i = 0; i < Math.min(SLICE, ordered.length); i++) slice.push(ordered[(start + i) % ordered.length]!);

      // ——— Inline hunt: one live web search per subject in the slice ———
      type ScoutAgg = { candidates: number; finds: number; t1: number; t2: number; listingsSaved: number; filedStale: number; targets: string[] };
      const scoutConfigLines = ["gengar", "pikachu", "eevee", "snorlax", "rocket"].map(id => {
        const c = cfgOf(id);
        const bits: string[] = [];
        if (!c.isActive) bits.push("INACTIVE \u2014 do not hunt its targets");
        if (c.focusGroups.length) bits.push("focus groups: " + c.focusGroups.join(", "));
        if (c.ceilingUsd != null) bits.push("ceiling $" + c.ceilingUsd + " (subject max-buys already capped)");
        if (c.tier1DiscountPct != null) bits.push("Tier 1 threshold " + c.tier1DiscountPct + "% under comp");
        if (c.marketplaces) bits.push("marketplaces: " + c.marketplaces);
        return bits.length ? "SCOUT SETUP \u2014 " + id + ": " + bits.join("; ") + "." : "";
      }).filter(Boolean).join("\n");
      const agg = new Map<string, ScoutAgg>();
      const aggFor = (id: string): ScoutAgg => { let a = agg.get(id); if (!a) { a = { candidates: 0, finds: 0, t1: 0, t2: 0, listingsSaved: 0, filedStale: 0, targets: [] }; agg.set(id, a); } return a; };
      let huntError: string | null = null;
      let totalCandidates = 0; let totalListingsSaved = 0; let totalFinds = 0; let totalUnverifiedSaved = 0; let totalFiledStale = 0;
      try {
        const searches = await Promise.allSettled(slice.map(async (s) => {
          const hint = s.scoutId === "eevee" ? "eBay Mercari Yahoo Japan" : s.scoutId === "pikachu" ? "TCGplayer eBay" : s.scoutId === "snorlax" ? "eBay sealed booster box" : "eBay";
          const res: any = await ctx.tool.web_search(`${s.queryName} Pokemon card for sale price ${hint}`, { timeout_secs: 30 });
          const results: any[] = res?.content?.results ?? [];
          return { subject: s, results };
        }));
        const okSearches = searches.filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled").map(r => r.value);
        const failedCount = searches.length - okSearches.length;
        if (okSearches.length === 0 && slice.length > 0) throw new Error("every listing search failed");
        if (failedCount > 0) huntError = `${failedCount} of ${searches.length} listing searches failed; counts below cover the searches that returned.`;

        // Allowed URLs: verbatim from search results only — enforced below.
        const allowedUrls = new Set<string>();
        for (const { results } of okSearches) for (const r of results) if (typeof r.url === "string" && r.url) allowedUrls.add(r.url);
        for (const { subject, results } of okSearches) { const a = aggFor(subject.scoutId); a.candidates += results.length; a.targets.push(subject.queryName); totalCandidates += results.length; }

        // Strict extraction: a listing counts only when the result itself
        // states a price for that exact card/grade and links a listing page.
        let extracted: z.infer<typeof huntExtractSchema>["listings"] = [];
        if (okSearches.length > 0) {
          const blocks = okSearches.map(({ subject, results }) => {
            const lines = results.filter((r: any) => typeof r.url === "string" && r.url).slice(0, 8).map((r: any, i: number) => `  [${i + 1}] ${r.title ?? ""} | URL: ${r.url} | ${String(r.snippet ?? "").slice(0, 400)}`).join("\n");
            return `SUBJECT subjectKey=${subject.subjectKey} card="${subject.displayName}" grade="${subject.gradeLabel}" marketUsd=${subject.marketUsd ?? "unknown"}\n${lines}`;
          }).join("\n\n");
          const out = await ctx.inference.complete(
            `You are extracting live marketplace listings from web search results for a Pokemon card deal hunt. For each SUBJECT below, look ONLY at that subject's results. Extract a listing ONLY when ALL of these hold: (1) the result is for that exact card and grade (raw copies count for subjects whose grade says Raw); (2) the title or snippet states a concrete asking price in USD (convert a stated JPY price only if a USD figure is also stated — otherwise skip); (3) the URL is a specific product/listing page, not a search page, category page, price-guide page, or sold-history page. PICCLICK EXCLUSION (mandatory): NEVER extract a listing whose URL is on any picclick domain (picclick.com, picclick.co.uk, picclick.* any TLD) — PicClick links are broken and not served; skip those results entirely and do not substitute another URL for them. Copy each listingUrl EXACTLY as shown — never shorten, edit, or invent one. seller and shipsFrom only when the result text states them, otherwise null. When in doubt, skip the result — an empty list is an honest answer.\n\n${blocks}`,
            { schema: huntExtractSchema },
          );
          extracted = out.listings;
        }

        // Persist: validate URL against the verbatim set + listing-page
        // shape in code, dedupe BY URL (ledger: re-found = update last-seen
        // + price, price_dropped when lower — never a duplicate row),
        // respect passed items, price vs market.
        const subjectByKey = new Map(slice.map(s => [s.subjectKey, s]));
        const existingListings = await db.select().from(schema.marketListings);
        // Canonical-key maps (Oct 12, 2026): stored rows and fresh
        // candidates are matched by listing IDENTITY, not URL string —
        // the same listing under different tracking parameters is the
        // same listing for dedupe, pass and ended checks alike.
        const listingByUrl = new Map<string, any>();
        for (const row of existingListings as any[]) if (row.listingUrl) listingByUrl.set(canonicalListingKey(row.listingUrl as string), row);
        const existingDeals = await db.select().from(schema.dealFeed);
        const dealByUrl = new Map<string, any>();
        for (const row of existingDeals as any[]) if (row.listingUrl) dealByUrl.set(canonicalListingKey(row.listingUrl as string), row);
        const passedNames = new Set((existingDeals as any[]).filter(d => d.passed === 1).map(d => (d.cardName as string).trim().toLowerCase()));
        // Dismissals from BOTH stores (Oct 12, 2026): passed URLs used
        // to be read from deal_feed only, so a listing the owner passed in
        // the Terminal/Trenches could still be re-captured — and a
        // qualifying re-capture created a brand-new DEAL for it.
        const { passedKeys: sweepPassedKeys, ownerEndedKeys: sweepOwnerEndedKeys } = dismissalKeys(existingDeals as any[], existingListings as any[]);
        for (const l of extracted) {
          const subject = subjectByKey.get(l.subjectKey);
          if (!subject) continue;
          if (isPicClickUrl(l.listingUrl)) continue; // PICCLICK EXCLUSION: discarded at capture, never stored or pinned (Oct 9, 2026)
          if (!allowedUrls.has(l.listingUrl) || !isListingPageUrl(l.listingUrl)) continue;
          if (!(l.askingUsd > 0)) continue;
          const key = canonicalListingKey(l.listingUrl);
          if (passedNames.has(subject.displayName.trim().toLowerCase()) || sweepPassedKeys.has(key)) continue;
          // OWNER-REPORTED ENDED (Oct 9, 2026): this listing was
          // reported ended by the owner — terminal, never resurrected by
          // a sweep even if search still surfaces the ended listing.
          if (sweepOwnerEndedKeys.has(key)) continue;
          const a = aggFor(subject.scoutId);
          const marketplace = marketplaceForUrl(l.listingUrl);
          // LIVENESS GATE (capture time): the listing page itself is
          // checked before anything is posted. Search results can be
          // stale — a page that now reads ended/sold/404 is recorded
          // directly as Gone and NEVER posted as live.
          const liveness = await verifyListingLive(ctx, l.listingUrl, { freshEvidence: true });
          if (liveness.state === "ended") {
            const exL: any = listingByUrl.get(key);
            if (exL) await db.update(schema.marketListings).set({ status: "gone", endedAt: today, endedReason: liveness.reason, lastCheckAt: liveness.checkedAt, verifyMissStreak: 0 }).where(eq(schema.marketListings.id, exL.id));
            else await db.insert(schema.marketListings).values({ subjectKey: subject.subjectKey, subjectName: subject.displayName, gradeLabel: subject.gradeLabel, askingUsd: l.askingUsd, marketUsd: subject.marketUsd, marketplace, seller: l.seller, shipsFrom: l.shipsFrom, listingUrl: l.listingUrl, foundAt: today, lastSweptAt: sweptAt, scoutId: subject.scoutId, status: "gone", firstFoundAt: today, endedAt: today, endedReason: liveness.reason, lastCheckAt: liveness.checkedAt });
            const exD: any = dealByUrl.get(key);
            if (exD && exD.passed !== 1) await db.update(schema.dealFeed).set({ status: "gone", endedAt: today, endedReason: liveness.reason, lastCheckAt: liveness.checkedAt, verifyMissStreak: 0 }).where(eq(schema.dealFeed.id, exD.id));
            continue;
          }
          if (liveness.state === "unknown") {
            // TERMINAL CENSUS CAPTURE (Oct 10, 2026): the page check
            // was blocked, so there is no positive live proof — but a
            // priced listing surfaced by live search for a tracked
            // card is exactly what a market terminal shows. It is
            // saved to market_listings as a Terminal listing (ask vs
            // market %, deal flag computed on read), WITHOUT a
            // verified-live stamp — its row renders "never positively
            // verified live", the ledger keeps it in the Stale bucket,
            // and it NEVER becomes a deal finding on this evidence
            // (deal creation below requires the verified-live path).
            // Positive ended evidence was handled above; a known-Gone
            // row is never resurrected by an inconclusive check.
            const exU: any = listingByUrl.get(key);
            if (exU && exU.status === "gone") {
              await db.update(schema.marketListings).set({ lastCheckAt: liveness.checkedAt }).where(eq(schema.marketListings.id, exU.id));
            } else if (exU) {
              const droppedU = l.askingUsd < (exU.askingUsd as number);
              await db.update(schema.marketListings).set({ askingUsd: l.askingUsd, marketUsd: subject.marketUsd ?? exU.marketUsd, lastSweptAt: sweptAt, lastCheckAt: liveness.checkedAt, prevAskingUsd: droppedU ? exU.askingUsd : (exU.prevAskingUsd ?? null), endsAt: liveness.endsAt ?? exU.endsAt ?? null, status: droppedU ? "price_dropped" : "live" }).where(eq(schema.marketListings.id, exU.id));
              a.listingsSaved++; totalListingsSaved++;
            } else {
              await db.insert(schema.marketListings).values({ subjectKey: subject.subjectKey, subjectName: subject.displayName, gradeLabel: subject.gradeLabel, askingUsd: l.askingUsd, marketUsd: subject.marketUsd, marketplace, seller: l.seller, shipsFrom: l.shipsFrom, listingUrl: l.listingUrl, foundAt: today, lastSweptAt: sweptAt, scoutId: subject.scoutId, status: "live", firstFoundAt: today, lastVerifiedLiveAt: null, lastCheckAt: liveness.checkedAt, verifyMissStreak: 1, endsAt: liveness.endsAt });
              a.listingsSaved++; totalListingsSaved++; totalUnverifiedSaved++;
            }
            // LEDGER PARITY (Oct 13, 2026): an under-market listing on
            // this inconclusive evidence used to get NO Ledger row at
            // all from the inline sweep, while the same evidence via
            // saveScoutFind (deep hunt) files a deal row — so whether
            // a find "posted" depended on which path found it. An
            // under-market (≥8% under comp, or under max-buy) listing
            // now files a Ledger row as STALE — unverified, exactly
            // like saveScoutFind: visible in the Ledger's Stale tab
            // with its link, never counted as a find, never pinned,
            // and promoted only by a later positive verification.
            // Existing live/gone/bought deal rows are left to the
            // re-verification machine — an inconclusive check never
            // demotes or revives them from here.
            {
              const discU = subject.marketUsd != null && subject.marketUsd > 0 ? Math.round(((subject.marketUsd - l.askingUsd) / subject.marketUsd) * 1000) / 10 : null;
              const underMaxU = subject.maxBuy != null && l.askingUsd <= subject.maxBuy;
              const qualifiesU = (discU != null && discU >= 8) || underMaxU;
              const exDU: any = dealByUrl.get(key);
              if (qualifiesU && (!exDU || exDU.status === "stale")) {
                const tierU = tierFor(discU, true, underMaxU);
                const noteU = `Under-market listing captured by the inline scout sweep on ${today} — asking $${l.askingUsd.toLocaleString("en-US")} vs market/comp $${(subject.marketUsd ?? 0).toLocaleString("en-US")}${discU != null ? ` (${discU.toFixed(1)}% under)` : ""}${underMaxU ? `; at/under the watchlist max-buy of $${(subject.maxBuy ?? 0).toLocaleString("en-US")}` : ""}. Filed as Stale — unverified: the capture-time page check was inconclusive (bot-blocked), so this is NOT a pinned deal; a sweep that positively verifies it live promotes it.`;
                if (exDU && exDU.passed !== 1) {
                  await db.update(schema.dealFeed).set({ askingUsd: l.askingUsd, marketUsd: subject.marketUsd ?? exDU.marketUsd, discountPct: discU, tier: tierU, lastSeenAt: today, checkedDate: today, lastCheckAt: liveness.checkedAt, endsAt: liveness.endsAt ?? exDU.endsAt ?? null }).where(eq(schema.dealFeed.id, exDU.id));
                  a.filedStale++; totalFiledStale++;
                } else if (!exDU) {
                  const insU: any = await db.insert(schema.dealFeed).values({ cardName: subject.displayName, gradeLabel: subject.gradeLabel, askingUsd: l.askingUsd, marketUsd: subject.marketUsd, discountPct: discU, marketplace, seller: l.seller, listingUrl: l.listingUrl, foundAt: today, scoutId: subject.scoutId, checkedDate: today, note: noteU, isExample: 0, tier: tierU, status: "stale", firstFoundAt: today, lastSeenAt: today, prevAskingUsd: null, subjectKey: subject.subjectKey, targetGroup: targetGroupFor(subject.displayName, subject.subjectKey, null), lastVerifiedLiveAt: null, lastCheckAt: liveness.checkedAt, verifyMissStreak: 1, endsAt: liveness.endsAt }).returning({ id: schema.dealFeed.id });
                  if (insU[0]?.id) dealByUrl.set(key, { id: insU[0].id, status: "stale", passed: 0, listingUrl: l.listingUrl });
                  a.filedStale++; totalFiledStale++;
                }
              }
            }
            continue;
          }
          const verifiedAt = liveness.checkedAt;
          const existingListing: any = listingByUrl.get(key);
          if (existingListing) {
            const droppedL = l.askingUsd < (existingListing.askingUsd as number);
            await db.update(schema.marketListings).set({ askingUsd: l.askingUsd, marketUsd: subject.marketUsd ?? existingListing.marketUsd, lastSweptAt: sweptAt, lastVerifiedLiveAt: verifiedAt, lastCheckAt: verifiedAt, verifyMissStreak: 0, endedAt: null, endedReason: null, prevAskingUsd: droppedL ? existingListing.askingUsd : (existingListing.prevAskingUsd ?? null), endsAt: liveness.endsAt ?? existingListing.endsAt ?? null, status: droppedL ? "price_dropped" : "live" }).where(eq(schema.marketListings.id, existingListing.id));
            a.listingsSaved++; totalListingsSaved++;
          } else {
            await db.insert(schema.marketListings).values({ subjectKey: subject.subjectKey, subjectName: subject.displayName, gradeLabel: subject.gradeLabel, askingUsd: l.askingUsd, marketUsd: subject.marketUsd, marketplace, seller: l.seller, shipsFrom: l.shipsFrom, listingUrl: l.listingUrl, foundAt: today, lastSweptAt: sweptAt, scoutId: subject.scoutId, status: "live", firstFoundAt: today, lastVerifiedLiveAt: verifiedAt, lastCheckAt: verifiedAt, verifyMissStreak: 0, endsAt: liveness.endsAt });
            a.listingsSaved++; totalListingsSaved++;
          }
          const discount = subject.marketUsd != null && subject.marketUsd > 0 ? Math.round(((subject.marketUsd - l.askingUsd) / subject.marketUsd) * 1000) / 10 : null;
          const underMaxBuy = subject.maxBuy != null && l.askingUsd <= subject.maxBuy;
          const qualifies = (discount != null && discount >= 8) || underMaxBuy;
          const existingDeal: any = dealByUrl.get(key);
          if (existingDeal && existingDeal.passed !== 1) {
            // Re-found AND re-verified live above: update the ledger row
            // in place (a previously Gone row whose URL is live again
            // with a new verified check rejoins as live; Bought is final).
            const dropped = l.askingUsd < (existingDeal.askingUsd as number);
            const tier = tierFor(discount, true, underMaxBuy);
            await db.update(schema.dealFeed).set({ askingUsd: l.askingUsd, marketUsd: subject.marketUsd ?? existingDeal.marketUsd, discountPct: discount, tier, prevAskingUsd: dropped ? existingDeal.askingUsd : (existingDeal.prevAskingUsd ?? null), lastSeenAt: today, checkedDate: today, lastVerifiedLiveAt: verifiedAt, lastCheckAt: verifiedAt, verifyMissStreak: 0, endedAt: null, endedReason: null, endsAt: liveness.endsAt ?? existingDeal.endsAt ?? null, status: (existingDeal.status === "bought") ? existingDeal.status : dropped ? "price_dropped" : "live" }).where(eq(schema.dealFeed.id, existingDeal.id));
            if (qualifies) { a.finds++; totalFinds++; if (tier === 1) a.t1++; else a.t2++; }
          } else if (qualifies && !existingDeal) {
            const tier = tierFor(discount, true, underMaxBuy);
            await db.insert(schema.dealFeed).values({
              cardName: subject.displayName, gradeLabel: subject.gradeLabel, askingUsd: l.askingUsd, marketUsd: subject.marketUsd, discountPct: discount,
              marketplace, seller: l.seller, listingUrl: l.listingUrl, foundAt: today, scoutId: subject.scoutId, checkedDate: today,
              note: `Live listing captured by the inline scout sweep on ${today} — asking $${l.askingUsd.toLocaleString("en-US")} vs market/comp $${(subject.marketUsd ?? 0).toLocaleString("en-US")}${discount != null ? ` (${discount.toFixed(1)}% under)` : ""}${underMaxBuy ? `; at/under the watchlist max-buy of $${(subject.maxBuy ?? 0).toLocaleString("en-US")}` : ""}. Liveness-verified at capture (page checked, no ended/sold signals); re-verified every 2h sweep. Verify seller, cert/condition and shipping on the listing before buying.`,
              isExample: 0, tier, status: "new", firstFoundAt: today, lastSeenAt: today, prevAskingUsd: null, subjectKey: subject.subjectKey, targetGroup: targetGroupFor(subject.displayName, subject.subjectKey, null), lastVerifiedLiveAt: verifiedAt, lastCheckAt: verifiedAt, verifyMissStreak: 0, endsAt: liveness.endsAt,
            });
            a.finds++; totalFinds++;
            if (tier === 1) a.t1++; else a.t2++;
          }
        }
      } catch (e) {
        huntError = `Inline hunt FAILED this run: ${e instanceof Error ? e.message.slice(0, 160) : "unknown error"} — no candidates were checked, so this sweep's zeros mean the hunt did not run, not that the market is empty.`;
      }

      // ——— Log one sweep row per scout with REAL counts ———
      const reverifyNote = `Liveness re-verification (tightened): re-checked ${reverify.checked} actionable finding URL${reverify.checked === 1 ? "" : "s"} — ${reverify.stillLive} positively confirmed live (only positive checks stamp 'last verified live')${reverify.restored > 0 ? `, ${reverify.restored} stale row${reverify.restored === 1 ? "" : "s"} restored to live on fresh proof` : ""}, ${reverify.expired} moved to Gone/Expired (${reverify.retired} of them retired after 72h+ with no positive proof)${reverify.expired > 0 ? ` (${reverify.expiredNames.slice(0, 3).join("; ")})` : ""}${reverify.demoted > 0 ? `, ${reverify.demoted} demoted to Stale — unverified after ${MISS_STREAK_DEMOTE} consecutive inconclusive checks (${reverify.demotedNames.slice(0, 3).join("; ")}) — out of the deal feed and the ledger's live tiers until a check gets through (Terminal census rows are exempt from demotion: they leave only on positive ended evidence)` : ""}${reverify.inconclusive > 0 ? `, ${reverify.inconclusive} check${reverify.inconclusive === 1 ? "" : "s"} inconclusive (bot-blocked/unreachable/bot-wall — a single blocked check never unpins, but misses now accumulate toward demotion)` : ""}. Ended, expired and long-unverifiable listings never stay live.`;
      const scoutRows = await db.select().from(schema.scoutStatus);
      // Rocket's red-team shift is computed server-side at read time; his
      // sweep row reports the CURRENT adversarial workload honestly.
      const rocketReviewed = (await db.select().from(schema.dealFeed)).filter((d: any) => d.passed !== 1 && d.listingUrl && d.status !== "gone" && d.status !== "bought").length;
      for (const s of scoutRows as any[]) {
        const a = agg.get(s.scoutId as string);
        if (s.scoutId === "rocket") {
          await db.insert(schema.scoutSweeps).values({ scoutId: "rocket", sweptAt, sourcesChecked: SCOUT_SOURCES["rocket"] ?? s.territory, candidatesSeen: rocketReviewed, findsCount: 0, tier1Count: 0, tier2Count: 0, note: `Red-team shift: adversarial review stands over ${rocketReviewed} actionable find(s) in the live feed plus the full holdings list — bear cases ride with each Tier 1/2 find, and held cards are stress-tested against the cheapest live asks (Risk surface). Rocket pins nothing and buys nothing. ` + reverifyNote });
          await db.update(schema.scoutStatus).set({ lastSweepAt: sweptAt, lastSweepCandidates: rocketReviewed, lastSweepFinds: 0, lastChecked: today }).where(eq(schema.scoutStatus.id, s.id));
          continue;
        }
        const note = (huntError && (!a || a.candidates === 0)
          ? huntError
          : a
            ? `Inline hunt checked ${a.candidates} live-listing search results for ${a.targets.length} target${a.targets.length === 1 ? "" : "s"} (${a.targets.slice(0, 3).join("; ")}${a.targets.length > 3 ? "; …" : ""}). Captured ${a.listingsSaved} listing${a.listingsSaved === 1 ? "" : "s"} to the Market Terminal — every priced listing for the target at any % of market (deals flagged, not filtered); ${a.finds} under-market find${a.finds === 1 ? "" : "s"} posted as live deals (Tier 1: ${a.t1}, Tier 2: ${a.t2})${a.filedStale > 0 ? `; ${a.filedStale} under-market listing${a.filedStale === 1 ? "" : "s"} filed as Stale — unverified in the Ledger (page check blocked — NOT posted as live deals and NOT counted in finds)` : ""}.${huntError ? " " + huntError : ""} A background deep hunt also runs for full listing pages.`
            : `No targets in this sweep's rotation slice — this scout's targets are checked on other sweeps in the rotation (10 targets per sweep, cycling every ~2 hours).${huntError ? " " + huntError : ""}`) + " " + reverifyNote;
        await db.insert(schema.scoutSweeps).values({ scoutId: s.scoutId, sweptAt, sourcesChecked: SCOUT_SOURCES[s.scoutId as string] ?? s.territory, candidatesSeen: a?.candidates ?? 0, findsCount: a?.finds ?? 0, tier1Count: a?.t1 ?? 0, tier2Count: a?.t2 ?? 0, note });
        await db.update(schema.scoutStatus).set({ lastSweepAt: sweptAt, lastSweepCandidates: a?.candidates ?? 0, lastSweepFinds: a?.finds ?? 0, lastChecked: today }).where(eq(schema.scoutStatus.id, s.id));
      }

      // ——— Background deep hunt — correct spawnTask API + contract ———
      let dispatchNote = "";
      try {
        const res = await ctx.agent.spawnTask(
          "Run a DEEP scout hunt for this Pokemon dashboard (a quick inline sweep just ran; your job is the thorough pass that opens actual listing pages). SPEED IS THE POINT: hunt NEWLY LISTED Buy-It-Now / fixed-price listings FIRST on each source. Territories: Gengar = eBay graded slabs + Fanatics Collect + Mercari US; Pikachu = TCGplayer + eBay raw + Mercari US; Eevee = Yahoo Japan + Mercari JP + eBay JP sellers; Snorlax = sealed (MSRP only for 30th Anniversary). Cover watchlist items AND owned collection cards: first call getPortfolio and read its terminal data for subjectKeys (owned-<cert>, watch-<id>) and market values. For each live listing of an exact card/grade you open, call saveMarketListing with the verbatim listing URL, asking price, market value, marketplace, seller, and ships-from when shown — at ANY asking price, at/under/over market alike: the Market Terminal is a census of every priced listing for tracked cards, priced as % of market with deals flagged at <=80%, NOT a deals-only feed, so never skip a listing just because it is not under market. NEVER construct or guess a listing URL. Tier 1 = >=15% under a verified comp WITH a live link — also save via saveScoutFind. Tier 2 = 8-15% under comp, OR under a watchlist max-buy, WITH a live link — also save via saveScoutFind with underMaxBuy when applicable. Comps follow the SOURCE HIERARCHY (Oct 14, 2026): (1) eBay SOLD search is PRIMARY — the working browser carries the owner's signed-in session, so completed/sold search (LH_Sold=1&LH_Complete=1) renders per-sale prices + dates; match the EXACT printing + grade (wrong-printing results are NOT comps); a CLEAN displayed price means it sold at that price (bookable); a STRUCK-THROUGH / 'Best offer accepted' price means the true price is HIDDEN — flagged context only, never a clean comp at the displayed figure. (2) Fanatics Collect is co-primary for auctions / high-end. (3) Major auction houses (Heritage, Goldin, PWCC). (4) Aggregators (PriceCharting and kin) are CROSS-CHECK / CONTEXT ONLY — never the filed source when an eBay sold record exists, and never named in a verified filing. COLLEKTR SCRAP (Oct 14, 2026 — owner order): Collectr is PROHIBITED as a source for eBay ended/sold listings in any capacity — never use it, cite it, or relay its data for ended/sold listings; direct eBay sold search is the ONLY eBay ended source. Collectr and CardCodex may appear only as live-listing ask context, never as sold data, and liveness/ended determinations come from the listing pages themselves, never from Collectr. SESSION-EXPIRY FALLBACK: if the eBay session is signed out, walled, or sold prices are not rendering, SAY SO LOUDLY in your sweep note (start the note with 'EBAY SESSION FALLBACK:') and label the fallback evidence as fallback — never silently degrade to aggregator-only evidence. Japanese sold for Japanese cards; pokeprices.io is caution-only, never a sole comp; asks are never comps. No kept or locked values exist (the owner-kept lock system was removed Oct 14, 2026) — every card's market value is its verified-comp value from getPortfolio. Cards unlocked from former kept values are priced off their own printing's latest verified comp, never a different printing. PASSED RULE: never re-save anything the owner passed. CLOSED / ENDED RULE: listings the owner marked Closed / Ended from the dashboard are owner-reported ended — the server refuses their URLs permanently (in either store, under any URL variant), exactly like the Oct 9 / Oct 10 owner reports below. PICCLICK RULE (mandatory): PicClick is NOT SERVED — its links are broken (removed Oct 9, 2026). NEVER save a listing or find whose URL is on any picclick domain (picclick.com, picclick.co.uk, picclick.* any TLD), and never cite PicClick as a source; if a search result is a PicClick mirror of an eBay listing, open and save the direct eBay listing instead, or skip it. ROCKET RULE: 'rocket' is a server-side red-team persona — never save finds, listings or sweep results under scoutId 'rocket'. LIVENESS RULE (mandatory, split by surface): for the Market Terminal, save every priced listing you open for a tracked card/grade — never a listing you know is sold/ended/out-of-stock. The server re-checks every saved URL's page; positive ended evidence files it Gone/Expired immediately, and a page the checker cannot verify (bot-blocked) still posts to the Terminal labelled never-positively-verified — Terminal census rows are never demoted or retired on inconclusive checks alone. For PINNED DEALS via saveScoutFind the strict bar stays: only save a find you personally opened and confirmed CURRENTLY LIVE and for sale, never a search-result snippet alone — deal findings accumulate misses toward Stale/Gone on every 2-hourly re-verification. END-TIME RULE: when a listing page shows an auction/listing end date or time, pass it as endsAt (ISO datetime) on saveMarketListing / saveScoutFind — a lot whose end time passes is expired automatically. OWNER-REPORTED ENDED RULE (mandatory): listings the owner has reported ended are filed Gone/Expired in the data and the server refuses their URLs — NEVER re-save, re-pin or resurrect those listings. OWNER BLANKET RULE (mandatory): if the owner reports that all scout listings on file have ended, every finding/listing stored before that report is filed Gone/Expired with an owner-reported reason and is terminal the same way; NEVER re-save, re-pin or resurrect any of them. Only a listing genuinely first found after such a report may be posted to the Terminal, and only one with fresh positive live proof may be PINNED as a deal. Finish by calling saveSweepResults once per scout with your ADDITIONAL deep-hunt counts (candidatesSeen = listing pages you actually examined, findsCount, tier1Count, tier2Count, sourcesChecked, one-line note). COUNTING RULE (Oct 13, 2026): a find counts ONLY when it actually posts — pass postedDealIds with the deal ids saveScoutFind returned for the finds that posted as live deals. saveScoutFind returning pinned=false for a Tier-1-priced find means it was filed as Stale — unverified (NOT posted as a deal); a refused or Gone filing posts nothing either. The server verifies postedDealIds against the Ledger and discards any reported find with no matching posted row, so report finds from your save results, never from your search notes. Report 0 honestly when you find nothing — never invent a deal, price, seller, ships-from, or sales volume. SCOUT SETUP (owner configuration — honor it): " + (scoutConfigLines || "all scouts on defaults (active, all focus groups, no ceilings)") + " An INACTIVE scout's targets must not be hunted at all.",
          { expectsAction: "saveSweepResults", dedupeKey: `scout-deep-hunt-${bucket}` },
        );
        dispatchNote = res.ok ? ` Background deep hunt dispatched (task ${res.taskId.slice(0, 8)}…) — its counts merge into this sweep when it reports via saveSweepResults.` : ` Background deep hunt FAILED to dispatch: ${res.error} — the inline hunt above is the complete result for this sweep.`;
      } catch (e) {
        dispatchNote = ` Background deep hunt FAILED to dispatch: ${e instanceof Error ? e.message.slice(0, 140) : "unknown error"} — the inline hunt above is the complete result for this sweep.`;
      }

      // PRICE ACCRUAL (Oct 14, 2026 — spec Q.2): every sweep touch
      // files the dated reference points carried in the items' own
      // sourced records (append-only, deduped per item+date inside the
      // recorder) — the same conservative extraction the seed pass uses.
      try { await recordWatchPricePointsImpl(ctx); } catch { /* accrual is best-effort alongside the hunt */ }
      const summary = huntError && totalCandidates === 0
        ? `Scout sweep ran ${sweptAt} but the hunt did NOT complete: ${huntError} ${reverifyNote}${dispatchNote}`
        : `Scout sweep completed ${sweptAt} — inline hunt checked ${totalCandidates} live-listing search results across ${slice.length} rotating targets and captured ${totalListingsSaved} listing${totalListingsSaved === 1 ? "" : "s"} to the Market Terminal (every priced listing for a tracked card, at/under/over market alike — deals are flagged at ≤80% of market, not filtered in)${totalUnverifiedSaved > 0 ? `, ${totalUnverifiedSaved} of them search-captured with the page check blocked — shown in the Terminal labelled unverified, held out of the ledger's live tiers and never pinned as deals until positively verified` : ""}, plus ${totalFinds} under-market find${totalFinds === 1 ? "" : "s"} posted as live deals to the deal feed${totalFiledStale > 0 ? `, and ${totalFiledStale} under-market listing${totalFiledStale === 1 ? "" : "s"} filed as Stale — unverified in the Ledger (not posted as deals — the page checker could not verify them live)` : ""}. ${reverifyNote}${huntError ? " Note: " + huntError : ""}${dispatchNote} Sweeps run every ~2 hours (12/day), decoupled from the daily price refresh.`;
      ctx.invalidateQueries();
      return { ok: true as const, summary, sweptAt };
    },
  }),

  saveSweepResults: defineAction({
    request: z.object({ scoutId: z.string(), candidatesSeen: z.number(), findsCount: z.number(), tier1Count: z.number().default(0), tier2Count: z.number().default(0), sourcesChecked: z.string().default(""), note: z.string().default(""), postedDealIds: z.array(z.number()).default([]) }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.scoutSweeps).orderBy(desc(schema.scoutSweeps.id));
      const latest = (rows as any[]).find(r => r.scoutId === args.scoutId);
      if (latest) {
        // MERGE additively for candidates: the sweep row already holds
        // the inline hunt's real counts; the background deep hunt
        // reports ADDITIONAL pages it examined.
        // FINDS ARE RECONCILED, NOT CLAIMED (Oct 13, 2026 — the owner:
        // "the scouts say they find stuff and it doesn't post"): the
        // old code added the deep hunt's self-reported findsCount on
        // faith, so the sweep log and scout cards announced finds
        // whose saveScoutFind calls had actually been refused
        // (passed / owner-ended / PicClick), filed as Gone at capture,
        // or filed as Stale — unverified. Now a deep-hunt find counts
        // only when its row is ON FILE as a posted live finding: the
        // hunt passes postedDealIds (the ids saveScoutFind returned),
        // and the server counts exactly those rows that exist, belong
        // to this scout, carry a link, are not passed, and are
        // currently posted live (positively verified — not stale,
        // gone or bought). Tier split is read from those rows, never
        // from the claim. A claim with no matching posted rows adds
        // zero finds and the discrepancy is written into the note.
        const claimed = Math.max(0, args.findsCount);
        let postedCount = 0; let postedT1 = 0; let postedT2 = 0;
        if (args.postedDealIds.length > 0) {
          const dealRows = await db.select().from(schema.dealFeed);
          const seenIds = new Set<number>();
          for (const id of args.postedDealIds) {
            if (seenIds.has(id)) continue;
            seenIds.add(id);
            const d: any = (dealRows as any[]).find(r => r.id === id);
            if (!d || d.scoutId !== args.scoutId || d.passed === 1 || !d.listingUrl) continue;
            if (d.status === "gone" || d.status === "bought" || d.status === "stale" || !d.lastVerifiedLiveAt) continue;
            postedCount++;
            const t = d.tier ?? (d.discountPct != null && d.discountPct >= 15 ? 1 : 2);
            if (t === 1) postedT1++; else postedT2++;
          }
        }
        const reconcileNote = claimed !== postedCount
          ? ` Count reconciliation: the deep hunt reported ${claimed} find(s) but ${postedCount} matching finding row(s) are on file as posted live deals — only posted rows count; the rest did not post (refused as passed/ended, filed as Gone at capture, or filed as Stale — unverified).`
          : postedCount > 0 ? ` Count reconciliation: ${postedCount} reported find(s) verified against posted Ledger rows.` : "";
        const mergedCandidates = (latest.candidatesSeen ?? 0) + args.candidatesSeen;
        const mergedFinds = (latest.findsCount ?? 0) + postedCount;
        const mergedT1 = (latest.tier1Count ?? 0) + postedT1;
        const mergedT2 = (latest.tier2Count ?? 0) + postedT2;
        const mergedNote = (args.note ? `${latest.note} Deep hunt report: ${args.note}` : latest.note) + reconcileNote;
        await db.update(schema.scoutSweeps).set({ candidatesSeen: mergedCandidates, findsCount: mergedFinds, tier1Count: mergedT1, tier2Count: mergedT2, sourcesChecked: args.sourcesChecked || latest.sourcesChecked, note: mergedNote }).where(eq(schema.scoutSweeps.id, latest.id));
        const scoutRows = await db.select().from(schema.scoutStatus);
        const scout = (scoutRows as any[]).find(s => s.scoutId === args.scoutId);
        if (scout) await db.update(schema.scoutStatus).set({ lastSweepAt: latest.sweptAt, lastSweepCandidates: mergedCandidates, lastSweepFinds: mergedFinds }).where(eq(schema.scoutStatus.id, scout.id));
      }
      ctx.invalidateQueries();
      return { ok: true as const };
    },
  }),

  /* Market Terminal listings: one live listing for an exact card/grade.
     pct-of-market and the deal flag (<=80% of market) are computed on read
     and on save; a deal-territory listing also feeds the deal feed. */
  saveMarketListing: defineAction({
    request: z.object({
      subjectKey: z.string(), subjectName: z.string(), gradeLabel: z.string().default(""),
      askingUsd: z.number(), marketUsd: z.number().nullable().default(null),
      marketplace: z.string(), seller: z.string().nullable().default(null), shipsFrom: z.string().nullable().default(null),
      listingUrl: z.string().url(), scoutId: z.string().default(""),
      // Known auction/listing end (ISO datetime) when the page shows one.
      endsAt: z.string().nullable().default(null),
    }),
    response: z.object({ ok: z.literal(true), id: z.number(), isDeal: z.boolean() }),
    async handler(ctx, args): Promise<{ ok: true; id: number; isDeal: boolean }> {
      // PICCLICK EXCLUSION (Oct 9, 2026): discarded at capture — never
      // stored in the Market Terminal, never a deal.
      if (isPicClickUrl(args.listingUrl) || args.marketplace.toLowerCase().includes("picclick")) return { ok: true as const, id: 0, isDeal: false };
      const db = ctx.db<typeof schema>();
      await ensurePicClickPurge(ctx);
      await ensureOwnerReportedEnded(ctx);
      await ensureOwnerReportedAllEnded(ctx);
      if (!/^https?:\/\//i.test(args.listingUrl)) return { ok: true as const, id: 0, isDeal: false };
      // Passed check: never resurrect a passed subject.
      const watchRowsAll = await db.select().from(schema.watchlist);
      const m = args.subjectKey.match(/^watch-(\d+)$/);
      if (m) { const w = (watchRowsAll as any[]).find(x => x.id === Number(m[1])); if (w && isHiddenWatchStatus(w.status)) return { ok: true as const, id: 0, isDeal: false }; }
      const now = new Date().toISOString();
      // LIVENESS GATE (capture time): verify the listing page before it
      // is posted to the Market Terminal. Positively ended/sold/404 →
      // stored as Gone with the reason, never listed as live, never a
      // deal. freshEvidence is FALSE: an inconclusive fetch (bot block)
      // is UNKNOWN, not ended — the listing posts on the saving agent's
      // fresh open of the page, but WITHOUT a verified-live stamp.
      // Terminal census rows are governed by the Terminal rules from
      // there (no miss-streak demotion/retirement — positive ended
      // evidence or a week without sweep capture removes them).
      const liveness = await verifyListingLive(ctx, args.listingUrl, { freshEvidence: false });
      const existing = await db.select().from(schema.marketListings);
      const keyM = canonicalListingKey(args.listingUrl);
      const dupe: any = (existing as any[]).find(l => l.listingUrl && canonicalListingKey(l.listingUrl as string) === keyM);
      // OWNER-REPORTED ENDED (Oct 9, 2026): the owner reported this exact
      // listing ended — it stays Gone/Expired and is never re-posted
      // to the Terminal, whatever a later check claims.
      if (dupe && isOwnerReportedEnded(dupe)) return { ok: true as const, id: dupe.id as number, isDeal: false };
      // PASSED = NEVER RE-POSTED (Oct 12, 2026): this action previously
      // had NO passed check at all — re-saving a passed listing's URL
      // refreshed it back into the Terminal, and a passed DEAL's URL
      // inserted a brand-new live census row. the owner's pass (in either
      // store, matched by canonical key so URL variants count) and a
      // deal twin filed owner-ended both refuse the save outright.
      if (dupe && dupe.passed === 1) return { ok: true as const, id: dupe.id as number, isDeal: false };
      const dealRowsM = await db.select().from(schema.dealFeed);
      const dismissedDealM: any = (dealRowsM as any[]).find(d => d.listingUrl && canonicalListingKey(d.listingUrl as string) === keyM && (d.passed === 1 || isOwnerReportedEnded(d)));
      if (dismissedDealM) return { ok: true as const, id: 0, isDeal: false };
      if (liveness.state === "ended") {
        if (dupe) {
          await db.update(schema.marketListings).set({ status: "gone", endedAt: now.slice(0, 10), endedReason: liveness.reason, lastCheckAt: liveness.checkedAt, verifyMissStreak: 0 }).where(eq(schema.marketListings.id, dupe.id));
          ctx.invalidateQueries();
          return { ok: true as const, id: dupe.id as number, isDeal: false };
        }
        const insertedGone: any = await db.insert(schema.marketListings).values({ subjectKey: args.subjectKey, subjectName: args.subjectName, gradeLabel: args.gradeLabel, askingUsd: args.askingUsd, marketUsd: args.marketUsd, marketplace: args.marketplace, seller: args.seller, shipsFrom: args.shipsFrom, listingUrl: args.listingUrl, foundAt: now.slice(0, 10), lastSweptAt: now, scoutId: args.scoutId, status: "gone", firstFoundAt: now.slice(0, 10), endedAt: now.slice(0, 10), endedReason: liveness.reason, lastCheckAt: liveness.checkedAt }).returning({ id: schema.marketListings.id });
        ctx.invalidateQueries();
        return { ok: true as const, id: insertedGone[0]?.id ?? 0, isDeal: false };
      }
      // Stamp honesty: lastVerifiedLiveAt moves ONLY on a positive
      // live verdict; an inconclusive capture keeps the prior stamp.
      // A fresh agent save re-captures the row into the Terminal: a
      // stored 'stale' (inconclusive-demoted) row returns to live
      // Terminal status on re-save, while a Gone row returns ONLY on
      // positive live proof (owner-reported rows never return — see
      // the terminal guard above).
      const provenLive = liveness.state === "live";
      if (dupe) {
        const dropped = args.askingUsd < (dupe.askingUsd as number);
        const nextStatus = dupe.status === "gone" ? (provenLive ? "live" : "gone") : dropped ? "price_dropped" : "live";
        await db.update(schema.marketListings).set({ askingUsd: args.askingUsd, marketUsd: args.marketUsd ?? dupe.marketUsd, lastSweptAt: now, ...(nextStatus === "gone" ? {} : { endedAt: null, endedReason: null }), prevAskingUsd: dropped ? dupe.askingUsd : (dupe.prevAskingUsd ?? null), ...(provenLive ? { lastVerifiedLiveAt: liveness.checkedAt, verifyMissStreak: 0 } : {}), lastCheckAt: liveness.checkedAt, endsAt: args.endsAt ?? liveness.endsAt ?? dupe.endsAt ?? null, status: nextStatus }).where(eq(schema.marketListings.id, dupe.id));
        ctx.invalidateQueries();
        return { ok: true as const, id: dupe.id as number, isDeal: args.marketUsd != null && args.marketUsd > 0 && args.askingUsd / args.marketUsd <= 0.8 };
      }
      const inserted: any = await db.insert(schema.marketListings).values({ subjectKey: args.subjectKey, subjectName: args.subjectName, gradeLabel: args.gradeLabel, askingUsd: args.askingUsd, marketUsd: args.marketUsd, marketplace: args.marketplace, seller: args.seller, shipsFrom: args.shipsFrom, listingUrl: args.listingUrl, foundAt: now.slice(0, 10), lastSweptAt: now, scoutId: args.scoutId, status: "live", firstFoundAt: now.slice(0, 10), lastVerifiedLiveAt: provenLive ? liveness.checkedAt : null, lastCheckAt: liveness.checkedAt, verifyMissStreak: 0, endsAt: args.endsAt ?? liveness.endsAt ?? null }).returning({ id: schema.marketListings.id });
      const pct = args.marketUsd != null && args.marketUsd > 0 ? (args.askingUsd / args.marketUsd) * 100 : null;
      const isDeal = pct != null && pct <= 80;
      ctx.invalidateQueries();
      return { ok: true as const, id: inserted[0]?.id ?? 0, isDeal };
    },
  }),

  /* ——— Liveness pass (legacy cleanup + on-demand re-verification) ———
     Re-checks every actionable finding's listing URL right now through
     the tightened state machine: positive live proof re-stamps
     last_verified_live_at and restores stale rows; POSITIVE ended
     evidence (404 / sold page / redirect away / known end time past)
     flips to Gone/Expired, leaving the pinned feed and the Market
     Terminal in the same pass; inconclusive checks accumulate a miss
     streak — 3 consecutive misses demote to 'stale', 72h without
     positive proof retires to Gone as a presumed dead link.
     Terminal-only census rows are exempt from demotion/retirement
     (Oct 10, 2026): positive ended evidence still flips them to Gone.
     Invoked as
     this build's post-submit action so seeded/legacy findings already
     stored are cleaned before delivery, and it also runs inside every
     scoutSweep. Auctions are findings too once captured as listings —
     a closed lot (e.g. the Fanatics Giratina sibling auction after its
     Oct 11, 2026 close) flips to Gone here and its final hammer is then
     captured by the daily refresh as a sold comp, never kept live. */
  verifyLiveness: defineAction({
    request: z.object({}),
    response: z.object({ ok: z.literal(true), checked: z.number(), stillLive: z.number(), expired: z.number(), demoted: z.number(), restored: z.number(), summary: z.string() }),
    async handler(ctx): Promise<{ ok: true; checked: number; stillLive: number; expired: number; demoted: number; restored: number; summary: string }> {
      await ensureSeed(ctx);
      await ensureScouts(ctx);
      await ensurePicClickPurge(ctx);
      await ensureOwnerReportedEnded(ctx);
      await ensureOwnerReportedAllEnded(ctx);
      await ensureLivenessRepair(ctx);
      const r = await reverifyAllLiveListings(ctx);
      const summary = `Liveness pass ${new Date().toISOString()} — re-checked ${r.checked} actionable finding URL${r.checked === 1 ? "" : "s"}: ${r.stillLive} positively confirmed live (fresh 'last verified live' stamp)${r.restored > 0 ? `, ${r.restored} stale restored` : ""}, ${r.expired} moved to Gone/Expired (${r.retired} retired after 72h+ without positive proof)${r.expired > 0 ? ` (${r.expiredNames.slice(0, 5).join("; ")})` : ""}${r.demoted > 0 ? `, ${r.demoted} demoted to Stale — unverified (${r.demotedNames.slice(0, 5).join("; ")})` : ""}${r.inconclusive > 0 ? `, ${r.inconclusive} inconclusive (bot-blocked/unreachable/bot-wall — deal findings build a miss streak, Terminal census rows just record the check)` : ""}. Ended and expired listings are never kept live, and long-unverifiable DEAL findings are retired; findings are re-verified every 2-hourly sweep.`;
      await ctx.db<typeof schema>().insert(schema.refreshLogs).values({ summary, cardsChecked: r.checked });
      ctx.invalidateQueries();
      return { ok: true as const, checked: r.checked, stillLive: r.stillLive, expired: r.expired, demoted: r.demoted, restored: r.restored, summary };
    },
  }),

  saveRefreshFindings: defineAction({
    request: z.object({ summary: z.string(), updates: z.array(z.object({ cert: z.string(), checkedUsd: z.number(), source: z.string(), saleDate: z.string(), description: z.string() })).default([]) }),
    response: z.object({ ok: z.literal(true), updated: z.number(), skippedEvidence: z.number() }),
    async handler(ctx, args): Promise<{ ok: true; updated: number; skippedEvidence: number }> {
      const db = ctx.db<typeof schema>();
      let updated = 0;
      let skippedEvidence = 0;
      // Evidence valve (Remedies pass 1, item 1a): a filing whose
      // signature (cert + price + sale date + source family) is
      // already on file is SKIPPED, not duplicated — the daily
      // refresh re-reporting a card's latest comp must not mint a
      // new evidence row for the same underlying sale every day.
      // The card's checked price still updates (revaluation is
      // unaffected); only the evidence insert is gated.
      const sigs = await evidenceSigSet(db);
      const rows = await db.select().from(schema.cards);
      for (const u of args.updates) {
        const sig = evidenceSigKey(u.cert, u.checkedUsd, u.saleDate, u.source);
        const row = rows.find((r: any) => r.cert === u.cert);
        if (!row) continue;
        // COMP-BASED OFFICIALS (Oct 10, 2026): booking the checked
        // price IS the revaluation — effectiveOf derives a card's
        // official value from its latest checkedUsd, so this update
        // moves the card's official value and the headline portfolio
        // total in the same write. Sales evidence is booked alongside
        // so every official traces to the comps behind it.
        await db.update(schema.cards).set({ checkedUsd: u.checkedUsd, lastChecked: u.saleDate }).where(eqId(row.id));
        if (sigs.has(sig)) { skippedEvidence++; } else {
          sigs.add(sig);
          await db.insert(schema.salesEvidence).values({ cardCert: u.cert, saleDate: u.saleDate, price: u.checkedUsd, source: u.source, description: u.description });
        }
        updated++;
      }
      // Revalue today's portfolio snapshot from the NEW comp-based
      // officials, so the growth line moves on the day the findings
      // land (refreshPrices snapshots pre-dispatch totals; this
      // upsert supersedes that row for today). One snapshot per day.
      if (updated > 0) {
        try {
          const today = new Date().toISOString().slice(0, 10);
          const fresh = await db.select().from(schema.cards);
          const pricedVals = (fresh as any[]).filter(r => r.status === "active").map(r => effectiveOf(r)).filter((v: number | null) => v != null) as number[];
          const total = Math.round(pricedVals.reduce((s, v) => s + v, 0) * 100) / 100;
          if (total > 0) {
            const snaps = await db.select().from(schema.portfolioSnapshots);
            const todaySnap = (snaps as any[]).find(s => s.snapshotDate === today);
            if (todaySnap) {
              await db.update(schema.portfolioSnapshots).set({ totalUsd: total, pricedCount: pricedVals.length, note: "Comp-based revaluation — official values updated from live checked comps on refresh." }).where(eq(schema.portfolioSnapshots.id, todaySnap.id));
            } else {
              await db.insert(schema.portfolioSnapshots).values({ snapshotDate: today, totalUsd: total, pricedCount: pricedVals.length, note: "Comp-based revaluation — official values updated from live checked comps on refresh." });
            }
          }
        } catch { /* snapshot upsert is best-effort alongside the findings write */ }
      }
      await db.insert(schema.refreshLogs).values({ summary: `${args.summary} Evidence valve: skipped ${skippedEvidence} already-on-file evidence row${skippedEvidence === 1 ? "" : "s"} (same cert + price + date + source family — not re-filed).`, cardsChecked: args.updates.length });
      ctx.invalidateQueries();
      return { ok: true as const, updated, skippedEvidence };
    },
  }),

  // Demo export: the private deployment's stray-fixture cleanup keys on
  // one specific real cert; that cert is not part of this export, so the
  // matcher below names a fixture cert that cannot occur in demo data
  // and the cleanup is an inert no-op here.
  removeStrayForecastFixture: defineAction({
    request: z.object({}),
    response: strayForecastCleanupResponse,
    async handler(ctx): Promise<z.infer<typeof strayForecastCleanupResponse>> {
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.cardForecasts);
      const matches = (rows as any[]).filter(
        (r) =>
          r.cert === "DEMO-STRAY-FIXTURE" &&
          r.issuedAt === "2026-09-01" &&
          r.horizonDays === 30 &&
          r.rangeLow === 3000 &&
          r.rangeHigh === 3600 &&
          r.confidence === "B" &&
          r.origin === "live" &&
          r.status === "open",
      );
      let deleted = 0;
      for (const m of matches) {
        await db.delete(schema.cardForecasts).where(eq(schema.cardForecasts.id, m.id));
        deleted++;
      }
      const remainingRows = await db.select().from(schema.cardForecasts);
      if (deleted > 0) ctx.invalidateQueries();
      return { ok: true as const, deleted, remaining: remainingRows.length };
    },
  }),

  inspectSalesEvidence: defineAction({
    request: z.object({ certs: z.array(z.string()).optional(), ids: z.array(z.number()).optional(), simulateBacktest: z.boolean().optional() }),
    response: inspectSalesEvidenceResponse,
    async handler(ctx, args): Promise<z.infer<typeof inspectSalesEvidenceResponse>> {
      const db = ctx.db<typeof schema>();
      const today = new Date().toISOString().slice(0, 10);
      const allRows = await db.select().from(schema.salesEvidence);
      const sortedRows = [...(allRows as any[])].sort((a, b) => (a.id as number) - (b.id as number));
      const toPlain = (r: any): ForecastSale => ({ cardCert: r.cardCert as string, saleDate: r.saleDate as string, price: r.price as number, source: r.source as string, description: (r.description as string) ?? "", verified: r.verified !== 0 });
      const certFilter = args.certs ? new Set(args.certs) : null;
      const rows = sortedRows.filter((r) => !certFilter || certFilter.has(r.cardCert as string)).map((r) => {
        const desc = (r.description as string) ?? "";
        return { id: r.id as number, cardCert: r.cardCert as string, saleDate: r.saleDate as string, price: r.price as number, source: r.source as string, verified: r.verified !== 0, descLength: desc.length, hasUrl: desc.includes("http"), isComp: isForecastComp(toPlain(r)) };
      });
      const idSet = args.ids ? new Set(args.ids) : null;
      const fullRows = idSet ? sortedRows.filter((r) => idSet.has(r.id as number)).map((r) => {
        const desc = (r.description as string) ?? "";
        return { id: r.id as number, cardCert: r.cardCert as string, saleDate: r.saleDate as string, price: r.price as number, source: r.source as string, verified: r.verified !== 0, description: desc, isComp: isForecastComp(toPlain(r)) };
      }) : [];
      const cardRows = await db.select().from(schema.cards);
      const active = (cardRows as any[]).filter((r) => r.status === "active");
      const compsByCertFull = new Map<string, { id: number; date: string; price: number }[]>();
      for (const r of sortedRows) {
        if (!isForecastComp(toPlain(r))) continue;
        const arr = compsByCertFull.get(r.cardCert as string) ?? [];
        arr.push({ id: r.id as number, date: r.saleDate as string, price: r.price as number });
        compsByCertFull.set(r.cardCert as string, arr);
      }
      const certList: string[] = args.certs ? [...args.certs] : active.map((c) => c.cert as string);
      const perCert = certList.map((cert) => {
        const entries = compsByCertFull.get(cert) ?? [];
        const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
        const compIds = entries.map((e) => e.id).sort((a, b) => a - b);
        const comps = sortedEntries.map((e) => ({ date: e.date, price: e.price }));
        const computed = fcCompute(comps, today);
        let basisN: number;
        if (computed) {
          basisN = computed[0]?.basisN ?? comps.length;
        } else {
          const winStart = fcAddDays(today, -180);
          basisN = comps.filter((c) => c.date <= today && c.date > winStart).length;
        }
        const latestCompDate = entries.length ? ([...entries.map((e) => e.date)].sort().slice(-1)[0] ?? null) : null;
        return { cert, compIds, basisN, eligible: computed != null, confidence: computed ? (computed[0]?.confidence ?? null) : null, liquidity: computed ? (computed[0]?.liquidity ?? null) : null, latestCompDate };
      });
      let backtestSimulation: z.infer<typeof inspectBacktestOut> | null = null;
      if (args.simulateBacktest) {
        const compsByCert = new Map<string, { date: string; price: number }[]>();
        for (const r of sortedRows) {
          const plain = toPlain(r);
          if (!isForecastComp(plain)) continue;
          const arr = compsByCert.get(plain.cardCert) ?? [];
          arr.push({ date: plain.saleDate, price: plain.price });
          compsByCert.set(plain.cardCert, arr);
        }
        for (const arr of compsByCert.values()) arr.sort((a, b) => a.date.localeCompare(b.date));
        let seededForecasts = 0;
        let inRangeCount = 0;
        const btPerCert: { cert: string; seeded: number; inRange: number }[] = [];
        for (const c of active) {
          const cert = c.cert as string;
          const comps = compsByCert.get(cert) ?? [];
          if (comps.length < 6) continue;
          let seeded = 0;
          let inRange = 0;
          const dates = [...new Set(comps.map((x) => x.date))].sort();
          for (let j = 1; j < dates.length; j++) {
            const issuedAt = dates[j - 1]!;
            const computed = fcCompute(comps.filter((x) => x.date < dates[j]!), issuedAt);
            if (!computed) continue;
            for (const f of computed) {
              const horizonDate = fcAddDays(issuedAt, f.horizonDays);
              const realized = comps.find((x) => x.date >= horizonDate);
              if (!realized) continue;
              seeded++;
              if (realized.price >= f.rangeLow && realized.price <= f.rangeHigh) inRange++;
            }
          }
          btPerCert.push({ cert, seeded, inRange });
          seededForecasts += seeded;
          inRangeCount += inRange;
        }
        const gradedForecasts = seededForecasts;
        const inRangePct = gradedForecasts ? Math.round((inRangeCount / gradedForecasts) * 1000) / 10 : null;
        backtestSimulation = { seededForecasts, gradedForecasts, inRangeCount, inRangePct, perCert: btPerCert };
      }
      return { ok: true as const, rows, fullRows, perCert, backtestSimulation };
    },
  }),

  dedupeSalesEvidence: defineAction({
    request: z.object({ dryRun: z.boolean(), groups: z.array(z.object({ keepId: z.number(), deleteIds: z.array(z.number()).min(1).max(30) })).min(1).max(25), allowAggregatorGroups: z.boolean().optional() }),
    response: dedupeSalesEvidenceResponse,
    async handler(ctx, args): Promise<z.infer<typeof dedupeSalesEvidenceResponse>> {
      const db = ctx.db<typeof schema>();
      const allRows = await db.select().from(schema.salesEvidence);
      const salesBefore = allRows.length;
      const byId = new Map<number, any>();
      for (const r of allRows as any[]) byId.set(r.id as number, r);
      // Verification — ALL groups BEFORE deleting anything.
      const seen = new Map<number, number>();
      for (let gi = 0; gi < args.groups.length; gi++) {
        const g = args.groups[gi]!;
        const idsInGroup = [g.keepId, ...g.deleteIds];
        for (const id of idsInGroup) {
          if (seen.has(id)) {
            return { ok: false, error: `Row id ${id} appears in more than one group or in both keepId and deleteIds (first seen in group ${seen.get(id)}, again in group ${gi}).`, groupIndex: gi };
          }
          seen.set(id, gi);
        }
      }
      for (let gi = 0; gi < args.groups.length; gi++) {
        const g = args.groups[gi]!;
        for (const id of [g.keepId, ...g.deleteIds]) {
          if (!byId.has(id)) {
            return { ok: false, error: `Row id ${id} does not exist in sales_evidence.`, groupIndex: gi };
          }
        }
      }
      for (let gi = 0; gi < args.groups.length; gi++) {
        const g = args.groups[gi]!;
        const keeper = byId.get(g.keepId);
        for (const deleteId of g.deleteIds) {
          const row = byId.get(deleteId);
          if (row.cardCert !== keeper.cardCert || row.price !== keeper.price || row.saleDate !== keeper.saleDate || row.verified !== keeper.verified) {
            return { ok: false, error: `Row id ${deleteId} does not share the identical duplicate signature (cardCert, price, saleDate, verified) with keeper id ${g.keepId}.`, groupIndex: gi };
          }
        }
      }
      const protectedNeedles = ["owner-kept", "aggregator", "estimate", "market context", "market asks", "seller-reported", "no new verified source", "sports card investor", "cardtrack", "private sale"];
      /* Aggregator-class opt-in (Remedies pass 1, item 1c — the owner
         reserved these groups in the first dedupe and has now said
         to work through the wrinkles): when allowAggregatorGroups is
         set, the aggregator-class needles ("aggregator", "sports
         card investor", "cardtrack") are waived for a group ONLY
         when EVERY row in it is aggregator-sourced (aggregator /
         PriceCharting / CardTrack / Sports Card Investor language in
         source or description) AND no row carries kept-value
         language. Every other protected class (owner-kept, estimate,
         market context, market asks, seller-reported, private sale,
         "no new verified source") stays refused even under the
         opt-in. */
      const aggregatorWaivable = ["aggregator", "sports card investor", "cardtrack"];
      const keptLanguageNeedles = ["owner-kept", "owner kept", "owner-confirmed", "owner value kept", "kept value", "not overridden"];
      const rowText = (row: any): string => `${(row.source as string) ?? ""} ${((row.description as string) ?? "")}`.toLowerCase();
      const isAggregatorClass = (row: any): boolean => ["aggregator", "pricecharting", "cardtrack", "sports card investor"].some((n) => rowText(row).includes(n));
      const groupAggregatorOk = (g: { keepId: number; deleteIds: number[] }): boolean => {
        if (!args.allowAggregatorGroups) return false;
        const rowsInGroup = [g.keepId, ...g.deleteIds].map((id) => byId.get(id));
        if (rowsInGroup.some((r) => !r)) return false;
        if (!rowsInGroup.every(isAggregatorClass)) return false;
        return rowsInGroup.every((row) => !keptLanguageNeedles.some((n) => rowText(row).includes(n)));
      };
      for (let gi = 0; gi < args.groups.length; gi++) {
        const g = args.groups[gi]!;
        const waived = groupAggregatorOk(g);
        for (const id of [g.keepId, ...g.deleteIds]) {
          const row = byId.get(id);
          const src = ((row.source as string) ?? "").toLowerCase();
          const hit = protectedNeedles.find((n) => src.includes(n) && !(waived && aggregatorWaivable.includes(n)));
          if (hit) {
            return { ok: false, error: `Row id ${id} is in a protected class (source contains "${hit}") and is never deleted by this action.`, groupIndex: gi };
          }
        }
      }
      const cardRows = await db.select().from(schema.cards);
      const cardByCert = new Map<string, any>();
      for (const c of cardRows as any[]) cardByCert.set(c.cert as string, c);
      // Official-value guard (the kept-value guard's successor — the
      // lock system was removed Oct 14, 2026, so this now protects
      // EVERY card): a group whose keeper row is priced exactly at
      // the card's current official value is refused — that row is
      // the value-bearing comp and must not be deduped away.
      for (let gi = 0; gi < args.groups.length; gi++) {
        const g = args.groups[gi]!;
        const keeper = byId.get(g.keepId);
        const card = cardByCert.get(keeper.cardCert as string);
        if (card) {
          const eff = effectiveOf(card);
          if (eff != null && (keeper.price as number) === eff) {
            return { ok: false, error: `Group for cert ${keeper.cardCert} is priced at the card's official value ($${eff}) and is refused by the official-value guard.`, groupIndex: gi };
          }
        }
      }
      if (args.dryRun) {
        const groupsOut = args.groups.map((g) => {
          const keeper = byId.get(g.keepId);
          return { keepId: g.keepId, deleteIds: [...g.deleteIds], cert: keeper.cardCert as string, price: keeper.price as number, saleDate: keeper.saleDate as string };
        });
        const totalToDelete = args.groups.reduce((s, g) => s + g.deleteIds.length, 0);
        return { ok: true, dryRun: true, salesBefore, groups: groupsOut, totalToDelete };
      }
      const deletedIds = args.groups.flatMap((g) => [...g.deleteIds]).sort((a, b) => a - b);
      for (const id of deletedIds) {
        await db.delete(schema.salesEvidence).where(eq(schema.salesEvidence.id, id));
      }
      const afterRows = await db.select().from(schema.salesEvidence);
      const salesAfter = afterRows.length;
      const summary = `Evidence dedupe (manual audit action): removed ${deletedIds.length} duplicate sales_evidence rows across ${args.groups.length} groups (kept one canonical row per group). Sales evidence rows before: ${salesBefore}, after: ${salesAfter}. Deleted ids: ${deletedIds.join(", ")}.${args.allowAggregatorGroups ? " Aggregator-class duplicate groups were deleted under the explicit opt-in (Remedies pass 1, item 1c): every row in those groups is aggregator-sourced and carries no kept-value language; all other protected classes stayed refused." : ""} No official or forecast values were changed by this action.`;
      await db.insert(schema.refreshLogs).values({ summary, cardsChecked: 0 });
      ctx.invalidateQueries();
      return { ok: true, dryRun: false, deletedTotal: deletedIds.length, deletedIds, salesBefore, salesAfter };
    },
  }),

  /* ——— Kept-value evidence exclusion (Remedies pass 1, Oct 13, 2026
     — item 1b) ———
     Some sales_evidence rows record the owner's OWNER-KEPT values, not
     market sales: every daily refresh re-files the kept figure as
     context, and several of those filings carry verified=1, so they
     pass the forecast classifier (isForecastComp) and feed the Pump
     Detector's verified set (a card's "median comp" WAS its kept value). This action excludes them WITHOUT deleting history:
     each listed row is re-verified at write time — cert must be one
     of the kept-value certs, price must equal that cert's kept value
     (the kept-value certs and their kept figures), and source or
     description must carry kept-value language — then verified is
     set to 0 (the same exclusion flag the classifier, pump detector,
     verified averages and chart series already honor for seller-reported
     prints) and the source label is normalized to the
     "Owner-kept value — context only (not a market comp)" prefix,
     preserving the original label after it. ANY mismatch refuses
     the whole call atomically — nothing is written. Finally, open
     live forecasts for the affected certs are marked SUPERSEDED:
     they were computed with these rows in their basis, and a
     superseded forecast counts as neither a hit nor a miss; the
     next refresh re-issues on the corrected basis (item 1d).
     NOTE (Oct 14, 2026): the lock system itself has since been
     REMOVED — no card is kept/locked anymore. This action remains
     only as historical-record classification: rows filed while the
     locks existed stay non-comps forever; nothing new can match
     its signature because refreshes no longer file kept values. */
  excludeKeptValueEvidence: defineAction({
    request: z.object({ ids: z.array(z.number()).min(1).max(40) }),
    response: excludeKeptValueResponse,
    async handler(ctx, args): Promise<z.infer<typeof excludeKeptValueResponse>> {
      const KEPT_BY_CERT: Record<string, number> = {}; // Demo export: no owner-kept certs (the lock system was removed); the signature re-check below therefore matches nothing here.
      const KEPT_NEEDLES = ["owner-kept", "owner kept", "owner-confirmed", "owner value kept", "kept value", "not overridden"];
      const PREFIX = "Owner-kept value — context only (not a market comp)";
      const db = ctx.db<typeof schema>();
      const allRows = await db.select().from(schema.salesEvidence);
      const byId = new Map<number, any>();
      for (const r of allRows as any[]) byId.set(r.id as number, r);
      // Signature re-check — EVERY row, before writing anything.
      const failedIds: number[] = [];
      const targets: any[] = [];
      for (const id of args.ids) {
        const r = byId.get(id);
        if (!r) { failedIds.push(id); continue; }
        const kept = KEPT_BY_CERT[r.cardCert as string];
        const text = `${(r.source as string) ?? ""} ${((r.description as string) ?? "")}`.toLowerCase();
        if (kept == null || (r.price as number) !== kept || !KEPT_NEEDLES.some((n) => text.includes(n))) { failedIds.push(id); continue; }
        targets.push(r);
      }
      if (failedIds.length > 0) {
        return { ok: false, error: `Signature re-check failed for ${failedIds.length} row(s) — nothing was changed. Each row must sit on a kept-value cert (no kept-value certs are on file in this export), be priced exactly at that kept value, and carry kept-value language in its source or description.`, failedIds };
      }
      const affectedCerts = new Set<string>();
      for (const r of targets) {
        const oldSource = (r.source as string) ?? "";
        let newSource = oldSource;
        if (!oldSource.startsWith(PREFIX)) {
          newSource = oldSource.startsWith("Owner-kept value — context only")
            ? PREFIX + oldSource.slice("Owner-kept value — context only".length)
            : `${PREFIX} — ${oldSource}`;
        }
        await db.update(schema.salesEvidence).set({ verified: 0, source: newSource }).where(eq(schema.salesEvidence.id, r.id));
        affectedCerts.add(r.cardCert as string);
      }
      let supersededForecasts = 0;
      try {
        const fcRows = await db.select().from(schema.cardForecasts);
        for (const f of fcRows as any[]) {
          if (f.origin === "live" && f.status === "open" && affectedCerts.has(f.cert as string)) {
            await db.update(schema.cardForecasts).set({ status: "superseded" }).where(eq(schema.cardForecasts.id, f.id));
            supersededForecasts++;
          }
        }
      } catch { /* forecasts table just migrated */ }
      const afterRows = await db.select().from(schema.salesEvidence);
      const summary = `Kept-value evidence exclusion (Remedies pass 1, Oct 13, 2026 — manual audit action): ${targets.length} sales_evidence rows recording owner-kept values (from the removed lock system) were marked verified=false and their source labels normalized to the "${PREFIX}" prefix, so they no longer enter the forecast classifier, the Pump Detector's verified set, verified averages, or chart series. Rows and narrative text preserved — nothing deleted. ${supersededForecasts} open live forecast(s) computed on the old basis were marked superseded (counted as neither hits nor misses); the next refresh re-issues on the corrected basis. Excluded ids: ${targets.map((r: any) => r.id as number).join(", ")}.`;
      await db.insert(schema.refreshLogs).values({ summary, cardsChecked: 0 });
      ctx.invalidateQueries();
      return { ok: true, updated: targets.length, supersededForecasts, salesTotal: afterRows.length };
    },
  }),
} satisfies ActionsModule;

function eqId(id: number) { return eq(schema.cards.id, id); }
