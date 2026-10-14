import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SafeAreaTopScrim, fileToBase64 } from "@hatch/space-sdk/client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, type ApiResponse } from "./api";

type Portfolio = ApiResponse<typeof api, "getPortfolio">;
type Card = Portfolio["cards"][number];
type Scout = Portfolio["scouts"][number];
type Deal = Portfolio["deals"][number];
type WatchItem = Portfolio["watchlist"][number];
type Sweep = Portfolio["sweeps"][number];
type Listing = Portfolio["listings"][number];
type TerminalItem = Portfolio["terminal"][number];
type ScanResult = ApiResponse<typeof api, "scanSlabPhoto">;

const fmt = (n: number | null | undefined) => n == null ? "—" : "$" + n.toLocaleString("en-US", { maximumFractionDigits: n % 1 === 0 ? 0 : 2 });
const pct = (n: number) => n.toFixed(1) + "%";
/* Liveness freshness: every live finding carries the timestamp of its
   last successful liveness check (capture-time check, then re-verified
   every 2-hourly sweep). Rendered on every finding card so the owner can see
   nothing shown as live is stale. */
/* Forecast basis dates arrive as ISO dates (YYYY-MM-DD) — render
   them the way the forecast basis line reads: "last Oct 10". */
function fmtFcDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtVerifiedLive(ts: string | null | undefined): string {
  if (!ts) return "⚠ Never positively verified live — unverified until a check gets through";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return `Last verified live ${ts}`;
  const when = d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const ageH = (Date.now() - d.getTime()) / 3600000;
  if (ageH > 30) return `⚠ Last verified live ${when} — verification STALE (over 30h without a positive check)`;
  return "✓ Last verified live " + when;
}

/* PicClick is NOT SERVED (Oct 9, 2026 — the owner: every PicClick link was
   broken). The server withholds PicClick findings (passed=1) and
   discards PicClick candidates at capture; this client check is the
   second lock — any row whose listing URL is on a picclick.* domain
   (any TLD / subdomain) or whose marketplace is PicClick renders
   nowhere, and every count on the page is computed from the filtered
   sets below, so counts always match what actually renders. */
function isPicClickUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try { return new URL(url).hostname.toLowerCase().split(".").includes("picclick"); } catch { return /(^|[/.:-])picclick\./i.test(url); }
}
function isPicClickEntry(x: { listingUrl?: string | null; marketplace?: string }): boolean {
  return isPicClickUrl(x.listingUrl) || (x.marketplace ?? "").toLowerCase().includes("picclick");
}

/* Canonical listing identity (Oct 12, 2026): the same listing comes
   back from sweeps under re-parameterized URLs (eBay tracking params,
   regional hosts). Trenches dedupes deal + listing twins by this key
   so one listing never renders as two firehose cards; the server
   applies the same key to pass / Closed-Ended / dedupe enforcement. */
function canonListingKey(url: string | null | undefined): string {
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

function callColor(call: string) {
  if (call.includes("SELL")) return "var(--sell)";
  if (call.includes("TRIM")) return "var(--trim)";
  return "var(--hold)";
}

/* Every price carries a source TYPE — see the registry at the bottom. */
function saleType(s: { verified: boolean; source: string; description: string }): { label: string; color: string } {
  if (!s.verified) return { label: "Seller-reported / UNVERIFIED", color: "var(--sell)" };
  const t = (s.source + " " + s.description).toLowerCase();
  if (t.includes("ask")) return { label: "Active listing / ask", color: "var(--ask-text)" };
  if (t.includes("estimate") || t.includes("cardtrack") || t.includes("pricecharting") || t.includes("context")) return { label: "Aggregator value", color: "var(--accent-ink)" };
  return { label: "Verified sold comp", color: "var(--hold)" };
}
function registryTypeColor(t: string): string {
  if (t.includes("Verified sold")) return "var(--hold)";
  if (t.includes("Aggregator")) return "var(--accent-ink)";
  if (t.includes("listing")) return "var(--ask-text)";
  if (t.includes("Cert")) return "var(--cert-text)";
  return "var(--sell)";
}

const SCOUT_COLORS: Record<string, string> = { gengar: "#8b7fd4", pikachu: "#e8bc63", eevee: "#57b08a", snorlax: "#7a9cc6", rocket: "#d43a2f" };

/* Demo export: no owner-kept (locked) certs. The private deployment
   locks specific certs at owner-confirmed values via this list; it
   ships empty here, so every value in the demo floats to comps. */
const OWNER_KEPT_CERTS_CLIENT: string[] = [];

/* ——— Original pixel-art scout sprites ———
   Little characters drawn from plain SVG rects in the same pixel style as
   the town (crispEdges, flat colours, no official art or game sprites):
   a purple ghost with a cheeky grin, a yellow mouse with long ears and a
   lightning tail, a brown fox with big ears and a cream ruff, and a big
   blue-green sleepy bear. The walk cycle is a 2-frame bob in CSS. */
function PixelSprite({ scoutId, size = 52 }: { scoutId: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 32 32", shapeRendering: "crispEdges" as const, "aria-hidden": true, focusable: "false" as const, className: "pixel-sprite" };
  if (scoutId === "pikachu") return (
    <svg {...common}>
      <rect x="3" y="1" width="4" height="4" fill="#1c1c1c" /><rect x="4" y="5" width="3" height="7" fill="#f7d038" />
      <rect x="25" y="1" width="4" height="4" fill="#1c1c1c" /><rect x="25" y="5" width="3" height="7" fill="#f7d038" />
      <rect x="9" y="8" width="14" height="12" fill="#f7d038" />
      <rect x="12" y="13" width="2" height="3" fill="#1c1c1c" /><rect x="18" y="13" width="2" height="3" fill="#1c1c1c" />
      <rect x="9" y="16" width="3" height="3" fill="#e0483e" /><rect x="20" y="16" width="3" height="3" fill="#e0483e" />
      <rect x="15" y="17" width="2" height="1" fill="#1c1c1c" />
      <rect x="10" y="20" width="12" height="6" fill="#f7d038" /><rect x="13" y="20" width="6" height="2" fill="#c98f2b" />
      <rect x="22" y="19" width="3" height="3" fill="#f7d038" /><rect x="25" y="16" width="3" height="3" fill="#f7d038" /><rect x="27" y="13" width="3" height="3" fill="#f7d038" />
      <rect x="9" y="26" width="5" height="2" fill="#f7d038" /><rect x="18" y="26" width="5" height="2" fill="#f7d038" />
    </svg>
  );
  if (scoutId === "eevee") return (
    <svg {...common}>
      <rect x="4" y="2" width="5" height="12" fill="#8a5a2b" /><rect x="5" y="2" width="3" height="4" fill="#5e3a17" />
      <rect x="23" y="2" width="5" height="12" fill="#8a5a2b" /><rect x="24" y="2" width="3" height="4" fill="#5e3a17" />
      <rect x="9" y="9" width="14" height="11" fill="#b7793c" />
      <rect x="12" y="13" width="2" height="3" fill="#1c1c1c" /><rect x="18" y="13" width="2" height="3" fill="#1c1c1c" />
      <rect x="15" y="16" width="2" height="2" fill="#1c1c1c" />
      <rect x="8" y="19" width="16" height="2" fill="#f6ead0" /><rect x="10" y="21" width="3" height="2" fill="#f6ead0" /><rect x="15" y="21" width="3" height="2" fill="#f6ead0" /><rect x="20" y="21" width="3" height="2" fill="#f6ead0" />
      <rect x="10" y="23" width="11" height="5" fill="#b7793c" />
      <rect x="21" y="21" width="7" height="6" fill="#b7793c" /><rect x="25" y="21" width="3" height="3" fill="#f6ead0" />
      <rect x="10" y="28" width="4" height="2" fill="#8a5a2b" /><rect x="17" y="28" width="4" height="2" fill="#8a5a2b" />
    </svg>
  );
  if (scoutId === "gengar") return (
    <svg {...common}>
      <rect x="8" y="5" width="3" height="5" fill="#6a4c9c" /><rect x="15" y="3" width="3" height="6" fill="#6a4c9c" /><rect x="21" y="5" width="3" height="5" fill="#6a4c9c" />
      <rect x="6" y="9" width="20" height="16" fill="#6a4c9c" /><rect x="9" y="7" width="14" height="3" fill="#6a4c9c" />
      <rect x="3" y="15" width="4" height="5" fill="#6a4c9c" /><rect x="25" y="15" width="4" height="5" fill="#6a4c9c" />
      <rect x="10" y="13" width="4" height="3" fill="#e0483e" /><rect x="18" y="13" width="4" height="3" fill="#e0483e" />
      <rect x="11" y="14" width="2" height="1" fill="#ffffff" /><rect x="19" y="14" width="2" height="1" fill="#ffffff" />
      <rect x="10" y="19" width="12" height="3" fill="#ffffff" /><rect x="13" y="19" width="1" height="3" fill="#6a4c9c" /><rect x="18" y="19" width="1" height="3" fill="#6a4c9c" />
      <rect x="8" y="25" width="6" height="3" fill="#5b3f88" /><rect x="18" y="25" width="6" height="3" fill="#5b3f88" />
    </svg>
  );
  if (scoutId === "rocket") return (
    /* Team Rocket grunt — black cap with the red R, dark uniform, smirk.
       Original pixel figure; the R is drawn as pixels, not a logo asset. */
    <svg {...common}>
      <rect x="8" y="3" width="16" height="4" fill="#23232b" /><rect x="6" y="7" width="20" height="2" fill="#23232b" />
      <rect x="13" y="3" width="2" height="4" fill="#d43a2f" /><rect x="15" y="3" width="3" height="2" fill="#d43a2f" /><rect x="15" y="5" width="2" height="2" fill="#d43a2f" /><rect x="17" y="6" width="2" height="2" fill="#d43a2f" />
      <rect x="9" y="9" width="14" height="9" fill="#e8b98d" />
      <rect x="9" y="9" width="14" height="2" fill="#3a2a20" />
      <rect x="11" y="13" width="3" height="2" fill="#1c1c1c" /><rect x="18" y="13" width="3" height="2" fill="#1c1c1c" />
      <rect x="17" y="16" width="5" height="1" fill="#1c1c1c" /><rect x="21" y="15" width="1" height="1" fill="#1c1c1c" />
      <rect x="8" y="18" width="16" height="8" fill="#2b2b33" />
      <rect x="14" y="18" width="4" height="3" fill="#d43a2f" />
      <rect x="5" y="19" width="3" height="6" fill="#2b2b33" /><rect x="24" y="19" width="3" height="6" fill="#2b2b33" />
      <rect x="5" y="25" width="3" height="2" fill="#e8e8f0" /><rect x="24" y="25" width="3" height="2" fill="#e8e8f0" />
      <rect x="9" y="26" width="5" height="4" fill="#23232b" /><rect x="18" y="26" width="5" height="4" fill="#23232b" />
    </svg>
  );
  /* snorlax — big blue-green sleepy bear */
  return (
    <svg {...common}>
      <rect x="9" y="2" width="4" height="4" fill="#2f6f6e" /><rect x="19" y="2" width="4" height="4" fill="#2f6f6e" />
      <rect x="9" y="5" width="14" height="8" fill="#2f6f6e" /><rect x="11" y="6" width="10" height="7" fill="#f2e6c8" />
      <rect x="12" y="9" width="3" height="1" fill="#1c1c1c" /><rect x="17" y="9" width="3" height="1" fill="#1c1c1c" />
      <rect x="15" y="11" width="2" height="1" fill="#1c1c1c" />
      <rect x="5" y="13" width="22" height="13" fill="#2f6f6e" />
      <rect x="10" y="15" width="12" height="10" fill="#f2e6c8" />
      <rect x="3" y="17" width="3" height="6" fill="#2f6f6e" /><rect x="26" y="17" width="3" height="6" fill="#2f6f6e" />
      <rect x="6" y="26" width="7" height="3" fill="#f2e6c8" /><rect x="19" y="26" width="7" height="3" fill="#f2e6c8" />
    </svg>
  );
}

function ScoutAvatar({ scout, size = 44 }: { scout?: Scout; size?: number }) {
  if (!scout) return null;
  const c = SCOUT_COLORS[scout.scoutId] ?? "var(--accent)";
  return (
    <div aria-hidden className="shrink-0 rounded-full flex items-center justify-center relative overflow-visible" style={{ width: size, height: size, background: `radial-gradient(circle at 32% 28%, ${c}55, ${c}22 60%, rgba(0,0,0,0.35))`, border: `1.5px solid ${c}` }}>
      <PixelSprite scoutId={scout.scoutId} size={size * 0.92} />
      <span className="scout-dot absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full" style={{ background: "var(--hold)", border: "2px solid var(--bg)" }} />
    </div>
  );
}

/* ——— Watchlist live-search links ———
   Genuine marketplace SEARCH pages built from a curated query per theme.
   These are search URLs, never fabricated listing URLs: they open the
   marketplace's own live results for that card/theme in a new tab. */
const WATCH_SEARCH_QUERIES: [string, string][] = [
  ["Mew Star (Gold Star)", "Pokemon World Championship 2008 Mew Star Gold Star silver border"],
  ["Latias Star (Gold Star)", "Pokemon World Championship 2006 Latias Star silver border"],
  ["Lugia ex · 2006", "Pokemon World Championship 2006 Lugia ex silver border"],
  ["Jolteon Star · 2008", "Pokemon World Championship 2008 Jolteon Star silver border"],
  ["Jolteon Star · 2007", "Pokemon World Championship 2007 Jolteon Star silver border"],
  ["Umbreon ex · 2006", "Pokemon World Championship 2006 Umbreon ex silver border"],
  ["Rayquaza ex", "Pokemon World Championship 2007 Rayquaza ex delta silver border"],
  ["Deoxys ex · 2006", "Pokemon World Championship 2006 Deoxys ex silver border"],
  ["Jirachi · 2005", "Pokemon World Championship 2005 Jirachi silver border"],
  ["Unpeeled Sheets · Series 1", "Japanese Pokemon Vending Series 1 unpeeled sheet"],
  ["Unpeeled Sheets · Series 2", "Japanese Pokemon Vending Series 2 unpeeled sheet"],
  ["Unpeeled Sheets · Series 3", "Japanese Pokemon Vending Series 3 unpeeled sheet"],
  ["Ooyama's Pikachu", "Ooyama's Pikachu Vending Series 3 Japanese"],
  ["Snorlax (Glossy)", "Japanese Pokemon Vending Series 1 Snorlax glossy"],
  ["Clean Glossy Singles", "Japanese Pokemon Vending Series glossy single Pikachu Eevee Porygon"],
  ["30th Anniversary", "Pokemon 30th Anniversary set sealed"],
  ["Mega Venusaur", "Mega Venusaur ex SAR Japanese PSA 10"],
  ["Mega Lucario", "Mega Lucario ex SAR Japanese PSA 10"],
  ["Japanese 151 Art Rare", "Pokemon 151 Japanese Bulbasaur 166 Charmander 168 Squirtle 170 art rare PSA 10"],
  ["English 151 Second-Tier", "Pokemon 151 Bulbasaur 166 Squirtle 170 illustration rare"],
  ["Sword & Shield Sealed", "Pokemon Lost Origin Brilliant Stars Silver Tempest booster box sealed"],
  ["Yu Nagaba", "Yu Nagaba Eeveelution promo PSA 9"],
  ["LV.X PSA 9 Lag", "Pokemon LV.X PSA 9"],
  ["Southern Islands", "Pokemon Southern Islands PSA 9"],
  ["e-Series Crystals", "Pokemon Crystal Aquapolis Skyridge holo PSA"],
  ["HGSS Primes", "Pokemon HeartGold SoulSilver Prime PSA"],
  ["Stamped Reverse", "Pokemon EX Delta Species stamped reverse holo"],
  ["XY Secret", "Pokemon XY secret rare PSA 9"],
  ["Sun & Moon Mid-Modern", "Cosmic Eclipse Blastoise Piplup GX alt art"],
  ["Giratina V Alt", "Giratina V alt art Lost Origin PSA 10"],
  ["Mega Gengar ex SIR", "Mega Gengar ex special illustration rare PSA 10"],
  ["Umbreon ex SIR", "Umbreon ex SIR Prismatic Evolutions"],
  ["Charizard ex SIR", "Charizard ex SIR Pokemon 151"],
];
function watchSearchLink(w: WatchItem, scout?: Scout): { label: string; url: string; marketplace: string } {
  const hit = WATCH_SEARCH_QUERIES.find(([k]) => w.name.includes(k));
  const fallback = w.name.split("—")[0]?.replace(/\([^)]*\)/g, "").trim() ?? w.name;
  const queryText = hit ? hit[1] : fallback;
  const q = encodeURIComponent(queryText);
  /* Vending Series: Eevee hunts Japanese marketplaces (Yahoo Japan /
     Mercari / eBay JP sellers). The link opens the eBay search for the
     Japanese vending terms — JP sellers surface there — and is captioned
     as a Japanese-listings search; comps still must come from confirmed
     Japanese sales, never from this ask page alone. */
  if (w.kind === "vending") return { marketplace: "eBay (JP sellers)", label: "Search Japanese vending listings on eBay ↗", url: `https://www.ebay.com/sch/i.html?_nkw=${q}` };
  if (scout?.scoutId === "pikachu") return { marketplace: "TCGplayer", label: "Search live listings on TCGplayer ↗", url: `https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&q=${q}` };
  return { marketplace: "eBay", label: "Search live listings on eBay ↗", url: `https://www.ebay.com/sch/i.html?_nkw=${q}` };
}

/* ——— TIME-OF-DAY CYCLE ———
   The town lives on the VIEWER'S local clock (browser timezone, so it
   travels with the owner): Night 7pm–5am, Dawn 5–7am, Morning 7–11am,
   Midday 11am–4pm, Golden hour 4–6pm, Dusk 6–7pm, then Night again.
   At 7:06pm Pacific in October this resolves to Night. The phase drives
   the town's sky, celestial body, stars, window/lamp lighting and pond,
   plus a subtle panel edge/glow shift — panel surfaces themselves stay
   the same dark vault glass in every phase, so charts and tables read
   identically at noon and midnight. The phase is ALWAYS on Auto: it
   follows the viewer's local time with no manual override. */
type TodPhase = "night" | "dawn" | "morning" | "midday" | "golden" | "dusk";
function todPhaseFor(d: Date): TodPhase {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 19 || h < 5) return "night";
  if (h < 7) return "dawn";
  if (h < 11) return "morning";
  if (h < 16) return "midday";
  if (h < 18) return "golden";
  return "dusk";
}
const TOD_META: Record<TodPhase, { label: string; icon: string; blurb: string }> = {
  night: { label: "Night", icon: "🌙", blurb: "Windows glow amber, lamps are on, stars are out" },
  dawn: { label: "Dawn", icon: "🌅", blurb: "First light — lamps fading, sky warming" },
  morning: { label: "Morning", icon: "🌤️", blurb: "Bright morning light over the town" },
  midday: { label: "Midday", icon: "☀️", blurb: "Full daylight — vivid grass, bright pond" },
  golden: { label: "Golden hour", icon: "🌇", blurb: "Long warm light washing the town" },
  dusk: { label: "Dusk", icon: "🌆", blurb: "Orange-pink dusk — windows and lamps coming on" },
};
/* Panel ambience per phase: ONLY the edge tint + outer glow shift. The
   slab fill/text tokens never change, so data contrast is phase-proof. */
const TOD_PANEL: Record<TodPhase, { edge: string; glow: string }> = {
  night: { edge: "rgba(255,196,92,0.30)", glow: "rgba(255,170,60,0.10)" },
  dawn: { edge: "rgba(255,178,128,0.32)", glow: "rgba(255,160,90,0.08)" },
  morning: { edge: "rgba(160,220,255,0.24)", glow: "rgba(120,200,255,0.06)" },
  midday: { edge: "rgba(255,255,255,0.20)", glow: "rgba(140,210,255,0.05)" },
  golden: { edge: "rgba(255,166,66,0.36)", glow: "rgba(255,150,50,0.10)" },
  dusk: { edge: "rgba(255,128,120,0.32)", glow: "rgba(255,110,90,0.09)" },
};
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return reduced;
}

/* ——— Pixel-slab logo mark (Oct 9 top-bar redesign) ———
   An ORIGINAL small pixel-art graded-slab mark drawn from plain SVG
   rects (crispEdges, flat colours, no official art): a slab case with
   a cyan label bar, a cyan card window and a lemon star pixel.
   It is the LEFT zone brand mark of the desktop top bar, beside the
   "The Graded Vault" wordmark. Decorative only — the wordmark
   beside it carries the name in text. */
function PixelSlabLogo({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" shapeRendering="crispEdges" aria-hidden="true" focusable="false" className="shrink-0">
      <rect x="5" y="2" width="26" height="32" fill="#f4f0ff" />
      <rect x="5" y="2" width="26" height="3" fill="#2a1650" />
      <rect x="5" y="31" width="26" height="3" fill="#2a1650" />
      <rect x="5" y="2" width="3" height="32" fill="#2a1650" />
      <rect x="28" y="2" width="3" height="32" fill="#2a1650" />
      <rect x="8" y="5" width="20" height="5" fill="#01cdfe" />
      <rect x="10" y="7" width="9" height="1.6" fill="#2a1650" />
      <rect x="23" y="6.4" width="3.4" height="3.4" fill="#fffb96" />
      <rect x="9" y="13" width="18" height="14" fill="#01cfe8" />
      <rect x="9" y="13" width="18" height="3" fill="#b967ff" />
      <rect x="16" y="18" width="4" height="4" fill="#fffb96" />
      <rect x="17.4" y="16.6" width="1.2" height="7" fill="#fffb96" />
      <rect x="14.6" y="19.4" width="7" height="1.2" fill="#fffb96" />
      <rect x="11" y="29" width="14" height="1.6" fill="#b6aad4" />
    </svg>
  );
}

/* ——— Line glyphs (Glass Vault phase 2) ———
   SF-symbol-spirit stroke glyphs for the nav pills and the launcher
   medallions, replacing the stock emoji of phase 1. One stroke
   weight, currentColor, aria-hidden — every control's accessible
   name already carries the text. */
function GlyphSvg({ paths, size = 24 }: { paths: string[]; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {paths.map(d => <path key={d} d={d} />)}
    </svg>
  );
}
const NAV_GLYPHS: Record<string, string[]> = {
  home: ["M4 11.5 12 4l8 7.5", "M6.5 9.8V20h11V9.8"],
  deals: ["M13 2.5 4.8 13.5h6L9.6 21.5 19 10.5h-6.2L13 2.5Z"],
  vault: ["M5 4.5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z", "M4 9.5h16", "M10 14h4"],
  scouts: ["M8 4h8v4.5a4 4 0 0 1-8 0V4Z", "M8 5.5H5.2A3.2 3.2 0 0 0 8.4 9", "M16 5.5h2.8A3.2 3.2 0 0 1 15.6 9", "M12 12.5v3", "M8.8 20h6.4", "M12 15.5V20"],
  insights: ["M4 4v15.5h16", "M7 15l3.8-4.8 2.8 2.8L18.5 7", "M15.8 7h2.7v2.7"],
};
function NavGlyph({ id, size = 15 }: { id: string; size?: number }) {
  return <GlyphSvg paths={NAV_GLYPHS[id] ?? NAV_GLYPHS.home!} size={size} />;
}
const LAUNCHER_GLYPHS: Record<string, string[]> = {
  trenches: ["M12 3.2c.9 2.8-2.1 4.3-2.1 6.8a2.1 2.1 0 0 0 4.2.4c1-1.4-.3-2.5-.3-4.2 2.4 1.6 3.9 4.2 3.9 6.9a5.9 5.9 0 1 1-11.8 0c0-3.9 3.9-5.9 6.1-9.9Z"],
  ledger: ["M7 3.5h11A1.5 1.5 0 0 1 19.5 5v13A1.5 1.5 0 0 1 18 19.5H7Z", "M7 3.5A1.5 1.5 0 0 0 5.5 5v13A1.5 1.5 0 0 0 7 19.5", "M9.8 8.5H16", "M9.8 12h4.5"],
  market: ["M3.5 20.5h17", "M6.5 20.5v-7", "M12 20.5V5", "M17.5 20.5v-10"],
  collection: ["M6.5 3.5h11A1 1 0 0 1 18.5 4.5v15a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z", "M5.5 8.5h13", "M12 16.2a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z"],
  watch: ["M2.8 12S5.8 5.8 12 5.8 21.2 12 21.2 12 18.2 18.2 12 18.2 2.8 12 2.8 12Z", "M12 14.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6Z"],
  lineage: ["M10.2 13.8a4.2 4.2 0 0 0 6 .4l2.9-2.9a4.24 4.24 0 1 0-6-6l-1.6 1.6", "M13.8 10.2a4.2 4.2 0 0 0-6-.4l-2.9 2.9a4.24 4.24 0 1 0 6 6l1.6-1.6"],
  league: NAV_GLYPHS.scouts!,
  town: ["M3 12 7.5 7.2 12 12", "M5.2 10.3v8.2h4.6v-8.2", "M12.8 12 17 7.8l4.2 4.2", "M14.6 10.4v8.1h4.8v-6.4"],
  growth: NAV_GLYPHS.insights!,
  risk: ["M12 3l7 2.4v5.4c0 4.6-2.9 7.7-7 9.2-4.1-1.5-7-4.6-7-9.2V5.4L12 3Z", "M9.2 11.6l2 2 3.8-4"],
};
function LauncherGlyph({ id }: { id: string }) {
  return <GlyphSvg paths={LAUNCHER_GLYPHS[id] ?? LAUNCHER_GLYPHS.market!} size={26} />;
}

/* Compact town clock chip — ALWAYS on Auto (the viewer's local time;
   no manual override exists). Just the phase glyph + local time. The
   full phase name and description live in the tooltip (title) and the
   accessible label, so no information is lost. It is the FAR-RIGHT
   zone of the desktop top bar (logo/wordmark left, the five tabs in
   the middle, time + phase icon at the far right edge). This is the
   TOWN clock (world layer), separate from the vapor UI theme, which
   is likewise always Auto (prefers-color-scheme) with no in-app
   control. */
function TownClockChip({ now, phase }: { now: Date; phase: TodPhase }) {
  const meta = TOD_META[phase];
  const timeLabel = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  const fullLabel = `${meta.label}, ${timeLabel} — ${meta.blurb}`;
  return (
    <span role="img" aria-label={fullLabel} title={fullLabel}
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-bold border"
      style={{ borderColor: "var(--glass-edge)", color: "var(--text)", background: "var(--glass)" }}>
      <span aria-hidden className="text-sm leading-none">{meta.icon}</span>
      <span aria-hidden className="num" style={{ color: "var(--accent-ink)" }}>{timeLabel}</span>
    </span>
  );
}

/* ——— FULL-PAGE PIXEL TOWN BACKGROUND ———
   An ORIGINAL top-down pixel-art town drawn from plain SVG rects
   (crispEdges — no game map, tiles or sprites copied): pixel grass across
   the whole page, dirt paths running between sections, houses with
   red/orange roofs along the edges, a lab-like building, tree lines,
   picket fences, flower patches, wooden signs and a pond along the
   bottom-right edge. It is a FIXED backdrop: dashboard panels float over
   it on dark semi-opaque .slab surfaces, so the town stays visible in the
   page margins, between sections, and behind translucent panel edges. */
function TownHouse({ x, y, roof = "#d94f3d", scale = 1, windowFill = "#7ec8e3" }: { x: number; y: number; roof?: string; scale?: number; windowFill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x="0" y="10" width="64" height="6" fill="#b23a28" />
      <rect x="4" y="4" width="56" height="7" fill={roof} />
      <rect x="12" y="0" width="40" height="5" fill={roof} />
      <rect x="6" y="16" width="52" height="34" fill="#f6e7c8" />
      <rect x="12" y="22" width="10" height="10" fill={windowFill} /><rect x="12" y="22" width="10" height="2" fill="#8a5a2b" />
      <rect x="42" y="22" width="10" height="10" fill={windowFill} /><rect x="42" y="22" width="10" height="2" fill="#8a5a2b" />
      <rect x="27" y="32" width="10" height="18" fill="#8a5a2b" /><rect x="30" y="40" width="2" height="2" fill="#ffd94d" />
    </g>
  );
}
function TownTree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="10" y="24" width="6" height="12" fill="#7a4a21" />
      <rect x="2" y="10" width="22" height="16" fill="#2f8f4e" />
      <rect x="6" y="2" width="14" height="10" fill="#3aa657" />
      <rect x="0" y="18" width="26" height="10" fill="#267a41" />
      <rect x="6" y="8" width="4" height="4" fill="#57c06b" /><rect x="16" y="14" width="4" height="4" fill="#57c06b" />
    </g>
  );
}
/* Per-phase town palette: grass/dirt/pond bases (pre-wash), the lighting
   wash laid over the whole town, window & lamp glow strength, star and
   cloud treatment. The wash + lights layer is what sells night: at 7pm
   the town goes deep blue-green, windows/lamps pop warm on top of it,
   the pond turns dark and reflective, and stars come out. */
type TownPalette = { grass: string; grassAlt: string; blade: string; dirt: string; dirtEdge: string; dirtEdge2: string; pond: string; pondDeep: string; sparkle: number; wash: string; washOp: number; cloud: string; cloudOp: number; lampHead: string; lampGlow: number; windowGlow: number; starOp: number; celestialGlow: string };
const TOD_TOWN: Record<TodPhase, TownPalette> = {
  night:   { grass: "#4f7f3c", grassAlt: "#477437", blade: "#3a612c", dirt: "#a8895a", dirtEdge: "#8a6c3e", dirtEdge2: "#77592f", pond: "#2b5a7a", pondDeep: "#1d4258", sparkle: 0.5, wash: "#0a1433", washOp: 0.32, cloud: "#232c47", cloudOp: 0.55, lampHead: "#ffd97a", lampGlow: 0.85, windowGlow: 0.95, starOp: 0.95, celestialGlow: "rgba(190,210,255,0.35)" },
  dawn:    { grass: "#5da24b", grassAlt: "#549647", blade: "#47843c", dirt: "#dfc48d", dirtEdge: "#c3a26a", dirtEdge2: "#b08d55", pond: "#5ea9cf", pondDeep: "#3f97c4", sparkle: 0.35, wash: "#ff9a5e", washOp: 0.13, cloud: "#ffd9c4", cloudOp: 0.9, lampHead: "#ffe1a0", lampGlow: 0.45, windowGlow: 0.55, starOp: 0.22, celestialGlow: "rgba(255,190,120,0.4)" },
  morning: { grass: "#63ac4e", grassAlt: "#5aa344", blade: "#4c8c3a", dirt: "#e6cb95", dirtEdge: "#c8a566", dirtEdge2: "#b8935a", pond: "#57b6dd", pondDeep: "#3f97c4", sparkle: 0.3, wash: "#ffe9a8", washOp: 0.05, cloud: "#ffffff", cloudOp: 0.95, lampHead: "#cfd6da", lampGlow: 0, windowGlow: 0, starOp: 0, celestialGlow: "rgba(255,230,140,0.45)" },
  midday:  { grass: "#6ab257", grassAlt: "#61a84e", blade: "#53a047", dirt: "#eed49e", dirtEdge: "#cdae6b", dirtEdge2: "#bd9c5e", pond: "#57b6dd", pondDeep: "#3f97c4", sparkle: 0.3, wash: "#ffffff", washOp: 0, cloud: "#ffffff", cloudOp: 0.95, lampHead: "#cfd6da", lampGlow: 0, windowGlow: 0, starOp: 0, celestialGlow: "rgba(255,236,150,0.5)" },
  golden:  { grass: "#5f9c46", grassAlt: "#568e3f", blade: "#497d33", dirt: "#e9bd7c", dirtEdge: "#c99b52", dirtEdge2: "#b58540", pond: "#5f9fc4", pondDeep: "#3f7ea6", sparkle: 0.4, wash: "#ff8f2e", washOp: 0.16, cloud: "#ffc9a3", cloudOp: 0.95, lampHead: "#ffd9a0", lampGlow: 0.3, windowGlow: 0.5, starOp: 0, celestialGlow: "rgba(255,170,70,0.5)" },
  dusk:    { grass: "#4e8140", grassAlt: "#467438", blade: "#39602c", dirt: "#cda26a", dirtEdge: "#a87f47", dirtEdge2: "#93703a", pond: "#42648f", pondDeep: "#2c4a6e", sparkle: 0.45, wash: "#59306b", washOp: 0.24, cloud: "#e8a0b4", cloudOp: 0.8, lampHead: "#ffd97a", lampGlow: 0.75, windowGlow: 0.9, starOp: 0.5, celestialGlow: "rgba(255,140,100,0.45)" },
};
/* Deterministic star field (seeded by index math — same stars every load) */
const TOD_STARS = Array.from({ length: 80 }, (_, i) => ({ x: (i * 173 + 37) % 1440, y: (i * 89 + 13) % 860, s: i % 5 === 0 ? 4 : 2, o: 0.4 + ((i * 29) % 60) / 100 }));
/* Houses (shared by the base render and the night lights layer) */
const TOD_HOUSES: { x: number; y: number; roof?: string; scale?: number }[] = [
  { x: 36, y: 28 }, { x: 1240, y: 24, roof: "#e07b2a" }, { x: 30, y: 420, roof: "#e07b2a", scale: 0.95 }, { x: 1300, y: 430, scale: 0.95 }, { x: 180, y: 790, roof: "#c8402a", scale: 0.9 },
];
/* Path lamps beside the roads — posts in the base layer, glow on top of the wash */
const TOD_LAMPS: { x: number; y: number }[] = [{ x: 150, y: 106 }, { x: 430, y: 106 }, { x: 900, y: 106 }, { x: 1240, y: 106 }, { x: 150, y: 690 }, { x: 980, y: 690 }, { x: 640, y: 690 }];
const MOON_ROWS = [".XXX.", "XX...", "XX...", "XX...", ".XXX."];
const SUN_ROWS = [".XXX.", "XXXXX", "XXXXX", "XXXXX", ".XXX."];
function PixelGrid({ rows, x, y, px, color, opacity = 1 }: { rows: string[]; x: number; y: number; px: number; color: string; opacity?: number }) {
  return (
    <g opacity={opacity}>
      {rows.flatMap((row, ry) => row.split("").map((ch, rx) => ch === "X" ? <rect key={`${rx}-${ry}`} x={x + rx * px} y={y + ry * px} width={px} height={px} fill={color} /> : null))}
    </g>
  );
}
function TownCloud({ x, y, s, fill, opacity }: { x: number; y: number; s: number; fill: string; opacity: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={opacity} fill={fill}>
      <rect x="6" y="6" width="34" height="8" /><rect x="12" y="0" width="20" height="7" /><rect x="0" y="9" width="46" height="6" />
    </g>
  );
}

function TownBackground({ phase, hourFloat, milestones = [] }: { phase: TodPhase; hourFloat: number; milestones?: { id: string; met: boolean }[] }) {
  const P = TOD_TOWN[phase];
  const met = new Set(milestones.filter(m => m.met).map(m => m.id));
  const fence = (x0: number, y: number, n: number, key: string) => (
    <g key={key} fill="#f2efe8">
      <rect x={x0} y={y + 4} width={n * 14} height="3" />
      {Array.from({ length: n }, (_, i) => <rect key={i} x={x0 + i * 14} y={y} width="4" height="12" />)}
    </g>
  );
  const flowers: [number, number, string][] = [[90, 300, "#ff8fb2"], [210, 520, "#ffd94d"], [420, 210, "#ffffff"], [1180, 240, "#ff8fb2"], [1300, 560, "#ffd94d"], [150, 700, "#ffffff"], [620, 640, "#ff8fb2"], [980, 420, "#ffd94d"], [330, 120, "#ff8fb2"], [1080, 700, "#ffffff"], [60, 470, "#ffd94d"], [1240, 90, "#ffffff"]];
  /* Celestial arc: the sun crosses 5am–7pm; the moon crosses 7pm–5am.
     Position is a pure function of the viewer's local time. */
  const isNightBody = phase === "night";
  const prog = isNightBody
    ? Math.min(1, Math.max(0, hourFloat >= 19 ? (hourFloat - 19) / 10 : (hourFloat + 5) / 10))
    : Math.min(1, Math.max(0, (hourFloat - 5) / 14));
  const celX = 110 + prog * 1220;
  const celY = 74 - Math.sin(prog * Math.PI) * 38;
  return (
    <div className="town-bg" aria-hidden="true" data-phase={phase}>
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" shapeRendering="crispEdges" focusable="false">
        <defs>
          <pattern id="twn-grass" width="24" height="24" patternUnits="userSpaceOnUse">
            <rect width="24" height="24" fill={P.grass} /><rect width="12" height="12" fill={P.grassAlt} /><rect x="12" y="12" width="12" height="12" fill={P.grassAlt} />
            <rect x="4" y="16" width="3" height="5" fill={P.blade} /><rect x="17" y="5" width="3" height="5" fill={P.blade} />
          </pattern>
          <pattern id="twn-dirt" width="20" height="14" patternUnits="userSpaceOnUse">
            <rect width="20" height="14" fill={P.dirt} /><rect x="3" y="3" width="4" height="2" fill={P.dirtEdge} /><rect x="13" y="9" width="4" height="2" fill={P.dirtEdge} />
          </pattern>
          <radialGradient id="twn-lampglow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffd97a" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#ffb84d" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ffb84d" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="twn-celglow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={P.celestialGlow} />
            <stop offset="100%" stopColor={P.celestialGlow} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="1440" height="900" fill="url(#twn-grass)" />
        {/* dirt paths — a cross through town + a lower road the panels part around */}
        <rect x="0" y="132" width="1440" height="46" fill="url(#twn-dirt)" />
        <rect x="0" y="132" width="1440" height="4" fill={P.dirtEdge} /><rect x="0" y="174" width="1440" height="4" fill={P.dirtEdge2} />
        <rect x="672" y="0" width="52" height="900" fill="url(#twn-dirt)" />
        <rect x="672" y="0" width="4" height="900" fill={P.dirtEdge} /><rect x="720" y="0" width="4" height="900" fill={P.dirtEdge2} />
        <rect x="0" y="716" width="1440" height="42" fill="url(#twn-dirt)" />
        <rect x="0" y="716" width="1440" height="4" fill={P.dirtEdge} /><rect x="0" y="754" width="1440" height="4" fill={P.dirtEdge2} />
        {/* lab-like building — top centre, straddling the north path */}
        <g>
          <rect x="540" y="18" width="130" height="8" fill="#9aa7b4" /><rect x="556" y="8" width="14" height="10" fill="#9aa7b4" /><rect x="562" y="0" width="3" height="8" fill="#9aa7b4" />
          <rect x="546" y="26" width="118" height="64" fill="#eef1f4" /><rect x="546" y="26" width="118" height="6" fill="#d9a441" />
          <rect x="556" y="40" width="16" height="13" fill="#7ec8e3" /><rect x="580" y="40" width="16" height="13" fill="#7ec8e3" /><rect x="612" y="40" width="16" height="13" fill="#7ec8e3" /><rect x="636" y="40" width="16" height="13" fill="#7ec8e3" />
          <rect x="594" y="62" width="20" height="28" fill="#5b7a99" /><rect x="584" y="30" width="42" height="4" fill="#c8402a" />
        </g>
        {/* houses along the edges */}
        {TOD_HOUSES.map((h, i) => <TownHouse key={i} x={h.x} y={h.y} roof={h.roof} scale={h.scale} />)}
        {/* tree lines along edges + clusters */}
        <TownTree x={130} y={56} /><TownTree x={175} y={40} s={0.85} /><TownTree x={300} y={66} s={0.9} />
        <TownTree x={1080} y={52} /><TownTree x={1130} y={38} s={0.85} />
        <TownTree x={36} y={240} /><TownTree x={40} y={610} s={0.9} /><TownTree x={90} y={640} s={0.75} />
        <TownTree x={1360} y={230} /><TownTree x={1348} y={610} s={0.9} /><TownTree x={1290} y={640} s={0.75} />
        <TownTree x={420} y={800} /><TownTree x={470} y={822} s={0.8} /><TownTree x={760} y={806} s={0.9} />
        <TownTree x={760} y={230} s={0.8} /><TownTree x={240} y={250} s={0.7} />
        {/* picket fences beside the paths */}
        {fence(120, 190, 9, "fa")}{fence(860, 190, 10, "fb")}{fence(180, 690, 8, "fc")}{fence(820, 690, 7, "fd")}
        {/* wooden town signs */}
        <g><rect x="742" y="196" width="4" height="22" fill="#7a4a21" /><rect x="770" y="196" width="4" height="22" fill="#7a4a21" /><rect x="736" y="184" width="46" height="15" fill="#a9743a" /><rect x="736" y="184" width="46" height="2" fill="#7a4a21" /><rect x="741" y="189" width="28" height="2" fill="#ffe9bd" /><rect x="741" y="193" width="20" height="2" fill="#ffe9bd" /></g>
        <g><rect x="96" y="742" width="4" height="20" fill="#7a4a21" /><rect x="122" y="742" width="4" height="20" fill="#7a4a21" /><rect x="90" y="730" width="42" height="14" fill="#a9743a" /><rect x="95" y="735" width="26" height="2" fill="#ffe9bd" /></g>
        {/* flower patches */}
        {flowers.map(([x, y, c], i) => <g key={i}><rect x={x} y={y} width="5" height="5" fill={c} /><rect x={x + 10} y={y + 4} width="5" height="5" fill={c} /><rect x={x + 4} y={y + 10} width="5" height="5" fill="#ffffff" /></g>)}
        {/* pond / lake — bottom-right edge, pixel-stepped shoreline */}
        <g>
          <rect x="1120" y="790" width="320" height="110" fill={P.pond} />
          <rect x="1160" y="762" width="280" height="28" fill={P.pond} />
          <rect x="1210" y="736" width="230" height="26" fill={P.pond} />
          <rect x="1120" y="790" width="320" height="6" fill={P.pondDeep} />
          <rect x="1180" y="826" width="52" height="5" fill="#ffffff" opacity={0.6 * P.sparkle + 0.2} /><rect x="1300" y="856" width="38" height="5" fill="#ffffff" opacity={0.5 * P.sparkle + 0.15} /><rect x="1240" y="782" width="30" height="4" fill="#ffffff" opacity={0.55 * P.sparkle + 0.15} />
          <rect x="1108" y="806" width="12" height="8" fill="#2f8f4e" /><rect x="1196" y="748" width="12" height="8" fill="#2f8f4e" />
        </g>
        {/* ——— TOWN GROWTH MILESTONES (round 4) — structures exist ONLY when
            the milestone is met by real data (server: v2.milestones).
            Unmet = open grass, exactly as before. Original pixel art. ——— */}
        {met.has("fountain") && (
          <g>
            <rect x="836" y="602" width="68" height="10" fill="#9aa7b4" /><rect x="830" y="612" width="80" height="6" fill="#7e8b99" />
            <rect x="844" y="594" width="52" height="9" fill="#7ec8e3" />
            <rect x="866" y="566" width="8" height="30" fill="#9aa7b4" /><rect x="854" y="558" width="32" height="9" fill="#9aa7b4" /><rect x="862" y="550" width="16" height="8" fill="#7e8b99" />
            <rect x="868" y="540" width="4" height="8" fill="#7ec8e3" /><rect x="852" y="546" width="4" height="6" fill="#7ec8e3" /><rect x="884" y="546" width="4" height="6" fill="#7ec8e3" />
          </g>
        )}
        {met.has("gym") && (
          <g>
            <rect x="184" y="436" width="146" height="18" fill="#d94f3d" /><rect x="196" y="426" width="122" height="10" fill="#b23a2c" />
            <rect x="196" y="454" width="122" height="84" fill="#e8e2d4" /><rect x="196" y="454" width="122" height="8" fill="#c8402a" />
            <rect x="206" y="474" width="20" height="16" fill="#7ec8e3" /><rect x="288" y="474" width="20" height="16" fill="#7ec8e3" />
            <rect x="247" y="470" width="20" height="10" fill="#e0483e" /><rect x="247" y="480" width="20" height="10" fill="#f2efe8" /><rect x="247" y="478" width="20" height="3" fill="#23232b" /><rect x="254" y="476" width="6" height="6" fill="#f2efe8" stroke="#23232b" strokeWidth="1.5" />
            <rect x="243" y="500" width="28" height="38" fill="#5b7a99" /><rect x="254" y="512" width="6" height="6" fill="#ffd94d" />
          </g>
        )}
        {met.has("markethall") && (
          <g>
            {Array.from({ length: 8 }, (_, i) => <rect key={i} x={1084 + i * 20} y="446" width="20" height="14" fill={i % 2 ? "#f2efe8" : "#ff8fb2"} />)}
            <rect x="1092" y="460" width="140" height="76" fill="#f0e6d2" /><rect x="1092" y="460" width="140" height="6" fill="#a9743a" />
            <rect x="1104" y="478" width="22" height="18" fill="#7ec8e3" /><rect x="1198" y="478" width="22" height="18" fill="#7ec8e3" />
            <rect x="1148" y="486" width="28" height="50" fill="#7a4a21" />
            <rect x="1100" y="512" width="16" height="14" fill="#a9743a" /><rect x="1208" y="512" width="16" height="14" fill="#a9743a" />
          </g>
        )}
        {met.has("statue") && (
          <g>
            <rect x="598" y="608" width="36" height="14" fill="#9aa7b4" /><rect x="592" y="622" width="48" height="7" fill="#7e8b99" />
            <rect x="608" y="572" width="16" height="36" fill="#b9c2cc" /><rect x="604" y="564" width="24" height="9" fill="#b9c2cc" />
            <rect x="612" y="548" width="8" height="8" fill="#ffd94d" /><rect x="610" y="542" width="12" height="4" fill="#ffd94d" /><rect x="614" y="538" width="4" height="4" fill="#ffd94d" />
          </g>
        )}
        {met.has("garden") && (
          <g>
            <rect x="284" y="804" width="112" height="46" fill="#6e4525" /><rect x="284" y="804" width="112" height="4" fill="#54341b" />
            {[[296, 816, "#ff8fb2"], [318, 828, "#ffd94d"], [340, 814, "#ffffff"], [362, 830, "#ff8fb2"], [380, 816, "#ffd94d"], [306, 838, "#ffffff"], [350, 840, "#ff8fb2"], [374, 840, "#ffffff"]].map(([fx, fy, fc], i) => <g key={i}><rect x={fx} y={fy} width="6" height="6" fill={fc as string} /><rect x={(fx as number) + 2} y={(fy as number) + 6} width="2" height="5" fill="#2f8f4e" /></g>)}
            <rect x="288" y="786" width="18" height="16" fill="#2f8f4e" /><rect x="374" y="784" width="20" height="18" fill="#2f8f4e" />
          </g>
        )}
        {/* path lamp posts (heads light up in the lights layer below) */}
        {TOD_LAMPS.map((l, i) => (
          <g key={i}>
            <rect x={l.x + 2} y={l.y + 8} width="4" height="18" fill="#3a3f45" />
            <rect x={l.x} y={l.y} width="8" height="8" fill={P.lampHead} />
          </g>
        ))}
        {/* ——— LIGHTING WASH — tints the whole town for the phase ——— */}
        <rect x="0" y="0" width="1440" height="900" fill={P.wash} opacity={P.washOp} />
        {/* ——— LIGHTS LAYER — drawn over the wash so lit things pop ——— */}
        {P.starOp > 0 && (
          <g fill="#ffffff">
            {TOD_STARS.map((s, i) => <rect key={i} x={s.x} y={s.y} width={s.s} height={s.s} opacity={s.o * P.starOp} />)}
          </g>
        )}
        <TownCloud x={170} y={30} s={1} fill={P.cloud} opacity={P.cloudOp} />
        <TownCloud x={600} y={14} s={0.8} fill={P.cloud} opacity={P.cloudOp * 0.85} />
        <TownCloud x={1030} y={40} s={1.15} fill={P.cloud} opacity={P.cloudOp} />
        {/* sun / moon on its arc, with a soft halo */}
        <circle cx={celX + 17} cy={celY + 17} r="46" fill="url(#twn-celglow)" />
        {isNightBody
          ? <PixelGrid rows={MOON_ROWS} x={celX} y={celY} px={7} color="#f4ecd8" />
          : <PixelGrid rows={SUN_ROWS} x={celX} y={celY} px={7} color={phase === "dawn" || phase === "dusk" || phase === "golden" ? "#ffb84d" : "#ffd94d"} />}
        {/* glowing windows — houses + lab, warm amber when lit */}
        {P.windowGlow > 0 && (
          <g fill="#ffca66" opacity={P.windowGlow}>
            {TOD_HOUSES.flatMap((h) => { const sc = h.scale ?? 1; return [12, 42].map((wx, wi) => <rect key={`${h.x}-${wi}`} x={h.x + wx * sc} y={h.y + 22 * sc} width={10 * sc} height={10 * sc} />); })}
            {[556, 580, 612, 636].map((lx) => <rect key={lx} x={lx} y={40} width="16" height="13" />)}
          </g>
        )}
        {/* lamp halos */}
        {P.lampGlow > 0 && TOD_LAMPS.map((l, i) => <circle key={i} cx={l.x + 4} cy={l.y + 4} r="30" fill="url(#twn-lampglow)" opacity={P.lampGlow} />)}
      </svg>
    </div>
  );
}

/* ——— HOME TOWN BAND (Glass Vault phase 1) ———
   A fixed window into the SAME town at the bottom of Home: the same
   TownBackground art, the same time-phase + seasonal state (the root
   data-event filters apply to .town-bg inside the band too), scouts
   present via the roaming layer above it. Page content scrolls above
   the band; the band itself carries no text and no controls. The Town
   PAGE (Scouts › Town) still renders TownBackground full-screen —
   this band is a window into that place, not a replacement. */
function TownBand({ phase, hourFloat, milestones = [] }: { phase: TodPhase; hourFloat: number; milestones?: { id: string; met: boolean }[] }) {
  return (
    <div className="town-band" aria-hidden="true">
      <TownBackground phase={phase} hourFloat={hourFloat} milestones={milestones} />
    </div>
  );
}

/* ——— ROAMING SCOUTS — town space only, never over data ———
   The owner's rule (Oct 8, 2026): scouts live in the TOWN, not on the data.
   Default roaming is confined to background / margin space — the grass,
   the page margins, the paths and the gaps between sections — and a
   scout must never cross over, hover on, or cover a data panel, table,
   chart or text. That is enforced, not hoped for:
   - Panel avoidance: every ~600ms the loop snapshots the viewport rects
     of every content panel (main .slab / .town-readable). A position is
     only "free" when the sprite's box intersects none of them.
   - Steering: each frame the next step is tested — full step, then
     x-only slide, then y-only slide; if all three would enter a panel,
     the scout stops and picks a new free target. Targets are chosen by
     rejection sampling (margin corridors first), so paths run around
     panels. If a layout shift ever lands a sprite on a panel anyway, it
     fades to a ghost until it is back in open space. Where NO free space
     exists (narrow phones), a scout fades out and waits rather than
     covering data.
   THE EXCEPTION — the main event: when a scout actually pins a find, it
   SCURRIES to the top of the viewport (fast, margin-hugging), celebrates
   there with its find bubble for ~5s, then heads back down to its roam
   area. Occasional pop-ups are the only other cameo: one scout at a
   time, at a page edge, every ~35–70s, gone in ~4s. Status bubbles
   follow the same law — they render only when the bubble's own box is in
   free town space (or during a pin celebration / edge peek); otherwise
   the scout's status lives on its card in the scout section, where it
   always has been. Movement stays on requestAnimationFrame writing
   transforms/dataset only (no per-frame React renders); it pauses when
   the tab is hidden; prefers-reduced-motion parks the scouts half-peeking
   at the page edges, static, and a pinned scout simply celebrates in
   place via its card glow instead of travelling. */
type RigMode = "roam" | "hidden" | "scurry" | "celebrate" | "return" | "peek";
type Rig = {
  x: number; y: number; tx: number; ty: number; dir: 1 | -1; pauseUntil: number; speedMult: number;
  teleportAt: number; goneUntil: number; phase: number; mode: RigMode; modeUntil: number; blockedSince: number;
  bubbleUntil: number; nextBubbleAt: number; hasPos: boolean;
};
type PanelRect = { l: number; t: number; r: number; b: number };
const SPRITE_W = 66, SPRITE_H = 88;
const PERSONALITY: Record<string, { speed: number; pauseMs: [number, number] }> = {
  pikachu: { speed: 175, pauseMs: [250, 900] },
  eevee: { speed: 68, pauseMs: [700, 1800] },
  gengar: { speed: 50, pauseMs: [900, 2400] },
  snorlax: { speed: 16, pauseMs: [4500, 9500] },
};
const rand = (a: number, b: number) => a + Math.random() * (b - a);
function firstSentence(s: string): string { const i = s.indexOf(". "); return i > 0 ? s.slice(0, i + 1) : s; }
/* Parked spots (paused / reduced-motion): half-peeking at the page edges,
   so a parked scout hugs the town margin instead of sitting on a panel. */
const PARK_SPOTS: Record<string, { left: string; top: string }> = {
  pikachu: { left: "-14px", top: "12%" },
  eevee: { left: "-14px", top: "56%" },
  gengar: { left: "calc(100% - 50px)", top: "26%" },
  snorlax: { left: "calc(100% - 54px)", top: "74%" },
};

function FreeRoamingScouts({ scouts, pinnedByScout, sightingByScout }: { scouts: Scout[]; pinnedByScout: Map<string, Deal>; sightingByScout: Map<string, Deal> }) {
  const walkerRefs = useRef(new Map<string, HTMLDivElement>());
  const flipRefs = useRef(new Map<string, HTMLDivElement>());
  const rigsRef = useRef(new Map<string, Rig>());
  const panelsRef = useRef<PanelRect[]>([]);
  const scurryQueueRef = useRef<string[]>([]);
  const prevPinsRef = useRef<Map<string, number> | null>(null);
  const nextPeekAtRef = useRef(0);
  const peekIdxRef = useRef(0);
  const [reduced, setReduced] = useState(false);
  const [mode, setMode] = useState<"roam" | "paused" | "hidden">("roam");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const roaming = !reduced && mode === "roam" && scouts.length > 0;

  /* ——— Pin detection: a NEW pinned deal for a scout queues its scurry
     to the top. The first observation only seeds the known-pins set, so
     pins that already existed at page load don't trigger a parade. ——— */
  useEffect(() => {
    const current = new Map<string, number>();
    for (const [scoutId, deal] of pinnedByScout) current.set(scoutId, deal.id);
    if (prevPinsRef.current === null) { prevPinsRef.current = current; return; }
    for (const [scoutId, dealId] of current) {
      if (prevPinsRef.current.get(scoutId) !== dealId && !scurryQueueRef.current.includes(scoutId)) {
        scurryQueueRef.current.push(scoutId);
      }
    }
    prevPinsRef.current = current;
  }, [pinnedByScout]);

  useEffect(() => {
    if (!roaming) return;
    let raf = 0;
    let last = performance.now();
    let lastPanelScan = 0;

    const scanPanels = () => {
      const rects: PanelRect[] = [];
      document.querySelectorAll("main .slab, main .town-readable, main .glass-panel, main .quiet-panel, main .slab-fan").forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width < 8 || r.height < 8) return;
        rects.push({ l: r.left - 5, t: r.top - 5, r: r.right + 5, b: r.bottom + 5 });
      });
      panelsRef.current = rects;
    };
    const boxHitsPanel = (x: number, y: number, w: number, h: number): boolean =>
      panelsRef.current.some(p => x < p.r && x + w > p.l && y < p.b && y + h > p.t);
    const isFree = (x: number, y: number, W: number, H: number): boolean =>
      x >= -2 && y >= -2 && x + SPRITE_W <= W + 2 && y + SPRITE_H <= H + 2 && !boxHitsPanel(x, y, SPRITE_W, SPRITE_H);
    /* Rejection-sample a panel-free roam target: margin corridors first
       (the town grass beside the centred content column), then anywhere. */
    const pickTarget = (W: number, H: number): { x: number; y: number } | null => {
      const margin = Math.max(0, (W - Math.min(W, 1280)) / 2 - 8);
      for (let i = 0; i < 16; i++) {
        let x: number, y: number;
        if (i < 7 && margin > SPRITE_W * 0.6) {
          const leftSide = Math.random() < 0.5;
          x = leftSide ? rand(2, Math.max(3, margin - SPRITE_W)) : rand(W - margin + 2, Math.max(W - margin + 3, W - SPRITE_W - 2));
          y = rand(46, Math.max(47, H - SPRITE_H - 60));
        } else if (i < 11) {
          x = rand(2, Math.max(3, W - SPRITE_W - 2)); y = rand(46, Math.max(47, H - SPRITE_H - 60));
        } else {
          x = rand(2, Math.max(3, W - SPRITE_W - 2)); y = rand(2, Math.max(3, H - SPRITE_H - 40));
        }
        if (isFree(x, y, W, H)) return { x, y };
      }
      return null;
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (document.hidden) return;
      const W = window.innerWidth, H = window.innerHeight;
      if (W < 60 || H < 60) return;
      if (now - lastPanelScan > 600) { scanPanels(); lastPanelScan = now; }
      if (nextPeekAtRef.current === 0) nextPeekAtRef.current = now + rand(18000, 30000);
      const anyEventActive = [...rigsRef.current.values()].some(r => r.mode === "scurry" || r.mode === "celebrate" || r.mode === "return" || r.mode === "peek");

      /* Start a queued scurry (one parade at a time) */
      if (!anyEventActive && scurryQueueRef.current.length > 0) {
        const scoutId = scurryQueueRef.current.shift()!;
        const rig = rigsRef.current.get(scoutId);
        if (rig) {
          rig.mode = "scurry"; rig.blockedSince = 0; rig.goneUntil = 0;
          rig.tx = Math.min(Math.max(6, W / 2 - SPRITE_W / 2), Math.max(6, W - SPRITE_W - 6)); rig.ty = 4;
        }
      }
      /* Schedule an occasional edge pop-up when nothing else is on */
      if (!anyEventActive && scurryQueueRef.current.length === 0 && now >= nextPeekAtRef.current && scouts.length > 0) {
        const s = scouts[peekIdxRef.current % scouts.length]!;
        peekIdxRef.current += 1;
        nextPeekAtRef.current = now + rand(35000, 70000);
        const rig = rigsRef.current.get(s.scoutId);
        if (rig) {
          const leftEdge = peekIdxRef.current % 2 === 0;
          rig.mode = "peek"; rig.modeUntil = now + 4000; rig.goneUntil = 0;
          rig.x = leftEdge ? -SPRITE_W * 0.42 : W - SPRITE_W * 0.58;
          /* Prefer a peek height whose (clamped) box is panel-free */
          let py = H * rand(0.3, 0.6);
          for (let i = 0; i < 10; i++) { const cand = rand(60, Math.max(61, H - SPRITE_H - 40)); if (!boxHitsPanel(Math.max(0, rig.x), cand, SPRITE_W, SPRITE_H)) { py = cand; break; } }
          rig.y = py; rig.tx = rig.x; rig.ty = rig.y;
        }
      }

      for (const s of scouts) {
        const el = walkerRefs.current.get(s.scoutId);
        if (!el) continue;
        let rig = rigsRef.current.get(s.scoutId);
        if (!rig) {
          const idx = scouts.findIndex(x => x.scoutId === s.scoutId);
          rig = { x: 10 + idx * 8, y: H * 0.8, tx: 10, ty: H * 0.8, dir: 1, pauseUntil: now + rand(200, 1200) + idx * 350, speedMult: 1, teleportAt: now + rand(9000, 16000), goneUntil: 0, phase: rand(0, 6), mode: "hidden", modeUntil: 0, blockedSince: 0, bubbleUntil: 0, nextBubbleAt: now + rand(12000, 30000) + idx * 6000, hasPos: false };
          const t = pickTarget(W, H);
          if (t) { rig.x = t.x; rig.y = t.y; rig.tx = t.x; rig.ty = t.y; rig.mode = "roam"; rig.hasPos = true; }
          rigsRef.current.set(s.scoutId, rig);
        }
        const p = PERSONALITY[s.scoutId] ?? { speed: 64, pauseMs: [700, 1800] as [number, number] };
        let targetOpacity = 1;
        let moving = false;

        if (rig.mode === "peek") {
          if (now >= rig.modeUntil) {
            const t = pickTarget(W, H);
            if (t) { rig.x = t.x; rig.y = t.y; rig.tx = t.x; rig.ty = t.y; rig.mode = "roam"; rig.hasPos = true; rig.pauseUntil = now + 500; }
            else { rig.mode = "hidden"; rig.modeUntil = now + 3000; }
          }
        } else if (rig.mode === "hidden") {
          targetOpacity = 0;
          if (now >= rig.modeUntil) {
            const t = pickTarget(W, H);
            if (t) { rig.x = t.x; rig.y = t.y; rig.tx = t.x; rig.ty = t.y; rig.mode = "roam"; rig.hasPos = true; }
            else rig.modeUntil = now + 3000;
          }
        } else if (rig.mode === "celebrate") {
          if (now >= rig.modeUntil) {
            const t = pickTarget(W, H);
            rig.mode = "return"; rig.modeUntil = now + 7000;
            if (t) { rig.tx = t.x; rig.ty = t.y; } else { rig.mode = "hidden"; rig.modeUntil = now + 2000; }
          }
        } else {
          /* ——— Movement with panel steering (roam / scurry / return) ——— */
          const isEvent = rig.mode === "scurry" || rig.mode === "return";
          if (s.scoutId === "gengar" && rig.mode === "roam") {
            if (!rig.goneUntil && now >= rig.teleportAt) { rig.goneUntil = now + 480; }
            if (rig.goneUntil && now >= rig.goneUntil) {
              const t = pickTarget(W, H);
              if (t) { rig.x = t.x; rig.y = t.y; rig.tx = t.x; rig.ty = t.y; rig.pauseUntil = now + 700; }
              rig.goneUntil = 0; rig.teleportAt = now + rand(9000, 16000);
            }
            if (rig.goneUntil) targetOpacity = 0;
            else targetOpacity = 0.85 + 0.15 * Math.sin(now / 1500 + rig.phase);
          }
          const paused = rig.mode === "roam" && now < rig.pauseUntil;
          if (!rig.goneUntil && !paused) {
            const dx = rig.tx - rig.x, dy = rig.ty - rig.y;
            const dist = Math.hypot(dx, dy);
            const speed = p.speed * (rig.mode === "scurry" ? 3.4 : rig.mode === "return" ? 2.2 : rig.speedMult);
            const step = speed * dt;
            if (dist <= Math.max(2, step)) {
              rig.x = rig.tx; rig.y = rig.ty; rig.blockedSince = 0;
              if (rig.mode === "scurry") { rig.mode = "celebrate"; rig.modeUntil = now + 5200; }
              else if (rig.mode === "return") { rig.mode = "roam"; rig.pauseUntil = now + rand(p.pauseMs[0], p.pauseMs[1]); }
              else {
                rig.pauseUntil = now + rand(p.pauseMs[0], p.pauseMs[1]);
                if (s.scoutId === "snorlax") {
                  let placed = false;
                  for (let i = 0; i < 8 && !placed; i++) { const nx = rig.x + rand(-54, 54), ny = rig.y + rand(-12, 12); if (isFree(nx, ny, W, H)) { rig.tx = nx; rig.ty = ny; placed = true; } }
                  if (!placed) { const t = pickTarget(W, H); if (t) { rig.tx = t.x; rig.ty = t.y; } }
                } else {
                  const t = pickTarget(W, H);
                  if (t) { rig.tx = t.x; rig.ty = t.y; } else { rig.mode = "hidden"; rig.modeUntil = now + 2500; targetOpacity = 0; }
                }
                rig.speedMult = s.scoutId === "pikachu" && Math.random() < 0.3 ? 1.9 : 1;
              }
            } else {
              const ux = (dx / dist) * step, uy = (dy / dist) * step;
              const nx = rig.x + ux, ny = rig.y + uy;
              /* Ghost-through is a last resort for the pin parade only:
                 a celebrating scout must reach the top even if a layout
                 shift sealed the margins — it fades while passing. */
              const ghost = isEvent && rig.blockedSince > 0 && now - rig.blockedSince > 1100;
              if (isFree(nx, ny, W, H) || ghost) { rig.x = nx; rig.y = ny; if (!ghost) rig.blockedSince = 0; if (ghost) targetOpacity = 0.3; moving = true; }
              else if (isFree(nx, rig.y, W, H)) { rig.x = nx; rig.blockedSince = rig.blockedSince || now; moving = true; }
              else if (isFree(rig.x, ny, W, H)) { rig.y = ny; rig.blockedSince = rig.blockedSince || now; moving = true; }
              else {
                if (!rig.blockedSince) rig.blockedSince = now;
                if (rig.mode === "roam" && now - rig.blockedSince > 350) {
                  const t = pickTarget(W, H);
                  if (t) { rig.tx = t.x; rig.ty = t.y; } else { rig.mode = "hidden"; rig.modeUntil = now + 2500; targetOpacity = 0; }
                  rig.blockedSince = 0;
                }
                if (rig.mode === "return" && now >= rig.modeUntil) { rig.mode = "roam"; rig.blockedSince = 0; }
              }
              if (Math.abs(dx) > 1) rig.dir = dx >= 0 ? 1 : -1;
            }
          }
          /* Safety net: never sit on a panel — fade until back in town
             space. (This branch only runs for roam/scurry/return modes;
             celebration and peek handle their own placement above.) */
          if (boxHitsPanel(rig.x, rig.y, SPRITE_W, SPRITE_H)) {
            targetOpacity = Math.min(targetOpacity, 0.18);
          }
        }

        /* ——— Bubbles: only in free town space, on a pin celebration, or
           during an edge peek. Sparse while roaming (every ~26–48s per
           scout, ~3.6s each). Written via dataset — CSS shows/hides. ——— */
        let bubble = false;
        if (rig.mode === "celebrate" || rig.mode === "peek") bubble = true;
        else if (rig.mode === "roam" && targetOpacity > 0.5) {
          if (now >= rig.nextBubbleAt && rig.bubbleUntil === 0) { rig.bubbleUntil = now + 3600; rig.nextBubbleAt = now + rand(26000, 48000); }
          if (rig.bubbleUntil !== 0 && now < rig.bubbleUntil) {
            const bx = rig.x + SPRITE_W / 2 - 105, by = rig.y - 66;
            bubble = !boxHitsPanel(bx, by, 210, 60);
          }
          if (rig.bubbleUntil !== 0 && now >= rig.bubbleUntil) rig.bubbleUntil = 0;
        }
        el.dataset.bubble = bubble ? "1" : "0";
        el.dataset.celebrate = rig.mode === "celebrate" ? "1" : "0";
        el.style.opacity = String(targetOpacity);
        el.style.transform = `translate(${rig.x.toFixed(1)}px, ${rig.y.toFixed(1)}px)`;
        const cx = rig.x + SPRITE_W / 2, half = Math.min(122, W * 0.32);
        let shift = 0;
        if (cx < half) shift = half - cx; else if (cx > W - half) shift = W - half - cx;
        el.style.setProperty("--bubble-x", shift.toFixed(0) + "px");
        el.dataset.moving = moving ? "1" : "0";
        const flip = flipRefs.current.get(s.scoutId);
        if (flip) flip.style.transform = `scaleX(${rig.dir})`;
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [roaming, scouts]);

  if (scouts.length === 0) return null;
  const parked = !roaming;

  return (
    <>
      {mode !== "hidden" && (
        <div className="roam-layer" role="group" aria-label="Scout team roaming the town margins — they keep off the data panels, and scurry to the top only to pin a find">
          {scouts.map(s => {
            const pinned = pinnedByScout.get(s.scoutId);
            const sighting = sightingByScout.get(s.scoutId);
            const color = SCOUT_COLORS[s.scoutId] ?? "var(--accent)";
            const park = PARK_SPOTS[s.scoutId] ?? { left: "10%", top: "20%" };
            return (
              <div key={s.scoutId} className="scout-walker" data-personality={s.scoutId === "pikachu" ? "dart" : s.scoutId === "gengar" ? "drift" : s.scoutId === "snorlax" ? "nap" : "trot"} data-celebrate="0" data-bubble="0"
                ref={el => { if (el) walkerRefs.current.set(s.scoutId, el); else walkerRefs.current.delete(s.scoutId); }}
                style={parked ? { transform: `translate(0px, 0px)`, left: park.left, top: park.top, opacity: 0.92 } : { transform: "translate(20px, 120px)", opacity: 0, transition: "opacity 0.5s ease" }}>
                {/* Bubble visibility is driven by the roam loop via
                    data-bubble: free town space, pin celebration, or edge
                    peek only — never over data. Parked scouts don't bubble
                    at all; their status lives on their scout cards. */}
                {!parked && (
                  <div className="scout-bubble" role="status" style={pinned ? { borderColor: "var(--accent)", maxWidth: 240 } : undefined}>
                    {pinned
                      ? <span className="font-bold" style={{ color: "var(--accent-ink)" }}>🎉 Pinned: {pinned.cardName} — it&apos;s pinned in the Findings Ledger ↓</span>
                      : sighting
                        ? <span>Sighting logged: {sighting.cardName} (link unverified)</span>
                        : <span>{firstSentence(s.statusLine)}</span>}
                  </div>
                )}
                <div ref={el => { if (el) flipRefs.current.set(s.scoutId, el); else flipRefs.current.delete(s.scoutId); }}>
                  <div className="scout-body">
                    <span className="relative flex items-center justify-center">
                      <PixelSprite scoutId={s.scoutId} size={54} />
                      {s.scoutId === "snorlax" && <span className="scout-zzz" aria-hidden>💤</span>}
                    </span>
                    <span className="scout-shadow" aria-hidden />
                  </div>
                </div>
                <span className="absolute left-1/2 top-full mt-0.5 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(10,20,10,0.55)", color: color }}>{s.name}</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="roam-toggle" role="group" aria-label="Scout roaming controls">
        {mode === "hidden"
          ? <button aria-label="Show roaming scouts" onClick={() => setMode("roam")}>🐾 Show scouts</button>
          : <>
              <button aria-label={mode === "roam" ? "Pause roaming scouts" : "Resume roaming scouts"} onClick={() => setMode(mode === "roam" ? "paused" : "roam")}>{mode === "roam" ? "⏸ Pause scouts" : "▶ Resume scouts"}</button>
              <button aria-label="Hide roaming scouts" onClick={() => setMode("hidden")}>Hide scouts</button>
            </>}
      </div>
    </>
  );
}

/* ——— Chart series: real dated evidence only, sources captioned per chart ——— */

const MOMENTUM_SERIES = [
  { name: "Crystal", move: 23.1 },
  { name: "Gold Star", move: 22.6 },
  { name: "EX-era ex", move: 19.1 },
  { name: "LV.X", move: 13.5 },
];
/* Chart chrome (design pass, Oct 13 — remedy #10): axis ticks and
   Recharts tooltips are theme-aware via the --chart-tick / --tooltip-*
   tokens in theme.css. The old fixed tick #a39d8f measured 2.64:1 on
   Day Vapor panels and the Momentum axis #f2efe8 measured 1.12:1;
   tooltips paired a near-black ground with var(--text), which is
   deep violet in Day Vapor (1.06:1). New pairs: ticks 10.46:1 (Night)
   / 7.96:1 (Day) on the panel surface; tooltips 15.01:1 / 15.80:1. */
const CHART_TOOLTIP_STYLE = { background: "var(--tooltip-bg)", border: "1px solid var(--tooltip-border)", borderRadius: 10, color: "var(--tooltip-text)" } as const;
const CHART_TOOLTIP_TEXT = { color: "var(--tooltip-text)" } as const;

function eraBucket(year: number): string {
  if (year <= 2003) return "WOTC Vintage";
  if (year <= 2012) return "EX / DP / HGSS";
  if (year <= 2019) return "XY / Sun & Moon";
  if (year <= 2022) return "Sword & Shield";
  return "SV / Modern";
}
const ERA_ORDER = ["WOTC Vintage", "EX / DP / HGSS", "XY / Sun & Moon", "Sword & Shield", "SV / Modern"];
const ERA_SUB: Record<string, string> = { "WOTC Vintage": "1999–2003", "EX / DP / HGSS": "2004–2012", "XY / Sun & Moon": "2013–2019", "Sword & Shield": "2020–2022", "SV / Modern": "2023+" };

/* ——— Round 4 components: Rocket intel, Investment Committee, HoloSlab ——— */
function RocketIntelBlock({ points, severity }: { points: string[]; severity: number }) {
  return (
    <div className="mt-3 rounded-xl px-3 py-2.5" style={{ background: "rgba(212,58,47,0.10)", border: "1px solid rgba(212,58,47,0.5)" }} role="note" aria-label="Team Rocket intel — the adversarial bear case against this deal">
      <p className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--sell)" }}>🚀 Rocket intel — the bear case <span className="font-semibold normal-case tracking-normal" style={{ color: "var(--dim)" }}>(adversarial view · {severity} point{severity === 1 ? "" : "s"} · every claim cites its record · Rocket never pins or recommends buying)</span></p>
      <ul className="mt-1 grid gap-0.5 text-sm" style={{ color: "var(--dim)" }}>{points.map(p => <li key={p}>• {p}</li>)}</ul>
    </div>
  );
}

function CommitteeCard({ rec }: { rec: { score: number; verdict: string; bull: string; bear: string; liquidity: string; rationale: string; createdAt: string } }) {
  const vColor = rec.verdict === "BUY-lean" ? "var(--hold)" : rec.verdict === "WATCH" ? "var(--trim)" : "var(--sell)";
  return (
    <details className="mt-3 rounded-xl px-3 py-2.5" style={{ background: "var(--glass)", border: "1px solid var(--hairline)" }}>
      <summary className="cursor-pointer text-sm font-semibold min-h-[44px]" aria-label={`Investment Committee verdict ${rec.verdict}, score ${rec.score} of 100. Activate to expand the full debate.`}>
        🏛 Investment Committee: <span style={{ color: vColor }}>{rec.verdict}</span> <span className="num">· {rec.score}/100</span>
        <span className="block text-xs font-normal mt-0.5" style={{ color: "var(--dim)" }}>{rec.rationale} <span style={{ color: "var(--faint)" }}>(recorded {rec.createdAt} · expand for bull / bear / liquidity)</span></span>
      </summary>
      <div className="mt-2 grid gap-1.5 text-sm" style={{ color: "var(--dim)" }}>
        <p><strong style={{ color: "var(--hold)" }}>Bull:</strong> {rec.bull}</p>
        <p><strong style={{ color: "var(--sell)" }}>Bear (Rocket):</strong> {rec.bear}</p>
        <p><strong style={{ color: "var(--text)" }}>Liquidity (Snorlax):</strong> {rec.liquidity}</p>
        <p className="text-[11px]" style={{ color: "var(--faint)" }}>Records persist so verdicts can be graded against outcomes later (with the Paper League). Deterministic score from discount, tier, market thinness, pump level, Rocket objections, sales volume and seller presence.</p>
      </div>
    </details>
  );
}

/* ——— Graded slab visuals (Glass Vault phase 1) ———
   A graded slab = a generic grader-matched label strip on top of a
   clear case holding the FULL real card image (card.imageUrl, the
   verified per-cert art). NOTHING else is printed on the case — no
   cert number, no price, ever. A card with no resolved image (or a
   dead CDN) keeps the non-image treatment: a quiet case window with
   the set + number — no fake art, no generated art. */
const PSA_GRADE_WORD: Record<string, string> = { "10": "GEM MT", "9.5": "GEM MT", "9": "MINT", "8.5": "NM-MT", "8": "NM-MT", "7": "NM", "6.5": "EX-MT", "6": "EX-MT", "5": "EX", "4": "VG-EX" };
type GraderKind = "psa" | "cgc" | "bgs";
function graderKind(grader: string): GraderKind {
  const g = grader.toUpperCase();
  if (g.includes("CGC")) return "cgc";
  if (g.includes("BGS") || g.includes("BECKETT")) return "bgs";
  return "psa";
}
function GraderLabel({ card }: { card: Card }) {
  const kind = graderKind(card.grader);
  const bandSub = kind === "psa" ? "AUTHENTICATOR" : kind === "cgc" ? "CERTIFIED GUARANTY" : "BECKETT GRADING";
  /* FIX 1 (phase 2): card.name embeds variant descriptors after the
     first " — " ("Mega Gengar ex — Special Illustration Rare"). The
     character name alone goes in .l-name (clamped to 2 lines inside
     the FIXED-height label); the variant folds into the single-line
     set line, which truncates with an ellipsis — the label can never
     stretch the slab or the card image again. */
  const dashIdx = card.name.indexOf(" — ");
  const charName = dashIdx >= 0 ? card.name.slice(0, dashIdx) : card.name;
  const variant = dashIdx >= 0 ? card.name.slice(dashIdx + 3) : null;
  const setLine = `${card.setName} · #${card.number}${variant ? ` · ${variant}` : ""}`;
  const gradeLong = card.grade.trim().length > 3;
  return (
    <span className={`glabel gl-${kind}`} aria-hidden="true">
      <span className="band"><span>{card.grader.toUpperCase()}</span><span className="b-sub">{bandSub}</span></span>
      <span className="lrow">
        <span>
          <span className="l-name">{charName}</span>
          <span className="l-set">{setLine}</span>
        </span>
        <span className="gblock">
          {kind === "psa" && <span className="gword">{PSA_GRADE_WORD[card.grade] ?? ""}</span>}
          {kind === "bgs" && <span className="gword">{card.grade === "9.5" ? "GEM MINT" : PSA_GRADE_WORD[card.grade] ?? ""}</span>}
          <span className={`gnum${gradeLong ? " gnum-long" : ""}`}>{card.grade}</span>
        </span>
      </span>
    </span>
  );
}
function GradedSlabVisual({ card }: { card: Card }) {
  const [imgOk, setImgOk] = useState(true);
  const showImg = !!card.imageUrl && imgOk;
  return (
    <>
      <GraderLabel card={card} />
      {showImg ? (
        <span className="gslab-art">
          <img src={card.imageUrl!} alt="" loading="lazy" onError={() => setImgOk(false)} />
        </span>
      ) : (
        <span className="gslab-noart" aria-hidden="true">
          <PixelSlabLogo size={44} />
          <span className="text-xs font-bold leading-snug">{card.setName}<br />#{card.number} · {card.year}</span>
          <span className="text-[10px]">Card art not resolved for this printing</span>
        </span>
      )}
    </>
  );
}
function GradedSlab({ card, fanIndex, onOpen }: { card: Card; fanIndex?: number; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} aria-label={`Open detail page for ${card.name} — ${card.grader} ${card.grade}`} className={`gslab${fanIndex != null ? ` fan-${fanIndex}` : ""}`}>
      <GradedSlabVisual card={card} />
    </button>
  );
}

/* Holo-tilt slab viewer (round 4): presentational only. Pointer move
   tilts on desktop; deviceorientation (with the iOS permission prompt
   handled by an explicit button) tilts on mobile. All motion writes go
   to CSS vars on a ref — no React state per frame. Reduced-motion (or
   no sensor) keeps a static sheen. aria-hidden: every fact on the slab
   face is repeated in the detail's text and stat tiles right below. */
function HoloSlab({ card, reduced }: { card: Card; reduced: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [tiltOn, setTiltOn] = useState(false);
  const doe = typeof window !== "undefined" ? (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent : undefined;
  const needsPermission = !!doe && typeof doe.requestPermission === "function";
  useEffect(() => {
    if (!tiltOn || reduced) return;
    const onOri = (e: DeviceOrientationEvent) => {
      const el = ref.current; if (!el) return;
      const gx = Math.max(-16, Math.min(16, e.gamma ?? 0));
      const by = Math.max(-16, Math.min(16, (e.beta ?? 45) - 45));
      el.style.setProperty("--rx", `${(-by * 0.65).toFixed(1)}deg`);
      el.style.setProperty("--ry", `${(gx * 0.65).toFixed(1)}deg`);
      el.style.setProperty("--mx", `${50 + gx * 2.2}%`);
      el.style.setProperty("--my", `${50 + by * 2.2}%`);
    };
    window.addEventListener("deviceorientation", onOri);
    return () => window.removeEventListener("deviceorientation", onOri);
  }, [tiltOn, reduced]);
  const setFromPoint = (clientX: number, clientY: number) => {
    if (reduced) return;
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const px = Math.max(0, Math.min(1, (clientX - r.left) / Math.max(1, r.width)));
    const py = Math.max(0, Math.min(1, (clientY - r.top) / Math.max(1, r.height)));
    el.style.setProperty("--rx", `${((0.5 - py) * 13).toFixed(1)}deg`);
    el.style.setProperty("--ry", `${((px - 0.5) * 13).toFixed(1)}deg`);
    el.style.setProperty("--mx", `${(px * 100).toFixed(0)}%`);
    el.style.setProperty("--my", `${(py * 100).toFixed(0)}%`);
  };
  const reset = () => { const el = ref.current; if (!el) return; el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); el.style.setProperty("--mx", "50%"); el.style.setProperty("--my", "38%"); };
  const enableTilt = async () => {
    if (needsPermission && doe?.requestPermission) {
      try { const res = await doe.requestPermission(); if (res === "granted") setTiltOn(true); } catch { /* permission denied/unavailable — static sheen stays */ }
    } else setTiltOn(true);
  };
  return (
    <div>
      {/* PHASE 2 DETAIL REWORK (owner): NO dark stage. The slab renders
          directly on the sky surface — just the case and its own soft
          shadow, left-aligned at its natural ~300px width. The tilt
          transform + sheen live ON the slab element itself. Cards with
          no resolved art get the same slab treatment via
          GradedSlabVisual's no-art case window (grader label + quiet
          set/# window) — the old dark-stage text fallback (grader chip
          + name + cert + value printed on a backdrop) is gone; cert
          and value live in the detail's kicker/meta and value tiles. */}
      <div style={{ perspective: "900px", width: "min(300px, 100%)" }}>
        <div ref={ref} aria-hidden="true" onPointerMove={e => setFromPoint(e.clientX, e.clientY)} onPointerLeave={reset} className="holo-slab gslab select-none"
          style={{ transform: "rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))", cursor: "default", ["--mx" as string]: "50%", ["--my" as string]: "38%" }}>
          <GradedSlabVisual card={card} />
          <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: 3, borderRadius: "inherit", background: "radial-gradient(420px circle at var(--mx) var(--my), rgba(255,255,255,0.30), transparent 46%)", pointerEvents: "none" }} />
          <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: 3, borderRadius: "inherit", background: "linear-gradient(115deg, transparent 30%, rgba(255,113,206,0.10) 45%, rgba(1,205,254,0.14) 55%, transparent 70%)", pointerEvents: "none" }} />
        </div>
      </div>
      <p className="text-[11px] mt-2 flex flex-wrap items-center gap-2" style={{ color: "var(--faint)" }}>
        <span>Holofoil slab preview — move your pointer{tiltOn ? " or tilt your device" : ""} across it. Purely presentational; all figures live in the text alongside.</span>
        {!reduced && !tiltOn && (needsPermission || (typeof window !== "undefined" && "DeviceOrientationEvent" in window)) && <button onClick={enableTilt} aria-label="Enable device tilt for the holofoil slab preview" className="rounded-full px-3 py-1.5 text-[11px] font-bold border" style={{ borderColor: "var(--border)", color: "var(--accent-ink)" }}>Enable tilt 📱</button>}
        {tiltOn && <span style={{ color: "var(--hold)" }}>Tilt on ✓</span>}
      </p>
    </div>
  );
}

/* ——— V2 helpers ——— */
type V2 = Portfolio["v2"];
type ExitDraft = V2["exits"][number];
function Sparkline({ values, width = 64, height = 20 }: { values: number[]; width?: number; height?: number }) {
  if (values.length === 0) return <span className="text-[11px]" style={{ color: "var(--faint)" }}>no series</span>;
  if (values.length === 1) return <svg width={width} height={height} aria-hidden><circle cx={width / 2} cy={height / 2} r="3" fill="var(--accent)" /></svg>;
  const min = Math.min(...values); const max = Math.max(...values); const range = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * (width - 4) + 2},${height - 3 - ((v - min) / range) * (height - 6)}`).join(" ");
  const up = (values[values.length - 1] ?? 0) >= (values[0] ?? 0);
  return <svg width={width} height={height} aria-hidden><polyline points={pts} fill="none" stroke={up ? "var(--hold)" : "var(--sell)"} strokeWidth="2" /></svg>;
}
function DeltaChip({ value }: { value: number | null }) {
  if (value == null) return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--surface-alt)", color: "var(--faint)" }}>no 30d data</span>;
  const up = value >= 0;
  const signed = `${up ? "+" : "-"}${Math.abs(value).toFixed(1)}%`;
  return <span className="num text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: up ? "rgba(63,182,143,0.15)" : "rgba(224,90,58,0.15)", color: up ? "var(--hold)" : "var(--sell)" }} role="img" aria-label={`${up ? "Gain" : "Loss"} ${signed}`}><span aria-hidden>{up ? "▲" : "▼"} {signed}</span></span>;
}

/* ——— Decision block data (Oct 9): the standalone Advisor Calls
   section was retired — each card's call now lives in its expanded
   detail as a Decision block (badge + Pros / Cons). For the eight
   desk-note cards, the stored note's points are split into the two
   columns below (facts taken from the notes themselves; the other
   column's counterpoint comes from the card's own data — pop, latest
   sale vs held value, concentration — never invented opinion). Every
   other card gets its note split by sentence plus data counterpoints
   from decisionFor(). No calls, values or note facts change. */
const DECISION_SPLITS: Record<string, { pros: string[]; cons: string[] }> = {
  /* Demo export: no curated per-cert splits. The private deployment
     curates splits for specific certs here; every other card's
     Decision block is derived from its stored note plus its own
     data points. */
};
function decisionFor(card: Card, ctx: { verifiedSales: number; changePct: number | null; sharePct: number | null }): { pros: string[]; cons: string[] } {
  const curated = DECISION_SPLITS[card.cert];
  if (curated) return curated;
  const pros: string[] = []; const cons: string[] = [];
  const CON = /unverified|concentration|risk|volatil|high pop|caps|down |soften|no price|no vault|excluded|premium/i;
  const PRO = /scarce|scarcity|liquid|demand|support|strength|beloved|iconic|blue-chip|steady|anchor/i;
  for (const sent of card.advisorReason.split(/(?<=[.!])\s+/).map(t => t.trim()).filter(Boolean)) {
    if (CON.test(sent)) cons.push(sent);
    else if (PRO.test(sent)) pros.push(sent);
    else (card.advisorCall.includes("SELL") || card.advisorCall.includes("TRIM") ? cons : pros).push(sent);
  }
  if (ctx.verifiedSales > 0) pros.push(`Data point: ${ctx.verifiedSales} verified sale${ctx.verifiedSales === 1 ? "" : "s"} on file — the value has sold evidence behind it.`);
  else cons.push("Data point: no verified sales on file — the value rests on the vault estimate / aggregator context.");
  if (card.popInfo) {
    const m = card.popInfo.replace(/,/g, "").match(/(\d{3,})/);
    if (m && Number(m[1]) >= 5000) cons.push(`Data point: high population on file (${card.popInfo}) — supply caps upside.`);
    else pros.push(`Data point: population on file — ${card.popInfo}.`);
  }
  if (ctx.sharePct != null && ctx.sharePct >= 10) cons.push(`Data point: concentration — this card is ≈${ctx.sharePct.toFixed(1)}% of the priced portfolio.`);
  else if (ctx.sharePct != null) pros.push(`Data point: position is ≈${ctx.sharePct.toFixed(1)}% of the priced portfolio — limited single-card concentration.`);
  if (ctx.changePct != null && ctx.changePct !== 0) {
    if (ctx.changePct < 0) cons.push(`Data point: verified sales trend ${ctx.changePct.toFixed(1)}% across the recorded sales.`);
    else pros.push(`Data point: verified sales trend +${ctx.changePct.toFixed(1)}% across the recorded sales.`);
  }
  if (card.effectiveUsd == null) cons.push("Data point: unpriced — no official value yet, so no exit math is possible.");
  if (pros.length === 0) pros.push("Data point: no material positive in the card's data beyond the call itself.");
  if (cons.length === 0) cons.push("Data point: no material counterpoint in the card's data (pop, sales, concentration) right now.");
  return { pros, cons };
}

function ExitDraftCard({ draft, onUpdate }: { draft: ExitDraft; onUpdate: (args: { id: number; status: "draft" | "listed" | "sold"; salePrice?: number | null; soldDate?: string | null }) => void }) {
  const [price, setPrice] = useState("");
  const checklist = ["Front of slab — straight on, no glare", "Back of slab", "Cert number close-up", "Holo / surface angle shot", "Edges & corners detail", "Any flaw — photographed honestly"];
  return (
    <article className="rounded-2xl p-4" style={{ background: "var(--glass)", border: "1px solid var(--hairline)" }}>
      <p className="font-semibold leading-snug">{draft.title}</p>
      <p className="text-xs mt-1" style={{ color: "var(--dim)" }}>Status: <strong style={{ color: "var(--text)" }}>{draft.status}</strong> · Suggested price: <strong className="num">{fmt(draft.suggestedPrice)}</strong> <span>({draft.priceSource})</span></p>
      <p className="text-sm mt-2 leading-relaxed whitespace-pre-wrap" style={{ color: "var(--dim)" }}>{draft.description}</p>
      <p className="kicker mt-3" style={{ color: "var(--faint)" }}>Photo checklist</p>
      <ul className="mt-1 grid gap-1 text-sm" style={{ color: "var(--dim)" }}>{checklist.map(item => <li key={item}>☐ {item}</li>)}</ul>
      {draft.status === "sold" ? (
        <p className="mt-3 text-sm font-semibold">Sold ledger: <span className="num">{fmt(draft.salePrice)}</span> · fee est. <span className="num">{fmt(draft.feeEstimate)}</span> (13% estimate) · net <span className="num" style={{ color: "var(--hold)" }}>{fmt(draft.netUsd)}</span> · {draft.soldDate ?? ""}</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {draft.status === "draft" && <button onClick={() => onUpdate({ id: draft.id, status: "listed" })} aria-label={`Mark ${draft.cardName} draft as listed`} className="touch-target rounded-full px-4 py-2 text-sm font-bold border" style={{ borderColor: "var(--accent)", color: "var(--accent-ink)" }}>Mark listed</button>}
          <input aria-label={`Sale price for ${draft.cardName}`} value={price} onChange={e => setPrice(e.target.value)} inputMode="decimal" placeholder="Sale price $" className="touch-target rounded-full px-4 py-2 text-sm outline-none" style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", minWidth: 130 }} />
          <button onClick={() => { const n = Number(price); if (!isNaN(n) && n > 0) onUpdate({ id: draft.id, status: "sold", salePrice: n }); }} aria-label={`Mark ${draft.cardName} as sold`} className="touch-target rounded-full px-4 py-2 text-sm font-bold" style={{ background: "var(--hold)", color: "var(--ink-on-fill)" }}>Mark sold</button>
        </div>
      )}
    </article>
  );
}

/* ——— Cost basis block (Remedies pass 1, Oct 13, 2026 — audit remedy
   P0-3) — lives on the card detail page only, next to the value /
   Decision area. Cost on file → cost, current official value, and
   unrealized P&L ($ and %, ▲/▼ signed, never colour-only). No cost →
   an honest "No cost on file" plus an inline add form (amount,
   optional note, optional date). Editing and clearing supported.
   Nothing is ever pre-filled or estimated: the owner's vault CSV cost
   column was blank, so a cost exists only when he types one in. ——— */
function CardCostBlock({ card, onSave, saving }: { card: Card; onSave: (args: { cert: string; costUsd: number | null; note?: string | null; date?: string | null }) => void; saving: boolean }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const hasCost = card.costBasisUsd != null;
  const openForm = () => {
    setAmount(hasCost ? String(card.costBasisUsd) : "");
    setNote(card.costNote ?? "");
    setDate(card.costDate ?? "");
    setEditing(true);
  };
  const submit = () => {
    const n = Number(amount);
    if (isNaN(n) || n < 0) return;
    onSave({ cert: card.cert, costUsd: n, note: note.trim() ? note.trim() : null, date: date ? date : null });
    setEditing(false);
  };
  const pl = card.unrealizedPlUsd;
  const plUp = (pl ?? 0) >= 0;
  const inputCls = "touch-target rounded-full px-4 py-2 text-sm outline-none w-full min-w-0";
  const inputStyle = { border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" } as const;
  return (
    <div className="mt-4 rounded-2xl p-4" style={{ background: "var(--glass)", border: "1px solid var(--hairline)" }} role="group" aria-label={`Cost basis for ${card.name}`}>
      <p className="kicker" style={{ color: "var(--faint)" }}>💰 Cost basis — what you paid</p>
      {hasCost && !editing && (
        <div className="mt-3 grid gap-2 text-sm">
          <p className="rounded-xl px-3 py-2 leading-relaxed" style={{ background: "var(--surface-alt)" }}>
            <strong>Cost:</strong> <strong className="num">{fmt(card.costBasisUsd)}</strong>
            {card.costDate ? <span style={{ color: "var(--dim)" }}> · paid {card.costDate}</span> : null}
            {card.costNote ? <span className="block mt-0.5" style={{ color: "var(--dim)" }}>{card.costNote}</span> : null}
          </p>
          <p className="rounded-xl px-3 py-2 leading-relaxed" style={{ background: "var(--surface-alt)" }}>
            <strong>Current official value:</strong> <strong className="num">{fmt(card.effectiveUsd)}</strong>
            {pl != null && (
              <> · <strong>Unrealized P&amp;L:</strong>{" "}
                <span className="num font-bold" style={{ color: plUp ? "var(--hold)" : "var(--sell)" }} aria-label={`Unrealized ${plUp ? "gain" : "loss"} of ${fmt(Math.abs(pl))}${card.unrealizedPlPct != null ? `, ${Math.abs(card.unrealizedPlPct).toFixed(1)} percent` : ""}`}>{plUp ? "▲ +" : "▼ −"}{fmt(Math.abs(pl))}{card.unrealizedPlPct != null ? ` (${card.unrealizedPlPct > 0 ? "+" : ""}${card.unrealizedPlPct.toFixed(1)}%)` : ""}</span>
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={openForm} disabled={saving} aria-label={`Edit cost basis for ${card.name}`} className="touch-target rounded-full px-4 py-2 text-sm font-bold border disabled:opacity-50" style={{ borderColor: "var(--accent)", color: "var(--accent-ink)" }}>✎ Edit cost</button>
            <button onClick={() => onSave({ cert: card.cert, costUsd: null })} disabled={saving} aria-label={`Clear cost basis for ${card.name}`} className="touch-target rounded-full px-4 py-2 text-sm font-bold border disabled:opacity-50" style={{ borderColor: "var(--hairline)", color: "var(--dim)" }}>Clear</button>
          </div>
        </div>
      )}
      {!hasCost && !editing && (
        <div className="mt-3">
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}><strong style={{ color: "var(--text)" }}>No cost on file.</strong> Unrealized P&amp;L can&apos;t be computed for this card until you record what you paid — nothing is estimated or back-filled.</p>
          <button onClick={openForm} disabled={saving} aria-label={`Add cost basis for ${card.name}`} className="touch-target mt-2 rounded-full px-4 py-2 text-sm font-bold border disabled:opacity-50" style={{ borderColor: "var(--accent)", color: "var(--accent-ink)" }}>+ Add cost</button>
        </div>
      )}
      {editing && (
        <form className="mt-3 grid gap-2" onSubmit={e => { e.preventDefault(); submit(); }}>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="grid gap-1 text-xs font-bold" style={{ color: "var(--dim)" }}>Amount paid (USD) *
              <input aria-label={`Amount paid for ${card.name} in US dollars`} value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" placeholder="e.g. 450" className={inputCls} style={inputStyle} />
            </label>
            <label className="grid gap-1 text-xs font-bold" style={{ color: "var(--dim)" }}>Purchase date (optional)
              <input aria-label={`Purchase date for ${card.name}`} type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} style={inputStyle} />
            </label>
            <label className="grid gap-1 text-xs font-bold" style={{ color: "var(--dim)" }}>Note (optional)
              <input aria-label={`Cost note for ${card.name}`} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. eBay, Oct 2025" className={inputCls} style={inputStyle} />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={saving || amount.trim() === "" || isNaN(Number(amount)) || Number(amount) < 0} aria-label={`Save cost basis for ${card.name}`} className="touch-target rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50" style={{ background: "var(--hold)", color: "var(--ink-on-fill)" }}>Save cost</button>
            <button type="button" onClick={() => setEditing(false)} disabled={saving} aria-label="Cancel cost editing" className="touch-target rounded-full px-4 py-2 text-sm font-bold border disabled:opacity-50" style={{ borderColor: "var(--hairline)", color: "var(--dim)" }}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

export function App() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["portfolio"], queryFn: () => api.getPortfolio({}) });
  const refresh = useMutation({ mutationFn: () => api.refreshPrices({}), onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio"] }) });

  const [search, setSearch] = useState("");
  const [graderFilter, setGraderFilter] = useState("All");
  const [eraFilter, setEraFilter] = useState("All");
  const [callFilter, setCallFilter] = useState("All");
  const [sortKey, setSortKey] = useState<"value" | "year" | "grade" | "name">("value");
  const [selectedCert, setSelectedCert] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const updateVal = useMutation({
    mutationFn: (args: { cert: string; checkedUsd: number | null }) => api.updateCardValue(args),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio"] }),
  });
  const updateWatch = useMutation({
    mutationFn: (args: { id: number; status: string }) => api.updateWatchlistItem(args),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio"] }),
  });
  const passDealMut = useMutation({
    mutationFn: (args: { id: number }) => api.passDeal(args),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio"] }),
  });
  const findingStatusMut = useMutation({
    mutationFn: (args: { id: number; status: "bought" | "gone" | "live" }) => api.updateFindingStatus(args),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio"] }),
  });
  const sweepMut = useMutation({
    mutationFn: () => api.scoutSweep({}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio"] }),
  });
  /* ——— V2 state ——— */
  const exitDraftMut = useMutation({ mutationFn: (args: { cert: string }) => api.createExitDraft(args), onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio"] }) });
  const exitUpdateMut = useMutation({ mutationFn: (args: { id: number; status: "draft" | "listed" | "sold"; salePrice?: number | null; soldDate?: string | null }) => api.updateExitDraft(args), onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio"] }) });
  const updateCostMut = useMutation({ mutationFn: (args: { cert: string; costUsd: number | null; note?: string | null; date?: string | null }) => api.updateCardCost(args), onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio"] }) });
  const passListingMut = useMutation({ mutationFn: (args: { id: number }) => api.passListing(args), onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio"] }) });
  /* Closed / Ended (Oct 12, 2026): files the finding Gone with an
     owner-reported reason — terminal across both stores, so sweeps
     and refreshes can never bring the listing back. */
  const endFindingMut = useMutation({ mutationFn: (args: { source: "deal" | "listing"; id: number }) => api.markFindingEnded(args), onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio"] }) });
  /* Density is TERMINAL, permanently (Oct 9): there is no density
     switch anywhere in the UI. Any 'v2-density' preference stored by
     an older build is cleared on load so it can never stick. */
  const density = "terminal" as const;
  useEffect(() => { try { window.localStorage.removeItem("v2-density"); } catch { /* private mode */ } }, []);
  /* The Home digest UI was REMOVED at the owner's order (phase 2,
     Oct 13, 2026): no digest bar, tiles, Details disclosure, mark-seen
     or re-open control renders anywhere. The 'v2-last-visit' value is
     no longer read or written by the client; server-side digest
     computation and deal-alert recording are untouched, and the
     freshness line from the old block renders standalone on Home. */
  /* ——— UI theme (Vapor Vault): ALWAYS Auto ———
     The vapor theme follows the device via prefers-color-scheme and
     reacts LIVE when the OS setting changes while the page is open.
     There is no in-app Light/Dark override. Any previously persisted
     'v2-ui-theme' preference is cleared on load so an old manual
     choice can't stick. The resolved theme is written to <html
     data-ui-theme> — the pre-paint script in index.html resolves it
     the same way before first paint; this effect keeps it in sync.
     Panels follow the UI theme, never the town's day/night clock. */
  const [systemDark, setSystemDark] = useState<boolean>(() => { try { return window.matchMedia("(prefers-color-scheme: dark)").matches; } catch { return true; } });
  useEffect(() => { try { window.localStorage.removeItem("v2-ui-theme"); } catch { /* private mode */ } }, []);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const uiTheme = systemDark ? "dark" : "light";
  /* Theme-aware chart tick (design pass, Oct 13): resolved hex per UI
     theme because Recharts writes tick fill as an SVG attribute (CSS
     var() does not resolve there). Night #cfc4ec = 10.46:1 and Day
     #57467e = 7.96:1 against the panel surface. */
  const chartTick = { fill: uiTheme === "dark" ? "#cfc4ec" : "#57467e", fontSize: 11 } as const;
  useEffect(() => {
    document.documentElement.dataset.uiTheme = uiTheme;
    document.documentElement.style.colorScheme = uiTheme;
  }, [uiTheme]);
  /* ——— Smart-sticky command strip ———
     The strip sticks at the top, slides away (transform only — its
     flow space stays, so content never jumps) after ~12px of
     accumulated scroll-DOWN travel, and pops back after ~6px of
     scroll-UP travel: direction hysteresis, no flicker on jitter.
     Always visible in the top zone, while the card detail page is
     open, or while focus is inside the strip (CSS :focus-within also
     forces it back — keyboard-safe). Only the page's main scroll region drives it;
     inner scrollers (the detail sheet, tables) are ignored. Nothing
     is persisted — this is default behavior in every density mode. */
  const [stripHidden, setStripHidden] = useState(false);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const detailBackRef = useRef<HTMLButtonElement | null>(null);
  type DetailOrigin = { group: NavGroupId; sub: NavSubId | null; show: boolean; hub: string; scrollY: number };
  const detailOriginRef = useRef<DetailOrigin | null>(null);
  const lastFocusRef = useRef<Element | null>(null);
  const stripScrollRef = useRef({ lastY: 0, down: 0, up: 0 });
  const selectedCertRef = useRef<string | null>(null);
  useEffect(() => { selectedCertRef.current = selectedCert; if (selectedCert != null) setStripHidden(false); }, [selectedCert]);
  useEffect(() => {
    const TOP_ZONE = 140; const HIDE_AFTER = 12; const SHOW_AFTER = 6;
    const onScroll = (e: Event) => {
      /* The listener sits on the document in the CAPTURE phase, so it
         sees every scroll in the page whatever element actually
         scrolls (viewport, embed wrapper, or main column). Only the
         genuinely-inner scrollers are ignored: horizontal table
         scrollers. The detail page's own scroll is the page scroll,
         and the selectedCert lock below keeps the bar visible there. */
      const t = e.target as Element | null;
      if (t && typeof t.closest === "function" && t.closest('.table-scroll')) return;
      const y = Math.max(0, window.scrollY || document.documentElement?.scrollTop || (t && typeof (t as HTMLElement).scrollTop === "number" ? (t as HTMLElement).scrollTop : 0));
      const st = stripScrollRef.current;
      const dy = y - st.lastY; st.lastY = y;
      const el = stripRef.current;
      const focusInside = !!el && !!document.activeElement && el.contains(document.activeElement);
      if (y <= TOP_ZONE || selectedCertRef.current != null || focusInside) { st.down = 0; st.up = 0; setStripHidden(false); return; }
      if (dy > 0) { st.down += dy; st.up = 0; if (st.down >= HIDE_AFTER) setStripHidden(true); }
      else if (dy < 0) { st.up += -dy; st.down = 0; if (st.up >= SHOW_AFTER) setStripHidden(false); }
    };
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => document.removeEventListener("scroll", onScroll, { capture: true });
  }, []);

  /* Card DETAIL PAGE behaviour — the detail is a PAGE, not a dialog:
     no focus trap, no Esc-close, no overlay. Opening it (selectedCert
     goes null → cert) starts the page at the top and lands focus on
     the ← Back button; switching cards inside the page (sibling
     copies) does not re-run this. ← Back (closeDetail) restores the
     origin view, scroll position and invoking control's focus. */
  const detailPageOpen = selectedCert != null;
  useEffect(() => {
    if (!detailPageOpen) return;
    window.scrollTo({ top: 0 });
    const t = setTimeout(() => { detailBackRef.current?.focus({ preventScroll: true }); }, 40);
    return () => clearTimeout(t);
  }, [detailPageOpen]);
  const [heatmapMode, setHeatmapMode] = useState<"portfolio" | "watchlist">("portfolio");
  const [v2Tab, setV2Tab] = useState<string>("none");
  const [showQ, setShowQ] = useState("");
  const [showCert, setShowCert] = useState<string | null>(null);
  /* ——— Show Mode camera scan (cert / QR photo → OCR) ———
     The camera button inside the search photographs the slab label; the
     photo is downscaled on-device, QR-decoded on-device when the browser
     supports BarcodeDetector, then read by the scanSlabPhoto action
     (vision OCR). The photo is processed in memory only — never saved.
     A scan only ever loads a verdict for a cert/name the dashboard
     already tracks; untracked reads surface as candidates to verify. */
  const scanInputRef = useRef<HTMLInputElement | null>(null);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const applyScanCert = (cert: string) => { setShowCert(cert); setShowQ(cert); };
  const handleScanFile = async (file: File) => {
    setScanError(null); setScanResult(null); setScanBusy(true);
    setScanPreview(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
    try {
      let qrPayload: string | null = null;
      try {
        const BD = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (src: ImageBitmap) => Promise<{ rawValue?: string }[]> } }).BarcodeDetector;
        if (BD) {
          const bmp = await createImageBitmap(file);
          const codes = await new BD({ formats: ["qr_code"] }).detect(bmp);
          bmp.close();
          if (codes[0]?.rawValue) qrPayload = String(codes[0].rawValue).slice(0, 2000);
        }
      } catch { /* QR decode is best-effort — OCR still runs */ }
      let payload: { dataBase64: string; mimeType: string } | null = null;
      try {
        const bmp = await createImageBitmap(file);
        const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bmp.width * scale));
        canvas.height = Math.max(1, Math.round(bmp.height * scale));
        const cx = canvas.getContext("2d");
        if (!cx) throw new Error("no canvas");
        cx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
        bmp.close();
        const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, "image/jpeg", 0.88));
        if (!blob) throw new Error("encode failed");
        payload = await fileToBase64(blob);
      } catch {
        if (file.type === "image/jpeg" || file.type === "image/png") payload = await fileToBase64(file);
        else throw new Error("That photo format couldn't be processed on this device — retake it (standard JPEG photos work best), or type the cert.");
      }
      const res = await api.scanSlabPhoto({ imageBase64: payload.dataBase64, mimeType: payload.mimeType === "image/png" ? "image/png" : "image/jpeg", qrPayload });
      setScanResult(res);
      const certMatch = res.matches.find(m => res.certCandidates.includes(m.cert));
      if (certMatch) applyScanCert(certMatch.cert);
      else if (res.matches.length === 1) applyScanCert(res.matches[0]!.cert);
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "Scan failed — try again, or type the cert number.");
    } finally { setScanBusy(false); }
  };
  const [lineageCert, setLineageCert] = useState<string>("DEMO-1001");
  const [newLineageCert, setNewLineageCert] = useState("");
  const [newLineageLabel, setNewLineageLabel] = useState("");
  const lineageAddMut = useMutation({ mutationFn: (args: { cert: string; label: string }) => api.addLineageWatch({ cert: args.cert, label: args.label, relation: "watched" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio"] }) });
  const lineageRemoveMut = useMutation({ mutationFn: (args: { cert: string }) => api.removeLineageWatch(args), onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio"] }) });
  const exportLineage = async (cert: string) => {
    const res = await api.exportLineage({ cert });
    if (!res.exported) return;
    const blob = new Blob([res.record], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `slab-lineage-${cert}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  const [trenchIdx, setTrenchIdx] = useState(0);
  /* ——— Grouped navigation (Oct 9 regrouping) ———
     The 11-pill surfaces bar is replaced by FIVE top-level groups —
     Home · Deals · Vault · Scouts · Insights — each with a quieter
     sub-nav shown only inside that group. Show Mode is not a tab:
     it launches only from the mobile floating camera button
     (.show-mode-fab) — there is no Show Mode button in the desktop
     top bar. Every former destination is re-homed, nothing deleted:
       Deals  › Trenches (hub) · Ledger (findings-ledger) · Market
                (Market Terminal section + Bid/Ask + Exit hub)
       Vault  › Collection · Watch · Lineage (hub)
       Scouts › League (scout row + sweeps + Paper League hub) · Town
                (NPC hub + Seasonal Events hub)
       Insights › Growth (Indices hub + allocation/momentum) · Risk
     navGroup/navSub are the state; v2Tab is kept in sync for the
     .v2-hub CSS folds, and non-hub sections are gated by the same
     state (see `vis` below). No state is reset on switching, so
     filters and scroll-independent state persist.
     Hub sections are display:none until the state lands, so scrolling
     waits a tick for the section to render open. */
  type NavGroupId = "home" | "deals" | "vault" | "scouts" | "insights";
  type NavSubId = "trenches" | "ledger" | "market" | "collection" | "watch" | "lineage" | "league" | "town" | "growth" | "risk";
  const NAV_GROUPS: { id: NavGroupId; label: string; name: string; subs: { id: NavSubId; label: string }[] }[] = [
    { id: "home", label: "Home", name: "Home", subs: [] },
    { id: "deals", label: "Deals", name: "Deals", subs: [{ id: "trenches", label: "Trenches" }, { id: "ledger", label: "Ledger" }, { id: "market", label: "Market" }] },
    { id: "vault", label: "Vault", name: "Vault", subs: [{ id: "collection", label: "Collection" }, { id: "watch", label: "Watch" }, { id: "lineage", label: "Lineage" }] },
    { id: "scouts", label: "Scouts", name: "Scouts", subs: [{ id: "league", label: "League" }, { id: "town", label: "Town" }] },
    { id: "insights", label: "Insights", name: "Insights", subs: [{ id: "growth", label: "Growth" }, { id: "risk", label: "Risk" }] },
  ];
  /* Launcher tile metadata: each tile carries a designed SVG glyph
     (LAUNCHER_GLYPHS, phase 2 — the stock emoji medallions are gone),
     its label, and a one-line description. */
  const LAUNCHER_META: Record<NavSubId, { desc: string }> = {
    trenches: { desc: "Triage the firehose — keep, pass, open" },
    ledger: { desc: "Every find, tracked" },
    market: { desc: "Live listings vs market value" },
    collection: { desc: "Every graded card you own" },
    watch: { desc: "Targets the scouts hunt" },
    lineage: { desc: "Cert biographies & siblings" },
    league: { desc: "Paper-trading standings" },
    town: { desc: "The living town — full screen" },
    growth: { desc: "Value over time & forecasts" },
    risk: { desc: "Pumps, dilution & concentration" },
  };
  const NAV_DEFAULT_SUB: Record<NavGroupId, NavSubId | null> = { home: null, deals: "trenches", vault: "collection", scouts: "league", insights: "growth" };
  const NAV_HUB_FOR: Partial<Record<NavSubId, string>> = { trenches: "deals", market: "market", lineage: "lineage", league: "scouts", town: "town", growth: "growth", risk: "risk" };
  const NAV_TARGET_FOR: Partial<Record<NavSubId, string>> = { trenches: "v2-trenches", ledger: "findings-ledger", market: "v2-terminal", collection: "v2-collection", watch: "v2-watchlist", lineage: "v2-lineage", league: "v2-league", town: "v2-npc", growth: "v2-indices", risk: "v2-risk" };
  const [navGroup, setNavGroup] = useState<NavGroupId>("home");
  const [navSub, setNavSub] = useState<NavSubId | null>(null);
  const [showOpen, setShowOpen] = useState(false);
  const activeSub: NavSubId | null = navSub ?? NAV_DEFAULT_SUB[navGroup];
  /* ——— Launcher state (Glass Vault phase 1) ———
     Tapping a group WITH sub-surfaces opens the launcher (and lands
     on the group's default sub, exactly like the chips did); tapping
     the already-open group closes it. Esc closes; focus is trapped
     while open and returns to the invoking pill on close. Home has
     no sub-surfaces and never opens a launcher. */
  const [launcherGroup, setLauncherGroup] = useState<NavGroupId | null>(null);
  const launcherRef = useRef<HTMLDivElement | null>(null);
  const launcherInvokerRef = useRef<HTMLElement | null>(null);
  const closeLauncher = (returnFocus = true) => {
    setLauncherGroup(null);
    if (returnFocus) {
      const inv = launcherInvokerRef.current;
      window.setTimeout(() => { if (inv && document.contains(inv)) inv.focus({ preventScroll: true }); }, 30);
    }
    launcherInvokerRef.current = null;
  };
  useEffect(() => {
    if (!launcherGroup) return;
    const t = window.setTimeout(() => { launcherRef.current?.querySelector<HTMLButtonElement>(".launcher-tile")?.focus({ preventScroll: true }); }, 40);
    return () => window.clearTimeout(t);
  }, [launcherGroup]);
  const onLauncherKeyDown = (e: { key: string; shiftKey: boolean; preventDefault: () => void }) => {
    if (e.key === "Escape") { e.preventDefault(); closeLauncher(true); return; }
    if (e.key !== "Tab") return;
    const panel = launcherRef.current; if (!panel) return;
    const items = Array.from(panel.querySelectorAll<HTMLElement>("button"));
    if (items.length === 0) return;
    const first = items[0]!; const last = items[items.length - 1]!;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  const goNav = (group: NavGroupId, sub?: NavSubId | null) => {
    /* Any top-level navigation exits the card detail page (it is a view
       state, not an overlay) and discards the saved Back origin. */
    setSelectedCert(null);
    detailOriginRef.current = null;
    const s = sub !== undefined ? sub : NAV_DEFAULT_SUB[group];
    setShowOpen(false);
    setNavGroup(group);
    setNavSub(s);
    setV2Tab(s ? (NAV_HUB_FOR[s] ?? "none") : "none");
    const target = s ? NAV_TARGET_FOR[s] : undefined;
    if (!target) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    window.setTimeout(() => { const el = document.getElementById(target); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
  };
  const openGroup = (group: NavGroupId, invoker: HTMLElement | null) => {
    const g = NAV_GROUPS.find(x => x.id === group);
    if (!g || g.subs.length === 0) { setLauncherGroup(null); goNav(group); return; }
    if (launcherGroup === group && navGroup === group && !showOpen && !detailPageOpen) { closeLauncher(true); return; }
    launcherInvokerRef.current = invoker;
    if (navGroup !== group || showOpen || detailPageOpen) goNav(group);
    setLauncherGroup(group);
  };
  const openShowMode = () => {
    setSelectedCert(null);
    detailOriginRef.current = null;
    setLauncherGroup(null);
    setShowOpen(true);
    setV2Tab("show");
    window.setTimeout(() => { const el = document.getElementById("v2-show"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
  };
  /* ——— Card DETAIL PAGE navigation ———
     openCardDetail swaps the current view for the card's dedicated
     detail page. The FIRST open (from a list/search/lineage surface)
     captures the exact origin — nav group, sub-view, Show Mode state,
     hub tab and scroll position — plus the invoking control, so
     closeDetail (the page's ← Back button) returns the user to exactly
     where they came from. Switching cards INSIDE the page (sibling
     copies) keeps the original origin. Filters are component state
     throughout and are never reset by either direction. */
  const openCardDetail = (cert: string) => {
    setLauncherGroup(null);
    if (selectedCertRef.current == null) {
      detailOriginRef.current = {
        group: navGroup,
        sub: navSub,
        show: showOpen,
        hub: v2Tab,
        scrollY: Math.max(0, window.scrollY || document.documentElement?.scrollTop || document.body?.scrollTop || 0),
      };
      lastFocusRef.current = document.activeElement;
    }
    setSelectedCert(cert);
  };
  const closeDetail = () => {
    const o = detailOriginRef.current;
    detailOriginRef.current = null;
    setSelectedCert(null);
    if (o) {
      setShowOpen(o.show);
      setNavGroup(o.group);
      setNavSub(o.sub);
      setV2Tab(o.hub);
    }
    window.setTimeout(() => {
      window.scrollTo({ top: o?.scrollY ?? 0 });
      try { document.documentElement.scrollTop = o?.scrollY ?? 0; } catch { /* viewport scroll is primary */ }
      const prev = lastFocusRef.current as HTMLElement | null;
      if (prev && document.contains(prev) && typeof prev.focus === "function") prev.focus({ preventScroll: true });
    }, 80);
  };
  /* Section visibility gate for the non-hub sections, driven by the
     grouped-nav state (hub sections fold via .v2-hub CSS + v2Tab). */
  const vis = (cond: boolean): CSSProperties | undefined => cond ? undefined : { display: "none" };
  const inGroup = (g: NavGroupId, s?: NavSubId) => !showOpen && navGroup === g && (s === undefined || activeSub === s);
  const surfaceNavRef = useRef<HTMLElement | null>(null);
  /* Arrow-key travel inside the nav (Left / Right / Home / End move
     focus; Tab order stays the natural DOM order, one stop per item). */
  const onSurfaceNavKey = (e: { key: string; preventDefault: () => void }) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
    const nav = surfaceNavRef.current;
    if (!nav) return;
    const items = Array.from(nav.querySelectorAll<HTMLButtonElement>("button"));
    if (items.length === 0) return;
    const idx = items.indexOf(document.activeElement as HTMLButtonElement);
    if (idx < 0) return;
    e.preventDefault();
    const next = e.key === "Home" ? items[0]! : e.key === "End" ? items[items.length - 1]! : items[(idx + (e.key === "ArrowRight" ? 1 : -1) + items.length) % items.length]!;
    next.focus();
  };
  /* Findings Ledger filters — one primary axis (tier tabs) + chips */
  const [ledgerTier, setLedgerTier] = useState<"all" | "pinned" | "close" | "stale" | "sightings" | "acquired" | "expired">("all");
  const [ledgerScout, setLedgerScout] = useState("All");
  const [ledgerMarket, setLedgerMarket] = useState("All");
  const [ledgerGroup, setLedgerGroup] = useState("All");
  const [ledgerStatus, setLedgerStatus] = useState("All");
  const [ledgerShowExpired, setLedgerShowExpired] = useState(false);
  /* Collapsible logs — BOTH logs (sweep log + change log) use the same
     pattern: collapsed by default, header always visible with the newest
     entry's one-line headline + chevron, expanding in place.
     CHANGE LOG (Oct 9, the owner: "change log needs to be collapsed on
     load"): it now ALWAYS starts collapsed on load — no localStorage
     memory. The old remembered-open state meant one past expansion
     kept it open on every later visit, which is exactly what the owner
     reported. Expanding still works in place for that visit. The sweep
     log keeps its remembered choice. Any stale "log-open-change"
     value left in a browser is simply ignored now. */
  const [sweepLogOpen, setSweepLogOpen] = useState<boolean>(() => { try { return window.localStorage.getItem("log-open-sweep") === "1"; } catch { return false; } });
  const [changeLogOpen, setChangeLogOpen] = useState<boolean>(false);
  useEffect(() => { try { window.localStorage.setItem("log-open-sweep", sweepLogOpen ? "1" : "0"); } catch { /* private mode */ } }, [sweepLogOpen]);
  /* Market Terminal filters */
  const [termSearch, setTermSearch] = useState("");
  const [termMaxPct, setTermMaxPct] = useState(150);
  const [termMaxPrice, setTermMaxPrice] = useState("");
  const [termGrade, setTermGrade] = useState("All");
  const [termShips, setTermShips] = useState("All");
  const [termHideLowVol, setTermHideLowVol] = useState(false);
  const [termType, setTermType] = useState("All");

  /* ——— Time-of-day: viewer's local clock, recomputed every 30s so the
     phase crossfades on its own while the page sits open — no reload. ——— */
  const [todNow, setTodNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setTodNow(new Date()), 30000);
    return () => window.clearInterval(t);
  }, []);
  /* Town clock is ALWAYS on Auto — no override state exists. Clear any
     previously persisted 'tod-override' so no user stays stuck on a
     manual phase from an older build. */
  useEffect(() => { try { window.localStorage.removeItem("tod-override"); } catch { /* private mode */ } }, []);
  const todReduced = usePrefersReducedMotion();
  /* Overscroll / body backdrop: the vapor sky base (Glass Vault) —
     the town grass no longer backs data surfaces. The sky gradient
     itself lives in theme.css per UI theme; this only keeps the
     flat overscroll colour in step. */
  useEffect(() => {
    try { document.body.style.backgroundColor = systemDark ? "#160a30" : "#e9e1fb"; } catch { /* no document in SSR-ish probe */ }
  }, [systemDark]);

  const data = q.data;
  /* Passed suggestions render NOWHERE: the server already withholds them,
     and this client filter is the second lock — the instant the owner picks
     Pass, the card is gone from watchlist, vintage, warnings and avoids,
     and no refresh can bring it back (its record stays Passed in the data). */
  const isPassed = (w: WatchItem) => ["pass", "passed", "hidden"].includes(w.status.trim().toLowerCase());
  const watchItems = useMemo(() => (data?.watchlist ?? []).filter(w => w.kind === "watch" && !isPassed(w)), [data]);
  const vintageItems = useMemo(() => (data?.watchlist ?? []).filter(w => w.kind === "vintage" && !isPassed(w)), [data]);
  const wcItems = useMemo(() => (data?.watchlist ?? []).filter(w => w.kind === "wc" && !isPassed(w)), [data]);
  const vendingItems = useMemo(() => (data?.watchlist ?? []).filter(w => w.kind === "vending" && !isPassed(w)), [data]);
  const warningItems = useMemo(() => (data?.watchlist ?? []).filter(w => w.kind === "warning" && !isPassed(w)), [data]);
  const avoidItems = useMemo(() => (data?.watchlist ?? []).filter(w => w.kind === "avoid" && !isPassed(w)), [data]);
  const active = useMemo(() => (data?.cards ?? []).filter(c => c.status === "active"), [data]);
  const sold = useMemo(() => (data?.cards ?? []).filter(c => c.status === "sold" || c.status === "traded"), [data]);
  const scoutById = useMemo(() => new Map((data?.scouts ?? []).map(s => [s.scoutId, s])), [data]);

  const deals = useMemo(() => [...(data?.deals ?? [])].filter(d => !isPicClickEntry(d)).sort((a, b) => (b.discountPct ?? -1) - (a.discountPct ?? -1)), [data]);
  /* Live listings with PicClick removed — every surface that reads
     listings (Terminal counts, Trenches, spreads, ships-from) derives
     from this set, never from the raw payload. */
  const liveListings = useMemo(() => (data?.listings ?? []).filter(l => !isPicClickEntry(l)), [data]);

  /* Two tiers + sightings. Tier 1 PINNED: linked and ≥15% under a verified
     comp. Tier 2 CLOSE: linked and 8–15% under comp (or under a watchlist
     max-buy), labelled with its real %. Anything without a link is a
     sighting — never a deal. Older rows without a tier fall back to the
     discount rule. */
  /* LIVENESS: a finding whose listing has ended (status 'gone' after a
     sweep re-verification, or 'bought') is NEVER in the live feed — it
     leaves the pinned + Close tiers the moment it flips, and lives only
     in the ledger's Expired / Acquired records. 'stale' findings
     (demoted after repeated unverifiable checks, or reported stale by
     the server's read-time backstop) are likewise NEVER live deals —
     they live only in the ledger's Stale bucket until a check
     positively re-verifies them. */
  /* Pinned + sightings from deal_feed drive the roaming scouts'
     celebration + roster state only. All rendered findings and every
     pinned count live in the Findings Ledger set below (the union of
     both stores) — the standalone deal feed was retired (Oct 9). */
  const pinnedDeals = useMemo(() => deals.filter(d => !!d.listingUrl && d.status !== "gone" && d.status !== "bought" && d.status !== "stale" && (d.tier === 1 || (d.tier !== 2 && d.tier !== 0 && (d.discountPct ?? 0) >= 15))), [deals]);
  const sightings = useMemo(() => deals.filter(d => !d.listingUrl), [deals]);
  const listingsBySubject = useMemo(() => { const m = new Map<string, Listing[]>(); for (const l of liveListings) { const arr = m.get(l.subjectKey) ?? []; arr.push(l); m.set(l.subjectKey, arr); } return m; }, [liveListings]);
  const termGrades = useMemo(() => Array.from(new Set((data?.terminal ?? []).map(t => t.gradeLabel))).sort(), [data]);
  const termShipsFrom = useMemo(() => Array.from(new Set(liveListings.map(l => l.shipsFrom).filter((x): x is string => !!x))).sort(), [liveListings]);
  const terminalFiltered = useMemo(() => {
    const maxPrice = termMaxPrice.trim() === "" ? null : Number(termMaxPrice);
    return (data?.terminal ?? []).filter(t => {
      if (termType !== "All" && t.subjectType !== termType) return false;
      if (termGrade !== "All" && t.gradeLabel !== termGrade) return false;
      if (termHideLowVol && t.thinComps) return false;
      if (termSearch && !t.name.toLowerCase().includes(termSearch.toLowerCase())) return false;
      const ls = listingsBySubject.get(t.subjectKey) ?? [];
      if (termShips !== "All" && ls.length > 0 && !ls.some(l => l.shipsFrom === termShips)) return false;
      // Listing-level filters apply when the card has listings; a card with
      // no listings stays visible (its empty state is the honest signal).
      if (ls.length > 0) {
        const anyOk = ls.some(l => (l.pctOfMarket == null || l.pctOfMarket <= termMaxPct) && (maxPrice == null || isNaN(maxPrice) || l.askingUsd <= maxPrice));
        if (!anyOk) return false;
      } else if (maxPrice != null && !isNaN(maxPrice) && t.marketUsd != null && t.marketUsd > maxPrice) return false;
      return true;
    });
  }, [data, termType, termGrade, termHideLowVol, termSearch, termShips, termMaxPct, termMaxPrice, listingsBySubject]);
  const pinnedByScout = useMemo(() => { const m = new Map<string, Deal>(); for (const d of pinnedDeals) if (!m.has(d.scoutId)) m.set(d.scoutId, d); return m; }, [pinnedDeals]);
  const sightingByScout = useMemo(() => { const m = new Map<string, Deal>(); for (const d of sightings) if (!m.has(d.scoutId)) m.set(d.scoutId, d); return m; }, [sightings]);

  /* ——— Findings Ledger — the complete, persistent record ———
     The ledger is the SINGLE canonical surface for scout findings
     (the standalone deal feed was retired Oct 9). It is EVERY stored
     finding, from both stores (deal_feed
     AND market_listings — the server unions them into data.ledger,
     deduped by listing URL), with its lifecycle status. Tabs and header
     counts are computed from this same set, so they always sum to the
     stored total. Passed findings never reach the client (server
     withholds them), so they cannot reappear here either. */
  type LedgerEntry = Portfolio["ledger"][number];
  const isLedgerPinned = (d: LedgerEntry) => !!d.listingUrl && d.status !== "gone" && d.status !== "bought" && d.status !== "stale" && d.tier === 1;
  const isLedgerClose = (d: LedgerEntry) => !!d.listingUrl && d.status !== "gone" && d.status !== "bought" && d.status !== "stale" && d.tier !== 1;
  const ledgerAll = useMemo(() => [...(data?.ledger ?? [])].filter(d => !isPicClickEntry(d)).sort((a, b) => (b.lastSeenAt ?? b.foundAt).localeCompare(a.lastSeenAt ?? a.foundAt)), [data]);
  const ledgerLive = useMemo(() => ledgerAll.filter(d => !!d.listingUrl && d.status !== "gone" && d.status !== "bought" && d.status !== "stale"), [ledgerAll]);
  const ledgerPinned = useMemo(() => ledgerAll.filter(isLedgerPinned), [ledgerAll]);
  const ledgerClose = useMemo(() => ledgerAll.filter(isLedgerClose), [ledgerAll]);
  const ledgerSightings = useMemo(() => ledgerAll.filter(d => !d.listingUrl), [ledgerAll]);
  const ledgerStale = useMemo(() => ledgerAll.filter(d => d.status === "stale"), [ledgerAll]);
  /* Round 4 lookups: Rocket bear cases + Committee records by deal id. */
  const rocketIntelByDeal = useMemo(() => new Map((data?.v2.rocket.findIntel ?? []).map(r => [r.dealId, r])), [data]);
  const committeeByDeal = useMemo(() => new Map((data?.v2.committee ?? []).map(r => [r.dealId, r])), [data]);
  const ledgerNew = useMemo(() => ledgerAll.filter(d => d.status === "new"), [ledgerAll]);
  const ledgerDrops = useMemo(() => ledgerAll.filter(d => d.status === "price_dropped"), [ledgerAll]);
  const ledgerBought = useMemo(() => ledgerAll.filter(d => d.status === "bought"), [ledgerAll]);
  const ledgerGone = useMemo(() => ledgerAll.filter(d => d.status === "gone"), [ledgerAll]);
  const ledgerMarkets = useMemo(() => Array.from(new Set(ledgerAll.map(d => d.marketplace.split("—")[0]?.trim() ?? d.marketplace))).sort(), [ledgerAll]);
  const ledgerGroups = useMemo(() => Array.from(new Set(ledgerAll.map(d => d.targetGroup || "Watchlist"))).sort(), [ledgerAll]);
  const ledgerStatuses = useMemo(() => Array.from(new Set(ledgerAll.map(d => d.status))).sort(), [ledgerAll]);
  const ledgerFiltered = useMemo(() => {
    return ledgerAll.filter(d => {
      // Primary axis: tier tabs (from the entry's own tier + status, so
      // deal_feed and market_listings findings segment identically)
      if (ledgerTier === "pinned" && !isLedgerPinned(d)) return false;
      if (ledgerTier === "close" && !isLedgerClose(d)) return false;
      if (ledgerTier === "sightings" && !!d.listingUrl) return false;
      if (ledgerTier === "acquired" && d.status !== "bought") return false;
      if (ledgerTier === "stale" && d.status !== "stale") return false;
      if (ledgerTier === "expired" && d.status !== "gone") return false;
      if (ledgerTier === "all" && d.status === "gone" && !ledgerShowExpired) return false;
      if (ledgerTier === "all" && d.status === "bought") return false;
      // Chips
      if (ledgerScout !== "All" && d.scoutId !== ledgerScout) return false;
      if (ledgerMarket !== "All" && (d.marketplace.split("—")[0]?.trim() ?? d.marketplace) !== ledgerMarket) return false;
      if (ledgerGroup !== "All" && (d.targetGroup || "Watchlist") !== ledgerGroup) return false;
      if (ledgerStatus !== "All" && d.status !== ledgerStatus) return false;
      return true;
    });
  }, [ledgerAll, ledgerTier, ledgerScout, ledgerMarket, ledgerGroup, ledgerStatus, ledgerShowExpired]);
  const ledgerSummary = useMemo(() => {
    return `${ledgerLive.length} live · ${ledgerNew.length} new · ${ledgerDrops.length} drops · ${ledgerSightings.length} sightings · ${ledgerStale.length} stale${ledgerBought.length ? ` · ${ledgerBought.length} bought` : ""}${ledgerGone.length ? ` · ${ledgerGone.length} expired` : ""}`;
  }, [ledgerLive, ledgerNew, ledgerDrops, ledgerBought, ledgerGone, ledgerStale, ledgerSightings]);

  const filtered = useMemo(() => {
    let list = active.filter(c => {
      if (search && !(c.name + " " + c.setName + " " + c.cert + " " + c.number).toLowerCase().includes(search.toLowerCase())) return false;
      if (graderFilter !== "All" && c.grader !== graderFilter) return false;
      if (eraFilter !== "All" && c.era !== eraFilter) return false;
      if (callFilter !== "All" && !c.advisorCall.includes(callFilter)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortKey === "value") return (b.effectiveUsd ?? -1) - (a.effectiveUsd ?? -1);
      if (sortKey === "year") return b.year - a.year;
      if (sortKey === "grade") return parseFloat(b.grade) - parseFloat(a.grade);
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [active, search, graderFilter, eraFilter, callFilter, sortKey]);

  const selected: Card | undefined = active.find(c => c.cert === selectedCert);
  const selectedSales = useMemo(() => (data?.sales ?? []).filter(s => s.cardCert === selectedCert), [data, selectedCert]);
  const verifiedSales = useMemo(() => selectedSales.filter(s => s.verified), [selectedSales]);
  const unverifiedSales = useMemo(() => selectedSales.filter(s => !s.verified), [selectedSales]);

  const base = data?.totals.officialTotal ?? 0;
  /* Comp-based officials (Oct 10, 2026): the headline is each card's
     latest live checked price, so the hero shows the most recent check
     date across the collection instead of a fixed baseline date. */
  const latestChecked = useMemo(() => (data?.cards ?? []).map(c => c.lastChecked).filter((d): d is string => !!d).sort().slice(-1)[0] ?? null, [data]);
  const scenarios = [
    { label: "Conservative", desc: "Vintage holds, modern cools, high-pop cards flat", rows: [{ h: "6 mo", mult: 0.97 }, { h: "12 mo", mult: 1.0 }, { h: "24 mo", mult: 1.05 }] },
    { label: "Base", desc: "Steady collector demand, blue-chips grind up", rows: [{ h: "6 mo", mult: 1.04 }, { h: "12 mo", mult: 1.08 }, { h: "24 mo", mult: 1.18 }] },
    { label: "Bullish", desc: "Vintage breakout + Gengar / modern momentum holds", rows: [{ h: "6 mo", mult: 1.12 }, { h: "12 mo", mult: 1.25 }, { h: "24 mo", mult: 1.55 }] },
  ];

  const top5 = useMemo(() => [...active].filter(c => c.effectiveUsd != null).sort((a, b) => (b.effectiveUsd ?? 0) - (a.effectiveUsd ?? 0)).slice(0, 5), [active]);
  const top5Pct = base > 0 ? (top5.reduce((s, c) => s + (c.effectiveUsd ?? 0), 0) / base) * 100 : 0;

  const eraData = useMemo(() => ERA_ORDER.map(name => {
    const cardsInEra = active.filter(c => eraBucket(c.year) === name);
    const value = cardsInEra.reduce((s, c) => s + (c.effectiveUsd ?? 0), 0);
    return { name, sub: ERA_SUB[name] ?? "", value: Math.round(value), count: cardsInEra.length, share: base > 0 ? Math.round((value / base) * 1000) / 10 : 0 };
  }), [active, base]);

  const snapshotData = useMemo(() => (data?.snapshots ?? []).map(s => ({ date: s.snapshotDate, total: s.totalUsd })), [data]);

  /* ——— V2 computed ——— */
  const v2 = data?.v2;
  /* Deal alerts with PicClick removed — the alert count and list both
     derive from this filtered set. Closed-auction guard: an
     auction-ending alert whose auction has closed NEVER renders on
     Home again — the server retires closed auction alerts to status
     'resolved_closed' and excludes them from the payload; this
     client check is the second lock. */
  const visibleAlerts = useMemo(() => (v2?.alerts ?? []).filter(a => {
    if (isPicClickUrl(a.listingUrl)) return false;
    if (a.status === "resolved_closed") return false;
    return true;
  }), [v2]);
  const salesByCert = useMemo(() => { const m = new Map<string, Portfolio["sales"]>(); for (const s of data?.sales ?? []) { const a = m.get(s.cardCert) ?? []; a.push(s); m.set(s.cardCert, a); } return m; }, [data]);
  const cardChange30 = (cert: string): number | null => {
    const vs = (salesByCert.get(cert) ?? []).filter(s => s.verified).slice().sort((a, b) => a.saleDate.localeCompare(b.saleDate));
    if (vs.length < 2) return null;
    const first = vs[0]!; const last = vs[vs.length - 1]!;
    return first.price > 0 ? Math.round(((last.price - first.price) / first.price) * 1000) / 10 : null;
  };
  const trenchItems = useMemo(() => {
    const fromListings = liveListings.map(l => ({ key: `l-${l.id}`, id: l.id, source: "listing" as string, name: l.subjectName, grade: l.gradeLabel, ask: l.askingUsd, pctOfMarket: l.pctOfMarket, marketplace: l.marketplace, at: l.firstFoundAt ?? l.foundAt, url: l.listingUrl, dealId: null as number | null }));
    const fromDeals = deals.filter(d => !!d.listingUrl && d.status !== "gone" && d.status !== "bought" && d.status !== "stale").map(d => ({ key: `d-${d.id}`, id: d.id, source: "deal" as string, name: d.cardName, grade: d.gradeLabel, ask: d.askingUsd, pctOfMarket: d.pctOfMarket, marketplace: d.marketplace, at: d.firstFoundAt ?? d.foundAt, url: d.listingUrl, dealId: d.id as number | null }));
    const seen = new Set<string>(); const out: Array<(typeof fromListings)[number] | (typeof fromDeals)[number]> = [];
    for (const item of [...fromDeals, ...fromListings].sort((a, b) => String(b.at).localeCompare(String(a.at)))) { const k = item.url ? canonListingKey(item.url) : item.key; if (seen.has(k)) continue; seen.add(k); out.push(item); }
    return out.slice(0, 30);
  }, [data, liveListings, deals]);
  const trenchCurrent = trenchItems[Math.min(trenchIdx, Math.max(0, trenchItems.length - 1))];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (!trenchCurrent) return;
      const sec = document.getElementById("v2-trenches"); if (!sec) return;
      const r = sec.getBoundingClientRect(); if (r.bottom < 0 || r.top > window.innerHeight) return;
      const k = e.key.toLowerCase();
      if (k === "k") { if (trenchCurrent.dealId != null) findingStatusMut.mutate({ id: trenchCurrent.dealId, status: "live" }); setTrenchIdx(i => Math.min(i + 1, trenchItems.length - 1)); }
      if (k === "p") { if (trenchCurrent.dealId != null) passDealMut.mutate({ id: trenchCurrent.dealId }); else passListingMut.mutate({ id: trenchCurrent.id }); setTrenchIdx(i => Math.min(i + 1, trenchItems.length - 1)); }
      if (k === "e") { if (trenchCurrent.dealId != null) endFindingMut.mutate({ source: "deal", id: trenchCurrent.dealId }); else endFindingMut.mutate({ source: "listing", id: trenchCurrent.id }); setTrenchIdx(i => Math.min(i + 1, trenchItems.length - 1)); }
      if (k === "o" && trenchCurrent.url) window.open(trenchCurrent.url, "_blank");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trenchCurrent, trenchItems.length]);
  /* Update health (Oct 12, 2026 — the owner: "ensure updates are
     happening"): the two update pipelines and their last real runs,
     read straight from the stored logs so Home proves freshness
     instead of asserting it. The daily price refresh logs as
     "Daily price refresh — …" and records a FAILED research dispatch
     in that same summary when one happens; scout sweeps log per
     scout in data.sweeps. */
  const updateHealth = useMemo(() => {
    const logs = data?.logs ?? [];
    const dailyLog = logs.find(l => l.summary.startsWith("Daily price refresh")) ?? null;
    const dailyFailed = dailyLog ? dailyLog.summary.includes("Research dispatch FAILED") : false;
    const lastLog = logs[0] ?? null;
    const lastSweepAt = data?.sweeps?.[0]?.sweptAt ?? null;
    return { dailyLog, dailyFailed, lastLog, lastSweepAt };
  }, [data]);
  const delta30 = useMemo(() => {
    const snaps = data?.snapshots ?? [];
    if (snaps.length < 2) return null;
    const last = snaps[snaps.length - 1]!; const first = snaps[0]!;
    return first.totalUsd > 0 ? Math.round(((last.totalUsd - first.totalUsd) / first.totalUsd) * 1000) / 10 : null;
  }, [data]);
  const nextSweepLabel = useMemo(() => {
    const lastSweep = data?.sweeps[0]?.sweptAt;
    if (!lastSweep) return "—";
    const next = new Date(new Date(lastSweep).getTime() + 2 * 3600 * 1000);
    return next.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }, [data]);

  if (q.isPending) return <div className="min-h-screen px-5 py-16 text-center" style={{ background: "var(--bg)", color: "var(--dim)" }}>Opening the vault…</div>;
  if (q.error || !data) return <div className="min-h-screen px-5 py-16 text-center" style={{ background: "var(--bg)" }}><p className="font-semibold" style={{ color: "var(--text)" }}>Couldn’t load the portfolio</p><button onClick={() => q.refetch()} className="mt-4 rounded-full px-5 py-2 text-sm font-semibold" style={{ background: "var(--accent)", color: "#1a0b36" }}>Retry</button></div>;

  const todPhase: TodPhase = todPhaseFor(todNow);
  const todPanel = TOD_PANEL[todPhase];
  const todHourFloat = todNow.getHours() + todNow.getMinutes() / 60;

  /* Shared card for the WC and Vending hunt groups — same controls as every
     other watchlist item (Watching / Bought / Pass, Pass hides forever)
     plus the genuine marketplace search link. */
  const renderHuntCard = (w: WatchItem, i: number) => {
    const scout = w.scoutId ? scoutById.get(w.scoutId) : undefined;
    const link = watchSearchLink(w, scout);
    return (
      <div key={w.id} className={`quiet-panel p-4${i % 2 === 1 ? " quiet-alt" : ""}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="font-semibold leading-snug"><span className="num mr-1.5" style={{ color: "var(--accent-ink)" }}>{i + 1}.</span>{w.name}</p>
          <select aria-label={`Status for ${w.name}`} value={w.status} onChange={e => updateWatch.mutate({ id: w.id, status: e.target.value })} className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold" style={{ border: "1px solid var(--border)", background: "var(--surface-alt)", color: "var(--text)" }}>
            <option>Watching</option><option>Bought</option><option>Pass</option>
          </select>
          <button onClick={() => updateWatch.mutate({ id: w.id, status: "Pass" })} aria-label={`Pass on ${w.name} — remove from page`} className="shrink-0 rounded-full px-3 py-1 text-xs font-bold border" style={{ borderColor: "var(--sell)", color: "var(--sell)", background: "rgba(200,64,42,0.08)" }}>Pass ✕</button>
        </div>
        <p className="mt-1.5 text-sm font-semibold" style={{ color: "var(--accent-ink)" }}>{w.priceContext}</p>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--dim)" }}>{w.thesis}</p>
        <p className="mt-2 text-sm leading-relaxed"><strong>Rule:</strong> {w.actionRule}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          {scout && <span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1" style={{ background: "var(--glass)", border: "1px solid var(--hairline)" }}><span aria-hidden>{scout.emoji}</span> Scout: {scout.name} · {scout.territory}</span>}
          {w.lastChecked
            ? <span className="text-[11px]" style={{ color: "var(--faint)" }}>Price checked {w.lastChecked}{w.status !== "Watching" ? ` · Status: ${w.status}` : ""}</span>
            : <span className="text-[11px] font-semibold" style={{ color: "var(--accent-ink)" }}>Awaiting first refresh — no price set yet{w.status !== "Watching" ? ` · Status: ${w.status}` : ""}</span>}
        </div>
        <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <a href={link.url} target="_blank" rel="noreferrer" aria-label={`${link.label} — ${w.name}`} className="text-xs font-bold underline" style={{ color: "var(--accent-ink)" }}>{link.label}</a>
          <span className="text-[11px]" style={{ color: "var(--faint)" }}>Live {link.marketplace} search page — current asks, not sold comps. Verify against comps before buying.</span>
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen relative tod-root" data-phase={todPhase} data-density={density} data-ui-theme={uiTheme} data-event={todNow >= new Date("2026-10-01T00:00:00") && todNow <= new Date("2026-10-31T23:59:59") ? "halloween" : todNow.getMonth() === 10 ? "autumn" : todNow.getMonth() === 11 ? "snow" : "none"} data-tod-instant={todReduced ? "1" : "0"} style={{ color: "var(--text)", "--phase-edge": todPanel.edge, "--phase-glow": todPanel.glow } as CSSProperties}>
      {/* ATMOSPHERE (Glass Vault phase 2): data surfaces sit on the
          vapor sky ONLY — gradient + glows; the blurred city layer
          was removed at the owner's verdict ("city bg looks
          terrible"). The town survives as (a) the full-screen living
          place on Scouts › Town — TownBackground exactly as before —
          and (b) the fixed TownBand window at the bottom of Home,
          showing the town's real pixel art, never blurred. */}
      {!showOpen && !detailPageOpen && navGroup === "scouts" && activeSub === "town"
        ? <TownBackground phase={todPhase} hourFloat={todHourFloat} milestones={data?.v2.milestones ?? []} />
        : (<>
            {!detailPageOpen && inGroup("home") && <TownBand phase={todPhase} hourFloat={todHourFloat} milestones={data?.v2.milestones ?? []} />}
          </>)}
      <FreeRoamingScouts scouts={data.scouts} pinnedByScout={pinnedByScout} sightingByScout={sightingByScout} />
      <SafeAreaTopScrim backgroundColor="transparent" />
      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-8">
        <h1 className="sr-only">Pokémon Card Dashboard — collection vault, live scout deals, market terminal and town</h1>
        {/* WCAG live region: announces the headline state (pinned finds,
            stale demotions, alerts) without spamming — one summary string
            per data load. */}
        <div className="sr-only" role="status" aria-live="polite">{data ? `${ledgerPinned.length} pinned Tier 1 deals live in the Findings Ledger. ${visibleAlerts.length} deal alerts recorded.` : ""}</div>
                {/* ——— TOP BAR (Oct 9 redesign) — DESKTOP ONLY, ONE single
               unit: one slab, one border/radius, exactly three zones.
               LEFT: the title/logo — the original pixel-slab mark +
               the wordmark "The Graded Vault" (the Portfolio
               $value and gain/loss that used to live here are GONE
               from the bar; the gain/loss now sits in the Home hero
               with the big portfolio value). MIDDLE: the five grouped
               nav tabs (Home · Deals · Vault · Scouts · Insights,
               aria-current on the active tab). FAR RIGHT: the compact
               town-clock chip (time + day/night phase icon, always
               Auto) at the bar's far right edge. Show Mode is NOT in
               this bar at any width — on mobile it is the floating
               camera button (see .show-mode-fab below). There is NO
               density switch in the bar: the app renders Terminal
               density permanently and any stored 'v2-density'
               preference is cleared on load. Sub-chips are NOT in
               this bar — they render as a quiet in-surface row below
               it. Smart-sticky behaviour unchanged: hides on scroll
               down, returns on scroll up, always visible near the top,
               never hides while the card detail page is open or focus
               is inside. ON MOBILE the bar does not render at all
               (CSS: .command-strip is display:none below 768px) —
               navigation there is the sticky bottom footer bar, and
               detail pages rely on their in-page ← Back button. ——— */}
        <div ref={stripRef} onFocus={() => setStripHidden(false)} className={`command-strip mb-4${stripHidden ? " cmd-hidden" : ""}`} role="region" aria-label="Header — The Graded Vault, navigation and time">
          {/* GLASS VAULT: the bar is a floating glass capsule — inset
              from the edges, detached, vapor-tinted. Same three zones:
              logo + wordmark left, five group pills centred, town
              clock far right. Groups with sub-surfaces carry
              aria-haspopup/aria-expanded and open the launcher. */}
          <div className="glass-capsule px-3 py-1.5 sm:px-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="order-1 flex items-center gap-2.5 shrink-0 min-w-0">
                <PixelSlabLogo size={34} />
                <p className="font-display font-semibold text-[17px] leading-none whitespace-nowrap" style={{ color: "var(--text)" }}>The Graded Vault</p>
              </div>
              <nav ref={surfaceNavRef} aria-label="Main navigation — groups" onKeyDown={onSurfaceNavKey} className="order-3 w-full min-w-0 lg:order-2 lg:w-auto lg:flex-1">
                <ul className="flex items-center gap-1.5 justify-center overflow-visible pb-0">
                  {NAV_GROUPS.map(g => (
                    <li key={g.id} className="shrink-0">
                      <button onClick={e => openGroup(g.id, e.currentTarget)} aria-current={!showOpen && navGroup === g.id ? "page" : undefined} aria-haspopup={g.subs.length > 0 ? "dialog" : undefined} aria-expanded={g.subs.length > 0 ? launcherGroup === g.id : undefined} aria-label={g.subs.length > 0 ? `${g.name} — open surfaces menu` : `Go to ${g.name}`} className="nav-pill rounded-full px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap inline-flex items-center gap-1.5" style={{ minHeight: 34 }}><NavGlyph id={g.id} />{g.label}{g.subs.length > 0 && <span aria-hidden className="text-[9px] opacity-70">{launcherGroup === g.id ? "▴" : "▾"}</span>}</button>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="order-2 ml-auto flex items-center gap-2 shrink-0 lg:order-3">
                <TownClockChip now={todNow} phase={todPhase} />
              </div>
            </div>
          </div>
        </div>
        {/* ——— IN-SURFACE SUB-CHIPS — the active group's sections as a
               quiet row INSIDE the surface, below the bar (not part of
               the bar). Hidden while Show Mode or the card detail page
               is open. DESIGN PASS (Oct 13, remedy #10): the row now
               sits on the SAME solid .slab surface as the top bar —
               the chips previously rendered directly on the pixel-town
               grass (glass tint over grass: dim text measured ~1.28:1).
               On the slab, unselected chip text (dim on surface-2) is
               7.45:1 Night / 6.25:1 Day and the selected chip (text on
               surface-alt) is 12.86:1 / 11+ :1. The town is background
               only — no interactive chrome sits on the art. ——— */}
        {/* ——— LAUNCHER SUB-NAV (Glass Vault phase 1) ———
               The sub-chip row is REPLACED by the Deel-style launcher:
               a floating glass panel of large icon tiles (≥44px), each
               with a label + one-line description. Picking a tile
               navigates exactly like the chips did (goNav). Esc
               closes; focus is trapped while open and returns to the
               invoking pill on close; on mobile the same panel anchors
               as a sheet above the footer capsule (CSS). Hidden while
               Show Mode or the card detail page is open. */}
        {!showOpen && !detailPageOpen && launcherGroup != null && (() => {
          const g = NAV_GROUPS.find(x => x.id === launcherGroup);
          if (!g || g.subs.length === 0) return null;
          return (
            <>
              <div className="launcher-scrim" aria-hidden="true" onClick={() => closeLauncher(true)} />
              <div ref={launcherRef} role="dialog" aria-modal="true" aria-label={`${g.name} surfaces — pick one`} className="launcher-panel launcher-desktop launcher-mobile" onKeyDown={onLauncherKeyDown}>
                <div className="flex items-center gap-2.5 px-1.5 pb-3">
                  <p className="text-[13px] font-extrabold uppercase" style={{ letterSpacing: ".1em", color: "var(--text)" }}>{g.name}</p>
                  <span className="text-xs font-semibold" style={{ color: "var(--dim)" }}>{g.subs.length} surfaces — pick one</span>
                  <button onClick={() => closeLauncher(true)} aria-label="Close launcher" title="Close (Esc)" className="launcher-close"><span aria-hidden>✕</span> Close</button>
                </div>
                <div className={`launcher-grid${g.subs.length === 2 ? " cols-2" : ""}`}>
                  {g.subs.map(s => { const meta = LAUNCHER_META[s.id]; return (
                    <button key={s.id} onClick={() => { closeLauncher(false); goNav(g.id, s.id); }} aria-current={activeSub === s.id && navGroup === g.id ? "page" : undefined} aria-label={`Go to ${g.name}: ${s.label} — ${meta.desc}`} className="launcher-tile">
                      <span className="lt-ic" aria-hidden><LauncherGlyph id={s.id} /></span>
                      <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <span className="lt-name">{s.label}</span>
                        <span className="lt-desc">{meta.desc}</span>
                      </span>
                    </button>
                  ); })}
                </div>
              </div>
            </>
          );
        })()}

{/* ——— CARD DETAIL PAGE (Oct 9) — a dedicated PAGE, not a
               pop-out / slide-over: it replaces the current view under
               the unified top bar, with a ← Back button at the top-left
               of the content area (closeDetail restores the exact
               origin — group, sub-view, scroll; filters are component
               state and are never reset). Everything the pop-out held
               lives here: header, holo-tilt slab, stress test / flags,
               official / vault / checked values, Decision, market
               signals (bid/ask · pump/pop · Exit Desk), chart, History
               (sales evidence), provenance panels, the value
               editor — and BELOW all of it, the Lineage section scoped
               to this card only. ——— */}
        {selected && (
          <section aria-label={`Card detail page — ${selected.name}`} className="card-detail-page">
            {/* Back row sits on a solid .town-readable bar (design
                pass, Oct 13): it previously floated on the town grass
                with a near-transparent glass button. */}
            <div className="quiet-panel flex items-center gap-3 px-3 py-2">
              <button ref={detailBackRef} onClick={closeDetail} aria-label={`Back — return to the view you came from, leaving ${selected.name} detail`} className="touch-target inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold border" style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--surface-alt)", minHeight: 44 }}>← Back</button>
              <span className="text-xs font-semibold" style={{ color: "var(--dim)" }}>Card detail</span>
            </div>
            {/* PHASE 2 DETAIL LAYOUT (owner): two columns on desktop —
                LEFT the slab alone on the sky (no stage, no panel —
                HoloSlab renders just the case) with the compact value
                tiles stacked under it; RIGHT everything else, in its
                current order: header text, then the quiet content
                panel, then the scoped Lineage panel. Mobile stacks in
                the same order: slab, tiles, right column. */}
            <div className="mt-4 grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] items-start">
              <div>
                <HoloSlab card={selected} reduced={todReduced} />
                <div className="mt-4 grid gap-2.5 text-sm">
                  <div className="rounded-xl p-3" style={{ background: "var(--surface-alt)" }}><p className="kicker" style={{ color: "var(--faint)" }}>Official value</p><p className="num text-xl font-bold mt-1">{fmt(selected.effectiveUsd)}</p><p className="text-[11px]" style={{ color: "var(--dim)" }}>{OWNER_KEPT_CERTS_CLIENT.includes(selected.cert) ? "Owner-kept — locked, not floated to comps" : selected.checkedUsd != null ? `Comp-based — latest live check${selected.lastChecked ? ` ${selected.lastChecked}` : ""}` : "Vault estimate — no comp check yet"}</p></div>
                  <div className="rounded-xl p-3" style={{ background: "var(--surface-alt)" }}><p className="kicker" style={{ color: "var(--faint)" }}>Vault estimate</p><p className="num text-xl font-bold mt-1">{fmt(selected.vaultUsd)}</p></div>
                  <div className="rounded-xl p-3" style={{ background: "var(--surface-alt)" }}><p className="kicker" style={{ color: "var(--faint)" }}>Checked</p><p className="num text-xl font-bold mt-1">{fmt(selected.checkedUsd)}</p>{selected.lastChecked && <p className="text-[11px]" style={{ color: "var(--dim)" }}>{selected.lastChecked}</p>}</div>
                </div>
              </div>
              <div className="min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="kicker" style={{ color: "var(--accent-ink)" }}>{selected.grader} {selected.grade} · Cert {selected.cert}</p>
                <h3 className="font-display text-3xl font-bold mt-1.5">{selected.name}</h3>
                <p className="text-sm" style={{ color: "var(--dim)" }}>{selected.year} · {selected.setName} #{selected.number} · {selected.era}</p>
                <span className="mt-2 inline-block text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: callColor(selected.advisorCall), color: "var(--ink-on-fill)" }}>{selected.advisorCall}</span>
              </div>
              <span className="flex gap-2 shrink-0">
                <button aria-label={`Open lineage watch for ${selected.name} in Vault, Lineage`} onClick={() => { setLineageCert(selected.cert); goNav("vault", "lineage"); }} className="touch-target rounded-full px-3 py-1 text-sm font-bold" style={{ border: "1px solid var(--accent)", color: "var(--accent-ink)" }}>🧬 Lineage</button>
                
              </span>
            </div>
            <div className="quiet-panel mt-4 p-5 sm:p-6" style={{ borderColor: "rgba(217,164,65,0.35)" }}>
            {(() => { const rf = (data?.v2.rocket.holdingFlags ?? []).find(f => f.cert === selected.cert); return rf ? <p className="mb-3 text-sm leading-relaxed rounded-xl px-3.5 py-2.5" style={{ background: "rgba(212,58,47,0.08)", border: "1px solid rgba(212,58,47,0.45)" }}><strong style={{ color: "var(--sell)" }}>🚀 Rocket stress test:</strong> the cheapest live ask for this card is <strong className="num">{fmt(rf.bestAsk)}</strong> — <strong>▼ {rf.pctUnder.toFixed(1)}% under</strong> the held {fmt(rf.heldValue)} value. Asks are not sales; Rocket files it as an unconfirmed premium, not a verdict. See Risk for the full list.</p> : null; })()}
            {(() => { const dec = decisionFor(selected, { verifiedSales: verifiedSales.length, changePct: cardChange30(selected.cert), sharePct: selected.effectiveUsd != null && base > 0 ? (selected.effectiveUsd / base) * 100 : null }); return (
              <div className="mt-4 rounded-2xl p-4" style={{ background: "var(--glass)", border: "1px solid var(--hairline)" }} role="group" aria-label={`Decision for ${selected.name}: ${selected.advisorCall} — pros and cons`}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="kicker" style={{ color: "var(--faint)" }}>Decision</p>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: callColor(selected.advisorCall), color: "var(--ink-on-fill)" }}>{selected.advisorCall}</span>
                </div>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--hold)" }}>▲ Pros — for the call</p>
                    <ul className="mt-1.5 grid gap-1 text-sm leading-relaxed" style={{ color: "var(--dim)" }}>{dec.pros.map(pt => <li key={pt}>• {pt}</li>)}</ul>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--sell)" }}>▼ Cons — risks &amp; counterpoints</p>
                    <ul className="mt-1.5 grid gap-1 text-sm leading-relaxed" style={{ color: "var(--dim)" }}>{dec.cons.map(pt => <li key={pt}>• {pt}</li>)}</ul>
                  </div>
                </div>
              </div>
            ); })()}
            {/* ——— COST BASIS (Remedies pass 1 — audit remedy P0-3) —
                   what the owner paid for this card, its current official
                   value, and the unrealized P&L between them. Sits
                   directly under the Decision block; editing lives
                   inside the block. Collection rows stay clean. ——— */}
            <CardCostBlock card={selected} onSave={(args) => updateCostMut.mutate(args)} saving={updateCostMut.isPending} />
                        {/* ——— MARKET SIGNALS — this card's bid/ask row, Pump
                   Detector score, pop-dilution state and Exit Desk
                   actions, pulled from the same v2 data the Deals ›
                   Market and Insights › Risk surfaces render. ——— */}
            {(() => {
              const spread = (data?.v2.spreads ?? []).find(s => s.key === `owned-${selected.cert}`);
              const pump = (data?.v2.pump ?? []).find(p => p.cert === selected.cert);
              const pop = (data?.v2.pops ?? []).find(p => p.cert === selected.cert);
              const drafts = (data?.v2.exits ?? []).filter(d => d.cert === selected.cert);
              if (!spread && !pump && !pop && drafts.length === 0) return null;
              return (
                <div className="mt-4 rounded-2xl p-4" style={{ background: "var(--glass)", border: "1px solid var(--hairline)" }} role="group" aria-label={`Market signals for ${selected.name} — bid and ask, pump and pop, Exit Desk`}>
                  <p className="kicker" style={{ color: "var(--faint)" }}>⚖️ Market signals — bid/ask · pump/pop · Exit Desk</p>
                  <div className="mt-3 grid gap-2 text-sm">
                    {spread && (
                      <p className="rounded-xl px-3 py-2 leading-relaxed" style={{ background: "var(--surface-alt)" }}>
                        <strong>Bid / Ask:</strong> Ask <strong className="num">{fmt(spread.bestAsk)}</strong> <span style={{ color: "var(--dim)" }}>({spread.askSource})</span> · Bid <strong className="num">{fmt(spread.highestBid)}</strong> <span style={{ color: "var(--dim)" }}>({spread.bidSource})</span> · Last sale <strong className="num">{fmt(spread.lastSale)}</strong> <span style={{ color: "var(--dim)" }}>({spread.saleSource})</span> · Spread <strong className="num">{spread.spreadPct == null ? "—" : spread.spreadPct.toFixed(1) + "%"}</strong>
                        {spread.warning && <span className="block mt-1 font-bold" style={{ color: "var(--sell)" }}>⚠ Liquidity warning: {spread.warning}</span>}
                      </p>
                    )}
                    {pump && (
                      <p className="rounded-xl px-3 py-2 leading-relaxed" style={{ background: "var(--surface-alt)" }}>
                        <strong>Pump Detector:</strong> <span className="text-[11px] font-black px-2 py-0.5 rounded-full" style={{ background: pump.level === "High" ? "var(--sell)" : pump.level === "Watch" ? "var(--trim)" : "rgba(63,182,143,0.25)", color: pump.level === "High" || pump.level === "Watch" ? "var(--ink-on-fill)" : "var(--text)" }}>{pump.level.toUpperCase()} · {pump.score}</span>
                        {pump.factors.length > 0 && <span style={{ color: "var(--dim)" }}> — {pump.factors.join(" · ")}</span>}
                      </p>
                    )}
                    {pop && (
                      <p className="rounded-xl px-3 py-2 leading-relaxed" style={{ background: pop.alert ? "rgba(224,90,58,0.10)" : "var(--surface-alt)", border: pop.alert ? "1px solid var(--sell)" : "1px solid transparent" }}>
                        <strong>Pop dilution:</strong> <span className="num">pop {pop.popTotal.toLocaleString()}{pop.popGrade != null ? ` (grade pop ${pop.popGrade.toLocaleString()})` : ""}</span> · <span style={{ color: "var(--dim)" }}>{pop.velocityPct == null ? "Velocity: baseline only — first refresh comparison pending" : `Velocity: ${pop.velocityPct > 0 ? "+" : ""}${pop.velocityPct}%`}{pop.alert ? " · ⚠ ALERT — scarcity eroding" : ""} · recorded {pop.recordedAt}</span>
                      </p>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button onClick={() => exitDraftMut.mutate({ cert: selected.cert })} disabled={exitDraftMut.isPending} aria-label={`Generate Exit Desk listing draft for ${selected.name}`} className="touch-target rounded-full px-4 py-2 text-sm font-bold border disabled:opacity-50" style={{ borderColor: "var(--accent)", color: "var(--accent-ink)" }}>✎ Draft listing (Exit Desk)</button>
                    {exitDraftMut.isSuccess && <span className="text-xs" style={{ color: "var(--dim)" }}>Draft created — it also lives on Deals › Market, Exit Desk ✓</span>}
                  </div>
                  {drafts.length > 0 && (
                    <div className="mt-3 grid gap-3">
                      {drafts.map(d => <ExitDraftCard key={d.id} draft={d} onUpdate={(args) => exitUpdateMut.mutate(args)} />)}
                    </div>
                  )}
                </div>
              );
            })()}
            {/* ——— FORECAST (fc-v1) — per-card value ranges at
                   30/90/180 days from VERIFIED SOLD COMPS ONLY, each
                   with its confidence grade and evidence basis.
                   Insufficient-signal and pump-suspended states are
                   rendered honestly — a card with no honest range
                   shows why, never a made-up number. Locked
                   (owner-kept) cards forecast MARKET value and say
                   so; the kept figure never moves. ——— */}
            {(() => {
              const fc = (data?.forecasts ?? []).find(f => f.cert === selected.cert);
              if (!fc) return null;
              const confColor = (cf: string) => cf === "A" ? "var(--hold)" : cf === "B" ? "var(--accent-ink)" : "var(--dim)";
              return (
                <div className="mt-4 rounded-2xl p-4" style={{ background: "var(--glass)", border: "1px solid var(--hairline)" }} role="group" aria-label={`Forecast for ${selected.name} — value ranges from verified sales only`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="kicker" style={{ color: "var(--faint)" }}>🔮 Forecast — verified-sales ranges <span className="ml-1 px-1.5 py-0.5 rounded-full" style={{ border: "1px solid var(--accent)", color: "var(--accent-ink)" }}>SAMPLE DATA — DEMO</span></p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ border: "1px solid var(--hairline)", color: "var(--dim)" }}>Model fc-v1</span>
                  </div>
                  {fc.locked && <p className="mt-2.5 text-sm font-semibold rounded-xl px-3 py-2" style={{ background: "var(--surface-alt)" }}>Market-value forecast — your kept value stays {fmt(fc.keptValue)}</p>}
                  {fc.state === "open" && (
                    <div className="mt-3 grid gap-2">
                      {fc.horizons.map(h => (
                        <div key={h.horizonDays} className="rounded-xl px-3 py-2.5" style={{ background: "var(--surface-alt)" }}>
                          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                            <strong className="w-16 shrink-0">{h.horizonDays} days</strong>
                            <span className="num font-bold">{fmt(h.rangeLow)} – {fmt(h.rangeHigh)}</span>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ color: confColor(h.confidence), border: `1px solid ${confColor(h.confidence)}` }}>CONFIDENCE {h.confidence}</span>
                          </p>
                          <p className="text-xs mt-1" style={{ color: "var(--dim)" }}>{h.basisN} verified sales · last {fmtFcDate(h.basisLastSale)} · liquidity {h.liquidity} · issued {fmtFcDate(h.issuedAt)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {fc.state === "pump_suspended" && (
                    <p className="mt-3 text-sm leading-relaxed rounded-xl px-3 py-2.5" style={{ background: "rgba(212,58,47,0.08)", border: "1px solid rgba(212,58,47,0.45)" }}><strong style={{ color: "var(--sell)" }}>Forecast suspended — pump risk.</strong> The Pump Detector flags this card High, so the model refuses to extrapolate it until the pattern settles. {fc.pumpReason ? <>Reason: {fc.pumpReason}.</> : null}</p>
                  )}
                  {fc.state === "insufficient" && (
                    <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--dim)" }}><strong style={{ color: "var(--text)" }}>Insufficient signal.</strong> Not enough recent verified sales to publish an honest range — a forecast needs at least 3 verified sold comps in the last 180 days, with the latest no more than 90 days old. Rather than guess, this card carries no range until the evidence exists.</p>
                  )}
                  <p className="mt-3 text-xs" style={{ color: "var(--faint)" }}>Ranges from verified sales only — scenarios, not predictions.</p>
                </div>
              );
            })()}
            {/* ——— PRICE / SALES CHART — relocated into the detail page
                   (Oct 9): the standalone per-card panels are gone from
                   Home/Growth; each card's chart lives here, with the
                   same series and honesty captions. ——— */}
            {(() => {
              type DetailChart = { title: string; sub: string; data: { label: string; price: number }[]; color: string; seriesLabel: string; caption: ReactNode; aria: string };
              let chart: DetailChart | null = null;
              if (verifiedSales.length >= 2) {
                const sorted = [...verifiedSales].sort((a, b) => a.saleDate.localeCompare(b.saleDate));
                chart = {
                  title: `${selected.name} — verified sales`, sub: "Verified sold comps on file for this cert", data: sorted.map(s => ({ label: s.saleDate, price: s.price })), color: "var(--accent)", seriesLabel: "Verified sale",
                  caption: <>Plotted from this card&apos;s verified sales evidence (listed under History below) — verified comps only; unverified signals are never plotted.</>,
                  aria: `Line chart of verified sales for ${selected.name}: ${sorted.map(s => `${fmt(s.price)} on ${s.saleDate}`).join(", ")}.`,
                };
              }
              const dc = chart;
              return (
                <>
                  {dc && (
                    <div className="mt-4 rounded-2xl p-4" style={{ background: "var(--glass)", border: "1px solid var(--hairline)" }}>
                      <p className="font-display font-bold">{dc.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--dim)" }}>{dc.sub}</p>
                      <div className="mt-3" style={{ height: 210 }} role="img" aria-label={dc.aria}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={dc.data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
                            <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false} />
                            <XAxis dataKey="label" tick={chartTick} axisLine={{ stroke: "var(--border)" }} tickLine={false} interval={0} angle={-18} textAnchor="end" height={44} />
                            <YAxis domain={["auto", "auto"]} tick={chartTick} axisLine={false} tickLine={false} tickFormatter={(v: number) => "$" + v.toLocaleString()} width={56} />
                            <Tooltip formatter={(v: any) => [fmt(Number(v)), dc.seriesLabel]} contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_TEXT} itemStyle={CHART_TOOLTIP_TEXT} />
                            <Line type="monotone" dataKey="price" stroke={dc.color} strokeWidth={2.5} dot={{ r: 4, fill: dc.color, stroke: "#0b0c0f", strokeWidth: 2 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--faint)" }}>{dc.caption}</p>
                    </div>
                  )}
                                  </>
              );
            })()}
                                                {selected.popInfo && <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>Population: {selected.popInfo}</p>}
            {selected.notes && <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>{selected.notes}</p>}

            {unverifiedSales.map(s => (
              <div key={s.id} className="mt-4 rounded-2xl p-4 border-2 border-dashed" style={{ borderColor: "var(--sell)", background: "rgba(200,64,42,0.09)" }} role="note" aria-label="Unverified sale signal">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-black px-2 py-1 rounded-full tracking-wider" style={{ background: "var(--red)", color: "var(--ink-on-fill)" }}>⚠ UNVERIFIED</span>
                  <span className="text-[11px] font-bold px-2 py-1 rounded-full" style={{ border: "1px solid var(--sell)", color: "var(--sell)" }}>Seller-reported / unverified</span>
                  <span className="num font-display text-2xl font-black ml-auto" style={{ color: "var(--sell)" }}>{fmt(s.price)}</span>
                </div>
                                <p className="mt-2.5 text-sm leading-relaxed font-medium">Unverified sale reported at {fmt(s.price)} on {s.saleDate} — not yet verified.</p>
                <div className="mt-2.5 grid gap-1 text-xs sm:grid-cols-2" style={{ color: "var(--dim)" }}>
                  <p>Grade: <strong style={{ color: "var(--text)" }}>{selected.grader} {selected.grade}</strong></p>
                  <p>Shown as: <strong style={{ color: "var(--text)" }}>as reported by the seller</strong></p>
                  <p>Type: <strong style={{ color: "var(--text)" }}>{s.source}</strong></p>
                  <p>Reported by: <strong style={{ color: "var(--text)" }}>the seller</strong> · Report date: <strong style={{ color: "var(--text)" }}>{s.saleDate}</strong> (date is when it was reported)</p>
                </div>
                <p className="mt-2.5 text-xs leading-relaxed" style={{ color: "var(--dim)" }}>{s.description}</p>
                <p className="mt-1.5 text-xs font-semibold" style={{ color: "var(--sell)" }}>Excluded from the headline value, verified comps / averages, and every chart on this page.</p>
              </div>
            ))}

            {verifiedSales.length > 0 && (
              <div className="mt-5">
                <p className="kicker" style={{ color: "var(--faint)" }}>Recent sales evidence — verified & sourced only</p>
                <div className="mt-2 space-y-1.5">
                  {verifiedSales.map(s => {
                    const t = saleType(s);
                    return (
                      <div key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm rounded-lg px-3 py-2" style={{ background: "var(--glass)", border: "1px solid var(--hairline)" }}>
                        <span className="font-bold num">{fmt(s.price)}</span>
                        <span style={{ color: "var(--dim)" }}>{s.saleDate}</span>
                        <span style={{ color: "var(--dim)" }}>{s.source}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: t.color, border: `1px solid ${t.color}` }}>{t.label}</span>
                        <span className="w-full text-xs" style={{ color: "var(--faint)" }}>{s.description}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <input aria-label="Update official value" value={editValue} onChange={e => setEditValue(e.target.value)} placeholder="New value, e.g. 1500" inputMode="decimal" className="rounded-full px-4 py-2 text-sm outline-none w-44" style={{ background: "var(--surface-alt)", color: "var(--text)", border: "1px solid var(--border)" }} />
              <button onClick={() => { const v = parseFloat(editValue); if (!isNaN(v)) updateVal.mutate({ cert: selected.cert, checkedUsd: v }); }} className="rounded-full px-4 py-2 text-sm font-bold" style={{ background: "var(--accent)", color: "#1a0b36" }}>Save value</button>
              {updateVal.isSuccess && <span className="text-xs">Saved ✓</span>}
            </div>
          </div>
            {/* ——— LINEAGE — SCOPED TO THIS CARD ONLY (Oct 9): this
                   section shows ONLY this card's own cert biography
                   timeline and ITS sibling certs — never the full
                   watch list (that is managed on the Cert watch page,
                   Vault › Lineage). A card with no siblings and a thin
                   timeline shows just its own events, honestly. It sits
                   BELOW the main detail content, always. ——— */}
            <div className="quiet-panel mt-5 p-5 sm:p-6" role="group" aria-label={`Lineage for ${selected.name} — scoped to this card only`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="kicker" style={{ color: "var(--accent-ink)" }}>🧬 Lineage — this card only</p>
                  <h3 className="font-display text-2xl font-bold mt-1">Cert {selected.cert} — biography &amp; siblings</h3>
                  <p className="text-sm mt-1 max-w-2xl leading-relaxed" style={{ color: "var(--dim)" }}>Only what belongs to this card: its own cert's timeline and its sibling certs. The full cert watch list is managed on the Cert watch page.</p>
                </div>
                <button onClick={() => { setLineageCert(selected.cert); goNav("vault", "lineage"); }} aria-label="Open the full Cert watch management page in Vault, Lineage" className="touch-target shrink-0 rounded-full px-4 py-2 text-sm font-bold border" style={{ borderColor: "var(--accent)", color: "var(--accent-ink)" }}>Full cert watch →</button>
              </div>
{/* ——— HISTORY — this cert's Slab Lineage events (the sales
                   evidence list stays below, unchanged). The full
                   biography used to render on the Lineage page; it now
                   lives here on the detail page. ——— */}
            {(() => {
              const events = (data?.v2.lineageEvents ?? []).filter(e => e.cert === selected.cert);
              return (
                <div className="mt-4 rounded-2xl p-4" style={{ background: "var(--glass)", border: "1px solid var(--hairline)" }} role="group" aria-label={`History — lineage events for ${selected.name}, cert ${selected.cert}`}>
                  <p className="kicker" style={{ color: "var(--faint)" }}>🧬 Biography timeline — this cert</p>
                  {events.length === 0 ? (
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--dim)" }}>Only the events we know: none recorded yet for this cert beyond its enrollment. Nothing has been padded in — appearances land here when a sweep matches this cert number in a real listing, with its link.</p>
                  ) : (
                    <ol className="mt-3 grid gap-0">
                      {events.map((e, i) => (
                        <li key={e.id} className="flex gap-3 pb-4" style={{ borderLeft: i < events.length - 1 ? "2px solid var(--hairline)" : "2px solid transparent", marginLeft: 6, paddingLeft: 18, position: "relative" }}>
                          <span aria-hidden style={{ position: "absolute", left: -7, top: 2, width: 12, height: 12, borderRadius: 999, background: e.verified ? "var(--accent)" : "var(--sell)", border: "2px solid var(--bg)" }} />
                          <div className="flex-1">
                            <p className="text-sm"><strong>{e.eventDate || "Date not recorded"}</strong> · {e.venue} {e.price != null && <span className="num font-bold">· {fmt(e.price)}</span>} {!e.verified && <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(224,90,58,0.2)", color: "var(--sell)" }}>UNVERIFIED</span>}</p>
                            <p className="text-xs" style={{ color: "var(--accent-ink)" }}>{e.sourceLabel} · {e.eventType.replace(/_/g, " ")}</p>
                            <p className="text-sm mt-0.5 leading-relaxed" style={{ color: "var(--dim)" }}>{e.note}</p>
                            {e.linkUrl && <a href={e.linkUrl} target="_blank" rel="noreferrer" aria-label={`Open source for lineage event — ${e.venue}`} className="touch-target inline-flex items-center text-xs font-bold underline" style={{ color: "var(--accent-ink)", minHeight: 32 }}>Source listing ↗</a>}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              );
            })()}
            {/* ——— SIBLINGS — sibling certs (with their tracked state)
                   and other tracked copies / grades of this card. ——— */}
            {(() => {
              const firstToken = (selected.name.split(" ")[0] ?? "").toLowerCase();
              const siblingWatches = (data?.v2.lineageWatch ?? []).filter(w => w.relation === "sibling" && firstToken.length > 2 && w.label.toLowerCase().startsWith(firstToken) && (w.label.includes(`#${selected.number}`) || w.label.toLowerCase().includes(selected.name.toLowerCase())));
              const copies = (data?.cards ?? []).filter(c => c.cert !== selected.cert && c.name === selected.name && c.setName === selected.setName && c.number === selected.number);
              if (siblingWatches.length === 0 && copies.length === 0) return (
                <div className="mt-4 rounded-2xl p-4" style={{ background: "var(--glass)", border: "1px solid var(--hairline)" }}>
                  <p className="kicker" style={{ color: "var(--faint)" }}>👀 Siblings</p>
                  <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>No sibling certs or other tracked copies/grades on file for this card — when a sweep spots one, it lands here.</p>
                </div>
              );
              return (
                <div className="mt-4 rounded-2xl p-4" style={{ background: "var(--glass)", border: "1px solid var(--hairline)" }} role="group" aria-label={`Siblings — sibling certs and other tracked copies of ${selected.name}`}>
                  <p className="kicker" style={{ color: "var(--faint)" }}>👀 Siblings — sibling certs &amp; other tracked copies</p>
                  <div className="mt-3 grid gap-2">
                    {siblingWatches.map(w => {
                      const evs = (data?.v2.lineageEvents ?? []).filter(e => e.cert === w.cert);
                      const latest = evs[0];
                      return (
                        <div key={w.cert} className="rounded-xl px-3.5 py-3" style={{ background: "var(--surface-alt)", border: "1.5px dashed #8b7fd4" }}>
                          <p className="text-sm flex flex-wrap items-center gap-2"><strong>👀 SIBLING CERT {w.cert} — NOT OWNED</strong>
                          </p>
                          <p className="text-sm mt-1" style={{ color: "var(--dim)" }}>{w.label}</p>
                          <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--dim)" }}>{w.note}</p>
                          {latest && <p className="text-xs mt-1.5" style={{ color: "var(--dim)" }}>Latest tracked state: <strong style={{ color: "var(--text)" }}>{latest.venue}</strong>{latest.eventDate ? ` · ${latest.eventDate}` : ""}{latest.price != null ? ` · ${fmt(latest.price)}` : ""} — {latest.sourceLabel}{latest.linkUrl && <> · <a href={latest.linkUrl} target="_blank" rel="noreferrer" aria-label={`Open source for sibling cert ${w.cert} — ${latest.venue}`} className="font-bold underline" style={{ color: "var(--accent-ink)" }}>Source ↗</a></>}</p>}
                        </div>
                      );
                    })}
                    {copies.map(c => (
                      <button key={c.cert} onClick={() => openCardDetail(c.cert)} aria-label={`Open tracked copy — ${c.name} ${c.grader} ${c.grade}, cert ${c.cert}`} className="rounded-xl px-3.5 py-3 text-left" style={{ background: "var(--surface-alt)", border: "1px solid var(--hairline)" }}>
                        <span className="text-sm"><strong>{c.name}</strong> <span style={{ color: "var(--dim)" }}>· {c.setName} #{c.number} · {c.grader} {c.grade} · cert {c.cert} · {c.status}</span></span>
                        <span className="num text-sm font-bold block mt-0.5">{fmt(c.effectiveUsd)} <span className="font-normal text-xs" style={{ color: "var(--accent-ink)" }}>— open this copy →</span></span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
                        </div>
              </div>
            </div>
          </section>
        )}
        <div style={detailPageOpen ? { display: "none" } : undefined}>

        {/* ——— VALUE PROP — ONE merged card (Oct 9): the vault hero and
               the Portfolio value over time chart baked into a SINGLE
               card at the top of Home, under the command strip +
               Surfaces nav and above the digest. Layout: TWO COLUMNS
               on desktop — LEFT the portfolio value (eyebrow, big
               official total, supporting line), RIGHT the Portfolio
               value over time chart (title + chart + verified baseline
               caption). On phones the card stacks: value first, chart
               below. "Re-check prices" sits at the TOP RIGHT of the
               card as a quiet TEXT LINK (same demotion as Mark as
               seen — no filled button) and keeps its quiet behaviour:
               values/timestamps update in place, no sweep details are
               surfaced on activation. The chart's old standalone unit
               and its Growth-section copy are gone — this is the
               portfolio chart's only rendering. The "Forward tracking ·
               baseline…" subtext was removed (the hero already
               establishes the number + date); the verified baseline
               caption under the chart stays. Stat tiles sit below the
               merged card. Official values only. ——— */}
        <div className="quiet-panel px-5 py-5 sm:px-6" style={vis(inGroup("home"))}>
          <div className="flex justify-end">
            <button onClick={() => refresh.mutate()} disabled={refresh.isPending} aria-label="Re-check prices — values and timestamps update in place" className="shrink-0 px-1 py-1 text-sm font-bold underline underline-offset-2 disabled:opacity-50" style={{ color: "var(--accent-ink)" }}>{refresh.isPending ? "Checking…" : "↻ Re-check prices"}</button>
          </div>
          <div className="mt-2 grid gap-6 lg:grid-cols-2 lg:gap-0 lg:items-start">
            <div className="min-w-0 lg:pr-8">
              <p className="kicker" style={{ color: "var(--accent-ink)" }}>Comp-based official values{latestChecked ? ` · Latest check ${latestChecked}` : ""}</p>
              <h1 className="num font-display text-[52px] leading-none font-bold mt-3 sm:text-7xl" style={{ letterSpacing: "-0.02em" }}>{fmt(base)}</h1>
              {/* Gain/loss lives HERE now (Oct 9 redesign — moved out of
                  the top bar): the ▲/▼ signed % vs first snapshot sits
                  directly under the big portfolio value in this left
                  column. Official values only; never colour-only — the
                  chip carries the arrow + signed % in text and a
                  Gain/Loss aria-label, and the benchmark is spelled
                  out beside it. */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {/* Glass delta pill (glass-on-glass): a glass capsule
                    ON the hero glass carrying the signed gain/loss. */}
                {delta30 != null
                  ? <span className="glass-pill" role="img" aria-label={`${delta30 >= 0 ? "Gain" : "Loss"} ${delta30 >= 0 ? "+" : "−"}${Math.abs(delta30).toFixed(1)} percent vs first snapshot`}><span aria-hidden style={{ color: "var(--delta-ink)" }}>{delta30 >= 0 ? "▲ +" : "▼ −"}{Math.abs(delta30).toFixed(1)}%</span><span style={{ color: "var(--dim)", fontWeight: 600 }}>vs first snapshot</span></span>
                  : <span className="text-sm" style={{ color: "var(--dim)" }}>vs first snapshot</span>}
                <span className="text-[11px]" style={{ color: "var(--faint)" }}>Official values only</span>
              </div>
              {/* Hero facelift (design pass, Oct 13): the policy prose
                  is now a ONE-LINE summary; the full explanation lives
                  behind the "How values work" disclosure (the codebase's
                  <details> pattern, collapsed by default). */}
              <p className="mt-3 text-sm max-w-xl leading-relaxed" style={{ color: "var(--dim)" }}>Official value across <strong style={{ color: "var(--text)" }}>{data.totals.pricedCount} priced cards</strong> — comp-based, revalued on every refresh; cards with an owner-kept price stay locked at it.</p>
              <details className="mt-1.5 max-w-xl">
                <summary aria-label="How values work — expand for the full explanation of official values" className="touch-target cursor-pointer inline-flex items-center text-sm font-bold underline underline-offset-2" style={{ color: "var(--accent-ink)", minHeight: 36 }}>How values work</summary>
                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--dim)" }}>Official portfolio value across <strong style={{ color: "var(--text)" }}>{data.totals.pricedCount} priced cards</strong> ({data.totals.totalCount} total). The official number is <strong style={{ color: "var(--text)" }}>comp-based and live</strong>: each card’s official value is its latest checked price from verified comps, revalued on every refresh — cards with no comp check yet sit at their vault estimate, labelled unverified. Cards with an owner-kept price stay locked at it by the owner’s instruction; every other card floats to verified comps.</p>
              </details>
              {/* Cost summary line (Remedies pass 1 — audit remedy
                  P0-3): renders ONLY when at least one card carries a
                  recorded cost, and says plainly that the P&L covers
                  just those cards — never the whole portfolio. */}
              {data.totals.costSummary.cardsWithCost > 0 && (() => {
                const cs = data.totals.costSummary;
                const up = cs.unrealizedPlUsd >= 0;
                return (
                  <p className="mt-3 text-sm max-w-xl leading-relaxed" style={{ color: "var(--dim)" }}>
                    Cost on file for {cs.cardsWithCost} card{cs.cardsWithCost === 1 ? "" : "s"}: <strong className="num" style={{ color: "var(--text)" }}>{fmt(cs.totalCostUsd)} → {fmt(cs.currentValueOfCostedUsd)}</strong>{" "}
                    <span className="num font-bold" style={{ color: up ? "var(--hold)" : "var(--sell)" }} aria-label={`Unrealized ${up ? "gain" : "loss"} of ${fmt(Math.abs(cs.unrealizedPlUsd))}${cs.unrealizedPlPct != null ? `, ${Math.abs(cs.unrealizedPlPct).toFixed(1)} percent` : ""}`}>{up ? "▲ +" : "▼ −"}{fmt(Math.abs(cs.unrealizedPlUsd))}{cs.unrealizedPlPct != null ? ` (${cs.unrealizedPlPct > 0 ? "+" : ""}${cs.unrealizedPlPct.toFixed(1)}%)` : ""}</span>
                    {" "}— partial coverage: cost is recorded for only part of the vault, so this P&amp;L covers those cards only, not the whole portfolio.
                  </p>
                );
              })()}
            </div>
            <div className="relative min-w-0 border-t pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8" style={{ borderColor: "var(--hairline)" }}>
              {/* The floating latest-value callout pill was REMOVED
                  (phase 2, owner): it duplicated the hero total and
                  could show a stale snapshot value. The big total and
                  the chart tooltips carry the number. */}
              <p className="font-display font-bold text-lg">Portfolio value over time</p>
              <div className="mt-3 h-[190px] sm:h-[230px] lg:h-[210px]" role="img" aria-label={`Area chart of portfolio value over time, forward-tracked from the first recorded snapshot. Latest snapshot total: ${fmt(data.totals.officialTotal)} across ${data.totals.pricedCount} priced cards. The caption beneath the chart states the verified baseline this series starts from.`}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={snapshotData} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false} />
                    <XAxis dataKey="date" tick={chartTick} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                    <YAxis domain={[0, "dataMax + 2500"]} tick={chartTick} axisLine={false} tickLine={false} tickFormatter={(v: number) => "$" + Math.round(v / 1000) + "k"} width={48} />
                    <Tooltip formatter={(v: any) => [fmt(Number(v)), "Portfolio value"]} contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_TEXT} itemStyle={CHART_TOOLTIP_TEXT} />
                    <Area type="monotone" dataKey="total" stroke="var(--accent)" strokeWidth={2.5} fill="var(--accent)" fillOpacity={0.16} dot={{ r: 5, fill: "var(--accent)", stroke: "#0b0c0f", strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--faint)" }}>{data.snapshots[0]?.note ?? ""} {snapshotData.length <= 1 ? "One snapshot so far — the line draws itself as refreshes accrue." : `${snapshotData.length} snapshots recorded.`}</p>
            </div>
          </div>
        </div>

        {/* ——— FRESHNESS LINE (phase 2) — the update-status line that
               used to live INSIDE the removed digest block, lifted out
               verbatim (same stored-log facts: last daily refresh,
               latest logged update, last/next scout sweep) and rendered
               standalone directly under the hero whenever the portfolio
               is loaded — no longer gated on any digest state. ——— */}
        <p className="mt-3 px-1 text-[11px] leading-relaxed" style={{ color: "var(--faint)", ...vis(inGroup("home")) }} role="note" aria-label="Update status — last daily price refresh and last scout sweep">
          ↻ Last daily refresh {updateHealth.dailyLog ? <strong style={{ color: "var(--dim)" }}>{new Date(updateHealth.dailyLog.ranAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</strong> : "not logged yet"}{updateHealth.dailyFailed ? <strong style={{ color: "var(--sell)" }}> — research dispatch FAILED, values unchanged (see Change log)</strong> : ""} · latest logged update {updateHealth.lastLog ? <strong style={{ color: "var(--dim)" }}>{new Date(updateHealth.lastLog.ranAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</strong> : "—"} · last sweep {updateHealth.lastSweepAt ? <strong style={{ color: "var(--dim)" }}>{new Date(updateHealth.lastSweepAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</strong> : "—"}, next ~{nextSweepLabel}
        </p>

        {/* Stat tiles NAVIGATE (design pass, Oct 13): each tile is a
            real button with the same face — Cards → Vault › Collection;
            Top holding → that card's detail page via openCardDetail
            (the same path collection rows use, so ← Back restores Home
            exactly); Concentration → Insights › Risk; Top 5 share →
            Vault › Collection with the sort set to value descending
            (the collection's existing sortKey state). */}
        <div className="mt-4 mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4" style={vis(inGroup("home"))}>
          {[
            { k: "Cards", v: `${data.totals.activeCount} active`, s: `${data.totals.psaCount} PSA · ${data.totals.cgcCount} CGC`, aria: `Cards: ${data.totals.activeCount} active — go to Vault, Collection`, go: () => goNav("vault", "collection") },
            { k: "Top holding", v: fmt(data.totals.topHoldingValue), s: data.totals.topHoldingName, aria: `Top holding: ${data.totals.topHoldingName} — view card`, go: () => { const th = top5[0]; if (th) openCardDetail(th.cert); else goNav("vault", "collection"); } },
            { k: "Concentration", v: pct(data.totals.topHoldingPct), s: "in the top holding alone — see advisor note", aria: `Concentration: ${pct(data.totals.topHoldingPct)} in the top holding alone — go to Insights, Risk`, go: () => goNav("insights", "risk") },
            { k: "Top 5 share", v: pct(top5Pct), s: "of priced value", aria: `Top 5 share: ${pct(top5Pct)} of priced value — go to Vault, Collection sorted by value`, go: () => { setSortKey("value"); goNav("vault", "collection"); } },
          ].map(x => (
            <button key={x.k} onClick={x.go} aria-label={x.aria} className="quiet-panel slab-hover touch-target p-4 text-left w-full" style={{ minHeight: 44 }}>
              <p className="kicker" style={{ color: "var(--faint)" }}>{x.k}</p>
              <p className="num text-xl font-bold mt-1.5">{x.v}</p>
              <p className="text-xs mt-0.5 leading-snug" style={{ color: "var(--dim)" }}>{x.s}</p>
            </button>
          ))}
        </div>

        {/* ——— TOP HOLDINGS SLAB FAN (Glass Vault phase 1) ———
               The top 4 active cards by official value, each a graded
               slab: grader-matched label + the FULL real card image.
               Nothing else is printed on the case — no cert, no price.
               Desktop: side by side with real gaps and slight outward
               tilt, front card = top holding. Phone: 2×2 staircase
               offset by a full label height — no label ever covered.
               Clicking a slab opens that card's detail page through
               the same openCardDetail path collection rows use, so
               ← Back restores Home exactly. */}
        {top5.length > 0 && (
          <section aria-label="Top holdings — graded slab fan" className="mb-5" style={vis(inGroup("home"))}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-1">
              <h2 className="font-display text-xl font-bold">Top holdings</h2>
              <span className="text-sm" style={{ color: "var(--dim)" }}>Your top {Math.min(4, top5.length)} slabs by official value</span>
              <button onClick={() => goNav("vault", "collection")} aria-label="View the full collection in Vault, Collection" className="ml-auto px-1 py-1 text-sm font-bold underline underline-offset-2" style={{ color: "var(--accent-ink)" }}>Collection →</button>
            </div>
            <div className="slab-fan">
              {top5.slice(0, 4).map((c, i) => (
                <GradedSlab key={c.cert} card={c} fanIndex={i} onOpen={() => openCardDetail(c.cert)} />
              ))}
            </div>
          </section>
        )}

        {/* The last-visit digest block was REMOVED from Home at the
               owner's order (phase 2, Oct 13, 2026) — bar, details
               tiles, deal-alerts block, seen button and re-open button
               are all gone. The freshness line from the block renders
               standalone under the hero (above); server digest
               computation and deal-alert recording are untouched. */}

        {/* ——— SCOUTS & SWEEPS — the standalone scout deal feed was
               RETIRED (Oct 9): pinned deals live only in the Findings
               Ledger (Pinned tab). What remains here is the sweep
               machinery: the manual sweep trigger, its log, and the
               scout roster. No finding renders here. ——— */}
        <section aria-label="Scout sweeps and team" className="quiet-panel mt-5 p-5 sm:p-6" style={vis(inGroup("scouts", "league"))}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[220px]">
              <p className="kicker" style={{ color: "var(--accent-ink)" }}>🐾 Scouts &amp; sweeps</p>
              <p className="text-sm mt-1 max-w-2xl" style={{ color: "var(--dim)" }}>The scouts roam the town around the data — margins, paths, gaps — never over it. Every kept finding lives in the <strong style={{ color: "var(--text)" }}>Findings Ledger</strong> (Deals › Ledger); pinned deals are its Pinned tab.</p>
            </div>
            <button onClick={() => sweepMut.mutate()} disabled={sweepMut.isPending} aria-label="Run a scout sweep now" className="rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50" style={{ background: "var(--accent)", color: "#1a0b36" }}>{sweepMut.isPending ? "Sweeping…" : "🐾 Sweep now — hunt newly listed"}</button>
          </div>
          {sweepMut.data && <p className="mt-2 text-xs max-w-3xl" style={{ color: "var(--dim)" }}>{sweepMut.data.summary}</p>}

          {/* Sweep log — collapsible (same pattern as Change log): collapsed
              by default, header shows the latest sweep's headline, state
              remembered in localStorage (log-open-sweep). */}
          <div className="mt-6 rounded-2xl px-4 py-2" style={{ background: "var(--glass)", border: "1px solid var(--hairline)" }}>
            <button onClick={() => setSweepLogOpen(v => !v)} aria-expanded={sweepLogOpen} aria-label={sweepLogOpen ? "Collapse sweep log" : "Expand sweep log"} className="w-full flex items-center gap-3 text-left py-2.5 min-h-[48px]">
              <span className="font-display font-bold shrink-0">🧹 Sweep log</span>
              <span className="flex-1 min-w-0 truncate text-xs" style={{ color: "var(--dim)" }}>
                {data.sweeps[0]
                  ? `Latest ${new Date(data.sweeps[0].sweptAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} — ${data.sweeps.filter(s => s.sweptAt === data.sweeps[0]!.sweptAt).reduce((s, x) => s + x.candidatesSeen, 0)} candidates · ${data.sweeps.filter(s => s.sweptAt === data.sweeps[0]!.sweptAt).reduce((s, x) => s + x.findsCount, 0)} finds · every ~2 hours (12/day) · Next sweep ${nextSweepLabel}`
                  : "No sweeps logged yet — every ~2 hours (12/day)"}
              </span>
              <span aria-hidden className="shrink-0 text-xs font-bold rounded-full px-2.5 py-1 border" style={{ borderColor: "var(--border)", color: "var(--accent-ink)" }}>{sweepLogOpen ? "▾ Hide" : "▸ Show"}</span>
            </button>
            {sweepLogOpen && (data.sweeps.length > 0 ? (
              <div className="mt-1 mb-2 overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[560px]">
                  <thead><tr style={{ color: "var(--faint)" }}><th className="py-1.5 pr-3 font-semibold">Time</th><th className="py-1.5 pr-3 font-semibold">Scout</th><th className="py-1.5 pr-3 font-semibold">Sources checked</th><th className="py-1.5 pr-3 font-semibold">Candidates</th><th className="py-1.5 pr-3 font-semibold">Finds</th><th className="py-1.5 font-semibold">Note</th></tr></thead>
                  <tbody>
                    {data.sweeps.slice(0, 12).map((sw: Sweep) => { const sc = scoutById.get(sw.scoutId); return (
                      <tr key={sw.id} style={{ borderTop: "1px solid var(--hairline)" }}>
                        <td className="py-1.5 pr-3 num whitespace-nowrap">{new Date(sw.sweptAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                        <td className="py-1.5 pr-3 whitespace-nowrap">{sc ? `${sc.emoji} ${sc.name}` : sw.scoutId}</td>
                        <td className="py-1.5 pr-3" style={{ color: "var(--dim)" }}>{sw.sourcesChecked}</td>
                        <td className="py-1.5 pr-3 num">{sw.candidatesSeen}</td>
                        <td className="py-1.5 pr-3 num">{sw.findsCount}{sw.tier1Count + sw.tier2Count > 0 ? ` (T1 ${sw.tier1Count} · T2 ${sw.tier2Count})` : ""}</td>
                        <td className="py-1.5" style={{ color: "var(--dim)" }}>{sw.note}</td>
                      </tr> ); })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-1 mb-2 text-sm" style={{ color: "var(--dim)" }}>No sweeps logged yet under the new cadence — hit <strong style={{ color: "var(--text)" }}>Sweep now</strong> above, and the 2-hourly schedule keeps it going from there.</p>
            ))}
          </div>

          {/* Scout team — compact row (Oct 9 redesign): all five scouts
              across on desktop, centred cards (avatar on top, name, beat,
              ONE short status line, compact stats). The full status
              paragraph lives in the card's tooltip (title) and in the
              League / journal — not on the card face. Evolution state
              from the Paper League shows as a badge by the avatar. */}
          <div className="mt-5 pt-5 flex flex-wrap justify-center gap-3" style={{ borderTop: "1px solid var(--hairline)" }}>
            {data.scouts.map(s => {
              const pinned = pinnedByScout.get(s.scoutId);
              const sighting = sightingByScout.get(s.scoutId);
              const pinnedCount = ledgerPinned.filter(d => d.scoutId === s.scoutId).length;
              const paper = (v2?.paper ?? []).find(pp => pp.scoutId === s.scoutId);
              const isRocket = s.scoutId === "rocket";
              const rocketIntelCount = (data?.v2.rocket.findIntel ?? []).length;
              const rocketFlagCount = (data?.v2.rocket.holdingFlags ?? []).length;
              const sweepTime = s.lastSweepAt ? new Date(s.lastSweepAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : null;
              return (
              <div key={s.scoutId} title={s.statusLine} className="flex flex-col items-center text-center rounded-2xl p-3.5 basis-[calc(50%-6px)] md:basis-[calc(33.333%-8px)] xl:basis-0 xl:flex-1" style={{ background: "var(--glass)", border: pinned ? "1px solid rgba(217,164,65,0.55)" : "1px solid var(--hairline)" }}>
                <div className="relative">
                  <ScoutAvatar scout={s} size={46} />
                  {paper && paper.stage >= 2 && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: "var(--accent)", color: "#1a0b36" }} title={`Evolved in the Paper League: ${paper.evolution} (stage ${paper.stage})`}>✨ {paper.evolution}</span>}
                </div>
                <p className="font-display font-bold text-[15px] leading-tight mt-2.5">{s.name}</p>
                <p className="text-[11px] leading-snug" style={{ color: "var(--accent-ink)" }}>{s.territory}</p>
                <p className="mt-1.5 text-xs leading-snug line-clamp-2" style={{ color: "var(--dim)" }}>{firstSentence(s.statusLine)}</p>
                {pinned && <button onClick={() => { goNav("deals", "ledger"); window.setTimeout(() => document.getElementById(`ledger-deal-${pinned.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 90); }} aria-label={`Open ${pinned.cardName} in the Findings Ledger`} className="mt-1.5 text-xs font-bold underline line-clamp-2" style={{ color: "var(--accent-ink)" }}>🎉 {pinned.cardName} — pinned in the Ledger ↓</button>}
                {!pinned && sighting && <button onClick={() => { goNav("deals", "ledger"); window.setTimeout(() => document.getElementById(`ledger-deal-${sighting.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 90); }} aria-label={`Open sighting ${sighting.cardName} in the Findings Ledger`} className="mt-1.5 text-xs font-semibold underline line-clamp-2" style={{ color: "var(--dim)" }}>👀 Sighting: {sighting.cardName} ↓</button>}
                <div className="mt-auto pt-2.5 text-[11px] leading-relaxed" style={{ color: "var(--faint)" }}>
                  {isRocket
                    ? <p className="num">{rocketIntelCount} bear case{rocketIntelCount === 1 ? "" : "s"} · {rocketFlagCount} stress test{rocketFlagCount === 1 ? "" : "s"}</p>
                    : <p className="num">{s.findsCount} finds{pinnedCount > 0 ? ` · ${pinnedCount} pinned` : ""} · {s.lastSweepCandidates ?? 0} checked · {s.lastSweepFinds ?? 0} under</p>}
                  <p>⏱ Last sweep {sweepTime ?? "—"}</p>
                </div>
              </div>
              );
            })}
          </div>
        </section>

        {/* ——— FINDINGS LEDGER — the permanent, segmented record ——— */}
        {/* ——— V2 HUB SECTIONS — progressive disclosure: the surfaces live
               here, folded until the Surfaces nav bar in the command strip
               (or the mobile bottom tab bar) picks one via v2Tab ——— */}
        <div className="v2-hub" data-tab={v2Tab}>
        {/* ——— V2 SHOW MODE — phone-first slab scanner companion ——— */}
        <section id="v2-show" aria-label="Show Mode — quick lookup for card shows" className="quiet-panel dex-bezel mt-8 p-4 sm:p-6 scroll-mt-24">
          <p className="kicker" style={{ color: "var(--accent-ink)" }}>📟 Show Mode — slab scanner companion</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold mt-1.5">One-screen verdict, in person</h2>
          <p className="text-sm mt-1 max-w-3xl" style={{ color: "var(--dim)" }}>Type a cert number or a card name / grade — or tap <strong style={{ color: "var(--text)" }}>📷 Scan slab</strong> and photograph the label: OCR reads the cert number, grader and grade, and the QR code is decoded when your phone supports it. The verdict still uses only tracked dashboard data, and no invented results for untracked cards. The photo is processed in memory only and never saved.</p>
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <input aria-label="Show Mode search — cert number or card name" value={showQ} onChange={e => { setShowQ(e.target.value); setShowCert(null); }} placeholder="Cert # (e.g. DEMO-1002) or card name…" className="touch-target flex-1 rounded-full px-4 py-3 text-base outline-none" style={{ border: "1px solid var(--accent)", background: "var(--surface)", color: "var(--text)" }} />
            <input ref={scanInputRef} type="file" accept="image/*" capture="environment" aria-label="Take or choose a slab label photo to scan" className="hidden" onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void handleScanFile(f); }} />
            <button onClick={() => scanInputRef.current?.click()} disabled={scanBusy} aria-label="Scan a slab with your camera — photographs the cert number and QR code" className="touch-target rounded-full px-5 py-3 text-sm font-black" style={{ background: "var(--accent)", color: "#1a0b36", opacity: scanBusy ? 0.6 : 1 }}>{scanBusy ? "⏳ Reading…" : "📷 Scan slab"}</button>
            <button onClick={() => { setShowQ(""); setShowCert(null); setScanResult(null); setScanError(null); }} aria-label="Clear Show Mode search" className="touch-target rounded-full px-5 py-3 text-sm font-bold border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>Clear</button>
          </div>
          {(scanBusy || scanError || scanResult) && (
            <div className="mt-3 rounded-2xl p-4" style={{ background: "var(--glass)", border: scanError ? "1.5px solid var(--sell)" : "1px solid var(--hairline)" }} role="status" aria-live="polite" aria-label="Slab scan result">
              <div className="flex gap-3">
                {scanPreview && <img src={scanPreview} alt="Your slab label photo being scanned" className="rounded-xl object-cover shrink-0" style={{ width: 84, height: 84, border: "1px solid var(--border)" }} />}
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold">{scanBusy ? "Reading the slab…" : scanError ? "Scan didn't work" : scanResult?.status === "matched_cert" ? "📷 Scan matched a tracked slab" : scanResult?.status === "matched_name" ? "📷 Scan matched by card name" : "📷 Scan read the label"}</p>
                  <p className="text-sm mt-0.5" style={{ color: "var(--dim)" }}>{scanBusy ? "OCR is reading the cert number, grader and grade, and any QR payload is being checked. Photo processed in memory only — never saved." : scanError ?? scanResult?.message}</p>
                  {scanResult && !scanBusy && (
                    <>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                        {scanResult.extracted.grader && <span className="px-2 py-1 rounded-full font-bold" style={{ background: "var(--surface-alt)" }}>Grader: {scanResult.extracted.grader}</span>}
                        {scanResult.extracted.grade && <span className="px-2 py-1 rounded-full font-bold" style={{ background: "var(--surface-alt)" }}>Grade: {scanResult.extracted.grade}</span>}
                        {scanResult.extracted.cardName && <span className="px-2 py-1 rounded-full font-bold" style={{ background: "var(--surface-alt)" }}>{scanResult.extracted.cardName}{scanResult.extracted.setName ? ` · ${scanResult.extracted.setName}` : ""}{scanResult.extracted.number ? ` #${scanResult.extracted.number}` : ""}</span>}
                        {scanResult.certCandidates.map(c => <span key={c} className="num px-2 py-1 rounded-full font-bold" style={{ background: "var(--surface-alt)" }}>Cert read: {c}</span>)}
                        {scanResult.qrPayload && <span className="px-2 py-1 rounded-full font-bold" style={{ background: "var(--surface-alt)" }}>QR: {scanResult.qrPayload.slice(0, 60)}{scanResult.qrPayload.length > 60 ? "…" : ""}</span>}
                        <span className="px-2 py-1 rounded-full" style={{ background: "var(--surface-alt)", color: "var(--dim)" }}>OCR confidence: {scanResult.extracted.confidence}</span>
                      </div>
                      {scanResult.extracted.visibleText && <p className="text-xs mt-1.5" style={{ color: "var(--faint)" }}>Label text read: “{scanResult.extracted.visibleText.slice(0, 180)}”</p>}
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {scanResult.matches.length > 1 || scanResult.status === "matched_name" ? scanResult.matches.map(m => (
                          <button key={m.cert} onClick={() => applyScanCert(m.cert)} aria-label={`Load verdict for scanned match ${m.name} cert ${m.cert}`} className="touch-target rounded-full px-3.5 py-2 text-xs font-bold" style={{ background: "var(--accent)", color: "#1a0b36" }}>{m.relation === "owned" ? "✓ Owned" : "👀 Lineage"} · {m.name} · cert {m.cert}</button>
                        )) : null}
                        {scanResult.status === "not_tracked" && scanResult.certCandidates.map(c => (
                          <button key={c} onClick={() => { setShowCert(null); setShowQ(c); }} aria-label={`Put scanned cert ${c} in the search to verify it`} className="touch-target rounded-full px-3.5 py-2 text-xs font-bold border" style={{ borderColor: "var(--accent)", color: "var(--accent-ink)" }}>Verify cert {c} in search</button>
                        ))}
                        <button onClick={() => scanInputRef.current?.click()} aria-label="Retake the slab photo" className="touch-target rounded-full px-3.5 py-2 text-xs font-bold border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>↻ Retake photo</button>
                      </div>
                      <p className="text-[11px] mt-2" style={{ color: "var(--faint)" }}>Always eyeball the cert digits against the physical label before acting on a scan — a glare-obscured digit can be misread, and the verdict below is only as good as the number it was loaded with.</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          {(() => {
            const q = showQ.trim().toLowerCase();
            if (!q) return <p className="mt-3 text-sm" style={{ color: "var(--dim)" }}>Try a cert you own (DEMO-1002), a sibling watched in Lineage, or a name like “Lugia”, “Charizard”, “Mew”.</p>;
            const certHit = (data.cards ?? []).find(c => c.cert.toLowerCase() === q);
            const nameHits = (data.cards ?? []).filter(c => (c.name + " " + c.setName + " " + c.grader + " " + c.grade).toLowerCase().includes(q));
            const watchHits = (data.watchlist ?? []).filter(w => w.name.toLowerCase().includes(q));
            const passedHit = (v2?.passedNames ?? []).find(n => n.toLowerCase().includes(q) || q.includes(n.split("—")[0]?.trim().toLowerCase() ?? "~~~"));
            const chosen = certHit ?? (showCert ? (data.cards ?? []).find(c => c.cert === showCert) : nameHits[0]);
            if (!chosen && watchHits.length === 0 && !passedHit) {
              const closest = (data.terminal ?? []).filter(t => t.name.toLowerCase().split(" ").some(tok => tok.length > 3 && q.includes(tok))).slice(0, 4);
              return (
                <div className="mt-4 rounded-2xl p-4" style={{ background: "rgba(224,90,58,0.08)", border: "1px solid rgba(224,90,58,0.4)" }}>
                  <p className="font-display text-xl font-bold">Not in tracked data — no verdict faked.</p>
                  <p className="text-sm mt-1" style={{ color: "var(--dim)" }}>“{showQ}” is not in the collection, watchlist, sales evidence or Market Terminal. Check the cert number, or try one of the closest tracked matches:</p>
                  {closest.length > 0 ? <ul className="mt-2 grid gap-1 text-sm">{closest.map(t => <li key={t.subjectKey}>• {t.name} — {t.gradeLabel} · market {fmt(t.marketUsd)} <span style={{ color: "var(--faint)" }}>({t.marketSource})</span></li>)}</ul> : <p className="text-sm mt-2" style={{ color: "var(--dim)" }}>No close tracked matches either.</p>}
                </div>
              );
            }
            return (
              <div className="mt-4 grid gap-3">
                {passedHit && <p className="rounded-xl px-4 py-3 text-sm font-bold" style={{ background: "rgba(224,90,58,0.12)", border: "1px solid var(--sell)", color: "var(--sell)" }}>⛔ PASSED — you passed on “{passedHit}”. It stays hidden from suggestions by your rule; shown here only because you searched for it directly.</p>}
                {nameHits.length > 1 && !certHit && (
                  <div className="flex flex-wrap gap-2">{nameHits.slice(0, 6).map(c => <button key={c.cert} onClick={() => setShowCert(c.cert)} aria-label={`Show verdict for ${c.name} cert ${c.cert}`} className="touch-target rounded-full px-3 py-2 text-xs font-bold border" style={{ borderColor: "var(--border)", color: "var(--text)" }}>{c.name} {c.grader} {c.grade} · {c.cert}</button>)}</div>
                )}
                {chosen && (() => {
                  const vsales = (salesByCert.get(chosen.cert) ?? []).filter(s => s.verified).slice().sort((a, b) => b.saleDate.localeCompare(a.saleDate));
                  const pop = (v2?.pops ?? []).find(p => p.cert === chosen.cert);
                  const pump = (v2?.pump ?? []).find(p => p.cert === chosen.cert);
                  const maxBuyM = chosen.notes.match(/MAX BUY/i);
                  const sourceLabel = OWNER_KEPT_CERTS_CLIENT.includes(chosen.cert) ? "Owner-kept value (owner’s instruction) — locked" : chosen.checkedUsd != null ? "Comp-based official — latest live checked price (verified sold comps / aggregator cross-check)" : "Vault estimate — unverified";
                  return (
                    <article className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--surface-alt)", border: "1.5px solid var(--accent)" }}>
                      <p className="kicker" style={{ color: "var(--accent-ink)" }}>{chosen.status === "active" ? "✓ OWNED" : chosen.status.toUpperCase()} · Cert {chosen.cert}</p>
                      <h3 className="font-display text-2xl sm:text-3xl font-bold mt-1">{chosen.name}</h3>
                      <p className="text-sm" style={{ color: "var(--dim)" }}>{chosen.year} · {chosen.setName} #{chosen.number} · {chosen.grader} {chosen.grade}</p>
                      <p className="num font-display text-4xl font-black mt-3">{fmt(chosen.effectiveUsd)}</p>
                      <p className="text-xs" style={{ color: "var(--dim)" }}>Current value — {sourceLabel}</p>
                      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        <p className="rounded-xl px-3 py-2" style={{ background: "var(--glass)" }}><strong>Last verified sales:</strong><br />{vsales.length ? vsales.slice(0, 3).map(s => `${fmt(s.price)} · ${s.saleDate} · ${s.source}`).join("  |  ") : "None on file — no sale invented."}</p>
                        <p className="rounded-xl px-3 py-2" style={{ background: "var(--glass)" }}><strong>Pop:</strong> {pop ? `${pop.popTotal.toLocaleString()} total${pop.popGrade != null ? ` · ${pop.popGrade.toLocaleString()} at grade` : ""} · trend: baseline Oct 8, 2026${pop.alert ? " · ⚠ +>10% in 30d" : " · velocity accrues per refresh"}` : (chosen.popInfo ?? "No pop on file")}</p>
                        <p className="rounded-xl px-3 py-2" style={{ background: "var(--glass)" }}><strong>Pump Detector:</strong> {pump ? `${pump.level} (score ${pump.score}) — ${pump.factors[0] ?? ""}` : "Not scored"}</p>
                        <p className="rounded-xl px-3 py-2" style={{ background: "var(--glass)" }}><strong>Max-pay line:</strong><br />{maxBuyM ? "See watchlist max-buy for this card (TCGplayer-tracked, Oct 8, 2026)." : vsales.length ? `Anchor to last verified sale ${fmt(vsales[0]?.price)} (verified sold comp) — guidance, not a watchlist max-buy.` : `Anchor to current value ${fmt(chosen.effectiveUsd)} (${sourceLabel}) — guidance only; no verified sale on file.`}</p>
                      </div>
                      <p className="mt-3 text-sm"><strong>Advisor:</strong> <span style={{ color: callColor(chosen.advisorCall) }}>{chosen.advisorCall}</span> — {chosen.advisorReason}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => openCardDetail(chosen.cert)} aria-label={`Open full detail page for ${chosen.name}`} className="touch-target rounded-full px-4 py-2 text-sm font-bold" style={{ background: "var(--accent)", color: "#1a0b36" }}>Full detail →</button>
                        <button onClick={() => { setLineageCert(chosen.cert); goNav("vault", "lineage"); }} aria-label={`Open lineage watch for cert ${chosen.cert} in Vault, Lineage`} className="touch-target rounded-full px-4 py-2 text-sm font-bold border" style={{ borderColor: "var(--accent)", color: "var(--accent-ink)" }}>Lineage →</button>
                      </div>
                    </article>
                  );
                })()}
                {watchHits.map(w => (
                  <article key={w.id} className="rounded-2xl p-4" style={{ background: "var(--glass)", border: "1px solid var(--hairline)" }}>
                    <p className="kicker" style={{ color: "var(--hold)" }}>👀 WATCHLISTED — not owned</p>
                    <p className="font-semibold mt-1">{w.name}</p>
                    <p className="text-sm mt-1" style={{ color: "var(--accent-ink)" }}>{w.priceContext}</p>
                    <p className="text-sm mt-1" style={{ color: "var(--dim)" }}>{w.thesis}</p>
                    <p className="text-sm mt-1"><strong>Max-pay / rule:</strong> {w.actionRule}</p>
                  </article>
                ))}
              </div>
            );
          })()}
        </section>

        {/* ——— V2 TRENCHES (B) ——— */}
        <section id="v2-trenches" aria-label="Trenches Mode — just-listed firehose" className="quiet-panel mt-8 p-4 sm:p-6 scroll-mt-24">
          <p className="kicker" style={{ color: "var(--accent-ink)" }}>⚡ Trenches Mode</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold mt-1.5">Just-listed firehose</h2>
          <p className="text-sm mt-1 max-w-3xl" style={{ color: "var(--dim)" }}>Newest first from the 2-hour sweeps, matching your watchlist theses. One-tap <strong style={{ color: "var(--text)" }}>Keep / Pass / Closed · Ended / Open</strong> — Pass hides the card for good, and Closed / Ended files the listing as ended so it never comes back. Desktop keyboard: <strong style={{ color: "var(--text)" }}>K</strong> keep · <strong style={{ color: "var(--text)" }}>P</strong> pass · <strong style={{ color: "var(--text)" }}>E</strong> closed / ended · <strong style={{ color: "var(--text)" }}>O</strong> open (acts on the highlighted card while Trenches is on screen).</p>
          {trenchItems.length === 0 ? (
            <p className="mt-3 text-sm rounded-xl px-4 py-3" style={{ background: "var(--glass)", color: "var(--dim)" }}>No just-listed items in the firehose right now — the sweeps report what they actually checked; the next sweep lands within ~2 hours.</p>
          ) : (
            <div className="mt-4 grid gap-2.5">
              {trenchItems.slice(0, 15).map((t, i) => (
                <article key={t.key} className="rounded-2xl px-3.5 py-3" style={{ background: "var(--glass)", border: i === trenchIdx ? "1.5px solid var(--accent)" : "1px solid var(--hairline)" }}>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <p className="font-semibold leading-snug flex-1 min-w-[180px]">{t.name} {t.grade && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--surface-alt)", color: "var(--accent-ink)" }}>{t.grade}</span>}</p>
                    <span className="num font-bold">{fmt(t.ask)}</span>
                    {t.pctOfMarket != null && <span className="num text-xs font-bold" style={{ color: t.pctOfMarket <= 85 ? "var(--hold)" : "var(--dim)" }}>{t.pctOfMarket.toFixed(0)}% of market</span>}
                    <span className="text-xs" style={{ color: "var(--faint)" }}>{t.marketplace} · listed {t.at}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button onClick={() => { if (t.dealId != null) findingStatusMut.mutate({ id: t.dealId, status: "live" }); setTrenchIdx(i); }} aria-label={`Keep ${t.name} in Trenches`} className="touch-target rounded-full px-3 py-2.5 text-sm font-bold" style={{ background: "var(--hold)", color: "var(--ink-on-fill)" }}>Keep</button>
                    <button onClick={() => { if (t.dealId != null) passDealMut.mutate({ id: t.dealId }); else passListingMut.mutate({ id: t.id }); }} aria-label={`Pass on ${t.name} — hide forever`} className="touch-target rounded-full px-3 py-2.5 text-sm font-bold border" style={{ borderColor: "var(--sell)", color: "var(--sell)" }}>Pass ✕</button>
                    <button onClick={() => { if (t.dealId != null) endFindingMut.mutate({ source: "deal", id: t.dealId }); else endFindingMut.mutate({ source: "listing", id: t.id }); }} aria-label={`Mark ${t.name} closed / ended — never show again`} className="touch-target rounded-full px-3 py-2.5 text-sm font-bold border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>Closed / Ended</button>
                    {t.url ? <a href={t.url} target="_blank" rel="noreferrer" aria-label={`Open listing for ${t.name}`} className="touch-target rounded-full px-3 py-2.5 text-sm font-bold text-center border" style={{ borderColor: "var(--accent)", color: "var(--accent-ink)" }}>Open ↗</a> : <span className="touch-target rounded-full px-3 py-2.5 text-sm text-center" style={{ color: "var(--faint)", border: "1px dashed var(--border)" }}>No link</span>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ——— V2 INDICES + HEATMAP (E) ——— */}
        <section id="v2-indices" aria-label="Custom indices and portfolio heatmap" className="quiet-panel mt-8 p-4 sm:p-6 scroll-mt-24">
          <p className="kicker" style={{ color: "var(--accent-ink)" }}>📈 Indices + Heatmap</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold mt-1.5">Your market, benchmarked</h2>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl p-4" style={{ background: "var(--glass)", border: "1px solid var(--hairline)" }}>
              <p className="font-display font-bold">Custom indices — base 100</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--dim)" }}>Normalized at the first honest data point (Oct 8, 2026). Where back-data is thin the line starts today and accrues — no history fabricated.</p>
              <div className="mt-3" style={{ height: 190 }} role="img" aria-label={`Line chart of custom indices, base 100 at October 8 2026. Current values: ${(v2?.indices ?? []).map(i => `${i.name} ${i.value.toFixed(1)}`).join(", ")}. The same values are listed in text beside the chart.`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={(v2?.indices[0]?.points ?? []).map(p => ({ date: p.date, portfolio: p.value }))} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false} />
                    <XAxis dataKey="date" tick={chartTick} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                    <YAxis domain={[90, "dataMax + 5"]} tick={chartTick} axisLine={false} tickLine={false} width={40} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_TEXT} itemStyle={CHART_TOOLTIP_TEXT} />
                    <Line type="monotone" dataKey="portfolio" name="Portfolio" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--accent)" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="grid gap-1.5">
                {(v2?.indices ?? []).map(ix => (
                  <p key={ix.name} className="flex flex-wrap items-baseline gap-x-2 text-sm"><strong className="flex-1 min-w-[140px]">{ix.name}</strong><span className="num font-bold">{ix.value.toFixed(1)}</span><Sparkline values={ix.points.map(p => p.value)} /></p>
                ))}
              </div>
              <p className="text-[11px] mt-2 leading-relaxed" style={{ color: "var(--faint)" }}>{v2?.indices[0]?.note ?? ""}</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: "var(--glass)", border: "1px solid var(--hairline)" }}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display font-bold flex-1">Heatmap — size = value, colour = change</p>
                {(["portfolio", "watchlist"] as const).map(m => <button key={m} onClick={() => setHeatmapMode(m)} aria-pressed={heatmapMode === m} aria-label={`Heatmap: ${m}`} className="touch-target rounded-full px-3 py-1.5 text-xs font-bold border capitalize" style={heatmapMode === m ? { background: "var(--sel-bg)", color: "var(--sel-ink)", borderColor: "var(--sel-edge)" } : { borderColor: "var(--border)", color: "var(--dim)" }}>{m}</button>)}
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--dim)" }}>Grey = no 30d change data on file (honest, not zero). Tap a portfolio tile to open the card.</p>
              {heatmapMode === "portfolio" ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[...active].filter(c => c.effectiveUsd != null).sort((a, b) => (b.effectiveUsd ?? 0) - (a.effectiveUsd ?? 0)).map(c => {
                    const ch = cardChange30(c.cert);
                    const bg = ch == null ? "rgba(140,140,140,0.35)" : ch >= 0 ? `rgba(63,182,143,${Math.min(0.75, 0.25 + Math.abs(ch) / 60)})` : `rgba(224,90,58,${Math.min(0.75, 0.25 + Math.abs(ch) / 60)})`;
                    return (
                      <button key={c.cert} onClick={() => openCardDetail(c.cert)} aria-label={`Open ${c.name} from heatmap — value ${fmt(c.effectiveUsd)}`} className="touch-target rounded-xl px-3 py-2 text-left" style={{ background: bg, flexGrow: Math.max(1, Math.round((c.effectiveUsd ?? 0) / 220)), flexBasis: 110, border: "1px solid rgba(0,0,0,0.35)" }}>
                        <span className="block text-xs font-bold leading-tight">{c.name}</span>
                        <span className="num block text-xs mt-0.5">{fmt(c.effectiveUsd)} {ch != null ? `· ${ch >= 0 ? "+" : ""}${ch.toFixed(0)}%` : "· no data"}</span>
                        <span className="block"><Sparkline values={(salesByCert.get(c.cert) ?? []).filter(s => s.verified).map(s => s.price)} width={52} height={14} /></span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(data.terminal ?? []).filter(t => t.subjectType === "watchlist" && t.marketUsd != null).slice(0, 18).map(t => (
                    <div key={t.subjectKey} className="rounded-xl px-3 py-2" style={{ background: "rgba(140,140,140,0.35)", flexGrow: Math.max(1, Math.round((t.marketUsd ?? 0) / 60)), flexBasis: 110, border: "1px solid rgba(0,0,0,0.35)" }}>
                      <span className="block text-xs font-bold leading-tight">{t.name}</span>
                      <span className="num block text-xs mt-0.5">{fmt(t.marketUsd)} · grey — no 30d data</span>
                    </div>
                  ))}
                  {(data.terminal ?? []).filter(t => t.subjectType === "watchlist" && t.marketUsd != null).length === 0 && <p className="text-sm" style={{ color: "var(--dim)" }}>No watchlist items with a single defensible market figure yet.</p>}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ——— V2 PUMP DETECTOR + POP DILUTION (C) ——— */}
        <section id="v2-risk" aria-label="Pump Detector and population dilution" className="quiet-panel mt-8 p-4 sm:p-6 scroll-mt-24">
          <p className="kicker" style={{ color: "var(--sell)" }}>🛡 Pump Detector + Pop Dilution</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold mt-1.5">Manipulation risk, in plain words</h2>
          <p className="text-sm mt-1 max-w-3xl" style={{ color: "var(--dim)" }}>Scored from single-print spike vs median comp, comp dispersion, source quality and volume thinness. Green/red here mean risk states only.</p>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="grid gap-2 content-start">
              {(v2?.pump ?? []).slice(0, 8).map(p => (
                <article key={p.cert} className="rounded-2xl px-4 py-3" style={{ background: "var(--glass)", border: p.level === "High" ? "1.5px solid var(--sell)" : "1px solid var(--hairline)" }}>
                  <p className="flex flex-wrap items-baseline gap-2 text-sm"><strong className="flex-1 min-w-[170px]">{p.name}</strong><span className="text-[11px] font-black px-2 py-0.5 rounded-full" style={{ background: p.level === "High" ? "var(--sell)" : p.level === "Watch" ? "var(--trim)" : "rgba(63,182,143,0.25)", color: p.level === "High" || p.level === "Watch" ? "var(--ink-on-fill)" : "var(--text)" }}>{p.level.toUpperCase()} · {p.score}</span><DeltaChip value={cardChange30(p.cert)} /></p>
                  <ul className="mt-1.5 grid gap-0.5 text-sm" style={{ color: "var(--dim)" }}>{p.factors.map(f => <li key={f}>• {f}</li>)}</ul>
                </article>
              ))}
            </div>
            <div className="rounded-2xl p-4 content-start" style={{ background: "var(--glass)", border: "1px solid var(--hairline)" }}>
              <p className="font-display font-bold">Pop dilution — scarcity erosion watch</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--dim)" }}>PSA pop tracked across refreshes. Alert state when a holding's pop grows &gt;10% in 30 days. Baseline seeded Oct 8, 2026 — velocity accrues from real refreshes, never backfilled.</p>
              <div className="mt-3 grid gap-2">
                {(v2?.pops ?? []).map(p => (
                  <p key={p.cert} className="rounded-xl px-3 py-2.5 text-sm" style={{ background: p.alert ? "rgba(224,90,58,0.10)" : "var(--surface-alt)", border: p.alert ? "1px solid var(--sell)" : "1px solid transparent" }}>
                    <strong>{p.cardName}</strong> <span className="num">· pop {p.popTotal.toLocaleString()}{p.popGrade != null ? ` (grade pop ${p.popGrade.toLocaleString()})` : ""}</span><br />
                    <span style={{ color: "var(--dim)" }}>{p.velocityPct == null ? "Velocity: baseline only — first refresh comparison pending" : `Velocity: ${p.velocityPct > 0 ? "+" : ""}${p.velocityPct}%`} {p.alert ? "· ⚠ ALERT — scarcity eroding" : ""} · recorded {p.recordedAt}</span>
                  </p>
                ))}
              </div>
              <p className="text-[11px] mt-2" style={{ color: "var(--faint)" }}>Seeded pops are recorded per card above; velocity compares each new reading against the previous one.</p>
            </div>
          </div>
          {/* ——— Round 4: Team Rocket holding stress tests ——— */}
          <div className="mt-4 rounded-2xl p-4" style={{ background: "rgba(212,58,47,0.07)", border: "1px solid rgba(212,58,47,0.45)" }}>
            <p className="font-display font-bold">🚀 Team Rocket — holding stress tests <span className="text-xs font-sans font-semibold" style={{ color: "var(--dim)" }}>(adversarial view · Rocket never pins, never recommends buying or selling)</span></p>
            <p className="text-xs mt-0.5" style={{ color: "var(--dim)" }}>Rocket hunts the cheapest LIVE copy of every card you hold. When the cheapest live ask undercuts a held value by more than 8%, the premium is flagged as unconfirmed by the live market — asks are not sales, but the flag also feeds the Pump Detector above as a labelled input signal.</p>
            {(v2?.rocket.holdingFlags ?? []).length > 0 ? (
              <div className="mt-3 grid gap-2">
                {(v2?.rocket.holdingFlags ?? []).map(f => (
                  <p key={f.cert} className="rounded-xl px-3 py-2.5 text-sm flex flex-wrap gap-x-4 gap-y-0.5" style={{ background: "var(--glass)" }}>
                    <strong className="flex-1 min-w-[180px]">{f.name}</strong>
                    <span>Held value <strong className="num">{fmt(f.heldValue)}</strong></span>
                    <span>Cheapest live ask <strong className="num">{fmt(f.bestAsk)}</strong></span>
                    <span className="font-bold" style={{ color: "var(--sell)" }}>▼ {f.pctUnder.toFixed(1)}% under held value</span>
                    <button onClick={() => openCardDetail(f.cert)} aria-label={`Open ${f.name} detail page`} className="font-bold underline underline-offset-2" style={{ color: "var(--accent-ink)" }}>Open card</button>
                  </p>
                ))}
              </div>
            ) : <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>No holding is failing the stress test right now — no live ask undercuts a held value by more than 8%. (Rocket is displeased. The twerp's portfolio survives another sweep.)</p>}
          </div>
        </section>

        {/* ——— V2 PAPER LEAGUE + EVOLUTION (D) ——— */}
        <section id="v2-league" aria-label="Scout paper-trading league and evolution" className="quiet-panel mt-8 p-4 sm:p-6 scroll-mt-24">
          <p className="kicker" style={{ color: "var(--accent-ink)" }}>🏆 Scout Paper-Trading League — PAPER ONLY, no real trades</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold mt-1.5">Which scout actually finds value?</h2>
          <p className="text-sm mt-1 max-w-3xl" style={{ color: "var(--dim)" }}>Each scout paper-buys its qualifying finds at find price (Tier 1 full position, Tier 2 half) against a hypothetical $10,000 paper bankroll, marked to market on refresh. Hypothetical P&amp;L only — the league influences nothing automatically. When win rate / paper P&amp;L crosses thresholds, a scout's sprite <strong style={{ color: "var(--text)" }}>evolves</strong> — Eevee is the showcase.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[...(v2?.paper ?? [])].sort((a, b) => b.pnl - a.pnl).map((p, rank) => {
              const scout = scoutById.get(p.scoutId);
              return (
                <article key={p.scoutId} className="rounded-2xl p-4" style={{ background: "var(--glass)", border: p.stage >= 2 ? "1.5px solid var(--accent)" : "1px solid var(--hairline)" }}>
                  <div className="flex items-center gap-3">
                    <div style={{ transform: `scale(${1 + p.stage * 0.09})`, transformOrigin: "center" }}><ScoutAvatar scout={scout} size={44 + p.stage * 4} /></div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm leading-tight">#{rank + 1} {scout?.name ?? p.scoutId}</p>
                      <p className="text-xs font-bold" style={{ color: "var(--accent-ink)" }}>{p.stage >= 2 ? "✨ EVOLVED — " : ""}{p.evolution}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <p className="rounded-lg px-2.5 py-1.5" style={{ background: "var(--surface-alt)" }}>Paper P&amp;L<br /><strong className="num" style={{ color: p.pnl >= 0 ? "var(--hold)" : "var(--sell)" }}>{p.pnl >= 0 ? "+" : ""}{fmt(p.pnl)}</strong></p>
                    <p className="rounded-lg px-2.5 py-1.5" style={{ background: "var(--surface-alt)" }}>Win rate<br /><strong className="num">{p.winRate.toFixed(0)}%</strong></p>
                    <p className="rounded-lg px-2.5 py-1.5" style={{ background: "var(--surface-alt)" }}>Finds<br /><strong className="num">{p.finds}</strong></p>
                    <p className="rounded-lg px-2.5 py-1.5" style={{ background: "var(--surface-alt)" }}>Positions<br /><strong className="num">{p.positions}</strong> · <span className="num">{fmt(p.invested)}</span> in</p>
                  </div>
                  <p className="text-[11px] mt-2" style={{ color: "var(--faint)" }}>Paper bankroll {fmt(p.bankroll)} · evolution stage {p.stage}/3 — thresholds: stage 2 at paper P&amp;L &gt;$300 or win rate ≥55%, stage 3 at &gt;$1,500 or (≥60% and &gt;$500).</p>
                </article>
              );
            })}
          </div>
          {(v2?.paperPositions ?? []).length > 0 ? (
            <div className="mt-4 grid gap-1.5">
              {(v2?.paperPositions ?? []).slice(0, 10).map(pos => (
                <p key={pos.id} className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm rounded-xl px-3 py-2" style={{ background: "var(--glass)" }}>
                  <span className="flex-1 min-w-[170px]"><strong>{pos.cardName}</strong> <span style={{ color: "var(--dim)" }}>· {pos.scoutId} · {pos.sizeFactor === 1 ? "full" : "half"} position</span></span>
                  <span className="num">entry {fmt(pos.entryUsd)} → market {fmt(pos.marketUsd)}</span>
                  <span className="num font-bold" style={{ color: pos.pnl >= 0 ? "var(--hold)" : "var(--sell)" }}>{pos.pnl >= 0 ? "+" : ""}{fmt(pos.pnl)} paper</span>
                </p>
              ))}
            </div>
          ) : <p className="mt-3 text-sm" style={{ color: "var(--dim)" }}>No paper positions yet — positions open automatically when a sweep pins a Tier 1 / Tier 2 find.</p>}
          {/* ——— Round 4: Scout Field Journal (from logged sweep records only) ——— */}
          <details className="mt-5 rounded-2xl px-4 py-3" style={{ background: "var(--glass)", border: "1px solid var(--hairline)" }}>
            <summary className="cursor-pointer font-display font-bold min-h-[44px] flex items-center" aria-label="Scout field journal — expand for the latest in-character shift logs">📓 Scout Field Journal — latest shift per scout <span className="text-xs font-sans font-normal ml-2" style={{ color: "var(--dim)" }}>(generated only from each scout's logged sweep records — the data wins over the diary, always)</span></summary>
            <div className="mt-2 grid gap-2.5">
              {(v2?.journal ?? []).map(j => (
                <article key={j.scoutId + j.date} className="rounded-xl px-3.5 py-3" style={{ background: j.scoutId === "rocket" ? "rgba(212,58,47,0.08)" : "var(--surface-alt)", border: j.scoutId === "rocket" ? "1px dashed rgba(212,58,47,0.55)" : "1px solid transparent" }}>
                  <p className="text-sm font-bold">{j.title} <span className="num text-xs font-semibold" style={{ color: "var(--dim)" }}>· {j.date}</span></p>
                  <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--dim)" }}>{j.body}</p>
                  {j.links.length > 0 && <p className="mt-1.5 flex flex-wrap gap-2">{j.links.map(l => <a key={l.href + l.label} href={l.href} className="text-xs font-bold underline underline-offset-2" style={{ color: "var(--accent-ink)" }}>{l.label} →</a>)}</p>}
                </article>
              ))}
              {(v2?.journal ?? []).length === 0 && <p className="text-sm" style={{ color: "var(--dim)" }}>No journal entries yet — they are composed from sweep records as sweeps log.</p>}
            </div>
          </details>
        </section>

        {/* ——— V2 BID/ASK + EXIT DESK (G) ——— */}
        <section id="v2-exit" aria-label="Bid ask spread board and Exit Desk" className="quiet-panel mt-8 p-4 sm:p-6 scroll-mt-24">
          <p className="kicker" style={{ color: "var(--accent-ink)" }}>⚖️ Bid/Ask Board + Exit Desk</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold mt-1.5">The sell side, with receipts</h2>
          <p className="text-sm mt-1 max-w-3xl" style={{ color: "var(--dim)" }}>Every figure is source-labeled: <strong style={{ color: "var(--text)" }}>ask = active listing</strong>, <strong style={{ color: "var(--text)" }}>bid = live auction state</strong>, <strong style={{ color: "var(--text)" }}>sale = verified comp</strong>. Wide spread or no bids = liquidity warning. Exit Desk drafts listings only — The owner posts and sells. No automated selling, and no buying automation.</p>
          <div className="mt-4 grid gap-2.5">
            {(v2?.spreads ?? []).map(s => (
              <article key={s.key} className="rounded-2xl px-4 py-3" style={{ background: "var(--glass)", border: s.warning ? "1px solid rgba(224,90,58,0.5)" : "1px solid var(--hairline)", position: "relative", overflow: "hidden" }}>
                {s.bestAsk != null && s.lastSale != null && s.lastSale > 0 && <div aria-hidden style={{ position: "absolute", inset: 0, width: `${Math.min(100, (s.bestAsk / s.lastSale) * 100)}%`, background: "rgba(217,164,65,0.07)", pointerEvents: "none" }} />}
                <p className="relative font-semibold text-sm">{s.name} <span className="font-normal" style={{ color: "var(--dim)" }}>· {s.gradeLabel}</span></p>
                <div className="relative mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  <span>Ask <span style={{ color: "var(--faint)" }}>(listing)</span>: <strong className="num">{fmt(s.bestAsk)}</strong></span>
                  <span>Bid <span style={{ color: "var(--faint)" }}>(live auction)</span>: <strong className="num">{fmt(s.highestBid)}</strong></span>
                  <span>Last sale <span style={{ color: "var(--faint)" }}>(verified comp)</span>: <strong className="num">{fmt(s.lastSale)}</strong></span>
                  <span>Spread: <strong className="num">{s.spreadPct == null ? "—" : s.spreadPct.toFixed(1) + "%"}</strong></span>
                </div>
                <p className="relative text-[11px] mt-1" style={{ color: "var(--faint)" }}>Ask: {s.askSource} · Bid: {s.bidSource} · Sale: {s.saleSource}</p>
                {s.warning && <p className="relative text-xs font-bold mt-1" style={{ color: "var(--sell)" }}>⚠ Liquidity warning: {s.warning}</p>}
              </article>
            ))}
          </div>
          <h3 className="font-display text-xl font-bold mt-6">Exit Desk — Sell / Trim cards</h3>
          <p className="text-sm mt-1" style={{ color: "var(--dim)" }}>Live bid watch: a watched auction’s current bid can appear as the live-bid reference on the board above until the lot closes. Generate a draft and it is built from the card's data + provenance with a comp-based, source-labeled price suggestion.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {active.filter(c => c.advisorCall.includes("SELL") || c.advisorCall.includes("TRIM")).map(c => (
              <button key={c.cert} onClick={() => exitDraftMut.mutate({ cert: c.cert })} aria-label={`Generate listing draft for ${c.name}`} className="touch-target rounded-full px-4 py-2.5 text-sm font-bold border" style={{ borderColor: "var(--accent)", color: "var(--accent-ink)" }}>✎ Draft listing — {c.name} ({fmt(c.effectiveUsd)})</button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {(v2?.exits ?? []).map(d => <ExitDraftCard key={d.id} draft={d} onUpdate={(args) => exitUpdateMut.mutate(args)} />)}
          </div>
          {(v2?.exits ?? []).length === 0 && <p className="mt-3 text-sm" style={{ color: "var(--dim)" }}>No drafts yet — generate one above when the time feels right.</p>}
        </section>

        {/* ——— NPC TOWN MARKET — training range ——— */}
        <section id="v2-npc" aria-label="NPC town market — simulated dealer offers from real market data" className="slab mt-8 p-4 sm:p-6 scroll-mt-24">
          <p className="kicker" style={{ color: "var(--accent-ink)" }}>🏪 Town Market — TRAINING RANGE</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold mt-1.5">NPC vendors — spot the deal, spot the rip-off</h2>
          <p className="mt-2 rounded-xl px-4 py-3 text-sm font-semibold leading-relaxed" style={{ background: "rgba(217,164,65,0.10)", border: "1px solid var(--accent)", color: "var(--text)" }}>NPC prices are SIMULATED from real market data — not real listings. The real market value and % vs market sit next to every NPC ask. Any action links out to a real marketplace search for that card. Passed items may reappear as NPC shop stock — still never as real suggestions.</p>
          {(() => {
            const bucket = Math.floor(Date.now() / (2 * 3600 * 1000));
            const pool = (data.terminal ?? []).filter(t => t.marketUsd != null && t.marketUsd > 0);
            const factors = [0.82, 1.24, 0.93, 1.1, 0.87, 1.31];
            const vendors = [
              { name: "Morty the Night Dealer", sprite: "gengar", blurb: "“Psst. Under the lamp. Cash only, no questions — check my math anyway.”" },
              { name: "Yuki's JP Imports", sprite: "eevee", blurb: "“Fresh from Osaka. My prices hug the market — mostly.”" },
              { name: "Big Bram's Slab Shack", sprite: "snorlax", blurb: "“Premium prices for premium naps. Bram accepts no lowballs (his are fine).”" },
            ];
            if (pool.length === 0) return <p className="mt-3 text-sm" style={{ color: "var(--dim)" }}>The shops are dark — no tracked market figures to stock them from yet.</p>;
            return (
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {vendors.map((v, vi) => (
                  <article key={v.name} className="rounded-2xl p-4" style={{ background: "var(--glass)", border: "1px solid var(--hairline)" }}>
                    <div className="flex items-center gap-3">
                      <PixelSprite scoutId={v.sprite} size={46} />
                      <div><p className="font-semibold text-sm leading-tight">{v.name}</p><p className="text-xs italic" style={{ color: "var(--dim)" }}>{v.blurb}</p></div>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {[0, 1].map(slot => {
                        const item = pool[(bucket * 2 + vi * 2 + slot * 3) % pool.length]!;
                        const factor = factors[(bucket + vi * 2 + slot) % factors.length]!;
                        const npcAsk = Math.round((item.marketUsd ?? 0) * factor);
                        const vsMkt = Math.round((factor - 1) * 100);
                        const q = encodeURIComponent(item.name.replace(/—.*$/, "").trim() + " Pokemon card");
                        return (
                          <div key={slot} className="rounded-xl px-3 py-2.5 text-sm" style={{ background: "var(--surface-alt)" }}>
                            <p className="font-semibold leading-snug">{item.name} <span className="font-normal" style={{ color: "var(--dim)" }}>· {item.gradeLabel}</span></p>
                            <p className="mt-1">NPC ask <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(217,164,65,0.2)", color: "var(--accent-ink)" }}>SIMULATED</span>: <strong className="num">{fmt(npcAsk)}</strong></p>
                            <p className="text-xs" style={{ color: "var(--dim)" }}>Real market: <strong className="num" style={{ color: "var(--text)" }}>{fmt(item.marketUsd)}</strong> ({item.marketSource}) · <strong style={{ color: vsMkt <= -8 ? "var(--hold)" : vsMkt >= 10 ? "var(--sell)" : "var(--dim)" }}>{vsMkt <= -8 ? `▼ ${Math.abs(vsMkt)}% UNDER — opportunity pattern` : vsMkt >= 10 ? `▲ ${vsMkt}% OVER — rip-off pattern` : `${vsMkt >= 0 ? "+" : ""}${vsMkt}% vs market — fair-ish`}</strong></p>
                            <a href={`https://www.ebay.com/sch/i.html?_nkw=${q}`} target="_blank" rel="noreferrer" aria-label={`Search real listings for ${item.name} on eBay`} className="touch-target inline-flex items-center mt-1 text-xs font-bold underline" style={{ color: "var(--accent-ink)", minHeight: 36 }}>Find the real thing on eBay ↗</a>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            );
          })()}
          <p className="text-[11px] mt-3" style={{ color: "var(--faint)" }}>Stock rotates on the 2-hour sweep cadence (same rotation bucket as the sweeps). NPC offers train your eye — they are never buyable here, and there is no buying automation.</p>
        </section>

        {/* ——— SEASONAL TOWN EVENTS ——— */}
        <section id="v2-events" aria-label="Seasonal town events calendar" className="slab mt-8 p-4 sm:p-6 scroll-mt-24">
          <p className="kicker" style={{ color: "var(--accent-ink)" }}>🎃 Seasonal Town Events — cosmetics only</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold mt-1.5">The town dresses up; the data doesn't</h2>
          <p className="text-sm mt-1 max-w-3xl" style={{ color: "var(--dim)" }}>Event skins layer over the day/night engine and adjust per phase — haunted nights get darker, golden hour goes full autumn. Events change no data, badge or panel meaning.</p>
          <div className="mt-3 flex items-center gap-4 rounded-2xl p-4" style={{ background: "rgba(224,122,42,0.10)", border: "1px solid rgba(224,122,42,0.5)" }} aria-hidden>
            <PixelSprite scoutId="gengar" size={64} />
            <p className="text-3xl tracking-widest">🎃 👻 🎃 🦇 🎃</p>
            <p className="text-sm font-semibold hidden sm:block">Gengar runs Halloween in this town — it haunts the margins a little more boldly this month (still never over your data).</p>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {[
              { name: "Halloween", when: "Oct 1 – Oct 31, 2026", live: todNow >= new Date("2026-10-01T00:00:00") && todNow <= new Date("2026-10-31T23:59:59"), desc: "Haunted night accents, pumpkins, autumn palette, Gengar featured. Live now if you're reading this in October." },
              { name: "Autumn", when: "November 2026", live: todNow >= new Date("2026-11-01T00:00:00") && todNow <= new Date("2026-11-30T23:59:59"), desc: "Leaf-drift paths, harvest palette over the town. Data entry in the calendar — no rebuild needed." },
              { name: "Snow", when: "December 2026", live: todNow >= new Date("2026-12-01T00:00:00") && todNow <= new Date("2026-12-31T23:59:59"), desc: "Snowfall over the grass, frozen pond, warm windows. Data entry in the calendar — no rebuild needed." },
            ].map(ev => (
              <article key={ev.name} className="rounded-2xl px-4 py-3" style={{ background: "var(--glass)", border: ev.live ? "1.5px solid var(--accent)" : "1px solid var(--hairline)" }}>
                <p className="font-semibold text-sm">{ev.name} {ev.live && <span className="text-[11px] font-black px-2 py-0.5 rounded-full" style={{ background: "var(--accent)", color: "#1a0b36" }}>LIVE</span>}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--accent-ink)" }}>{ev.when}</p>
                <p className="text-sm mt-1" style={{ color: "var(--dim)" }}>{ev.desc}</p>
              </article>
            ))}
          </div>
          {/* ——— Round 4: Town Chronicle — growth milestones from real data ——— */}
          <div className="mt-5 rounded-2xl p-4" style={{ background: "var(--glass)", border: "1px solid var(--hairline)" }}>
            <p className="font-display font-bold">🏘 Town Chronicle — what the town has built <span className="text-xs font-sans font-normal" style={{ color: "var(--dim)" }}>(structures appear in the town itself only when the milestone is truly met — never faked)</span></p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(v2?.milestones ?? []).map(m => (
                <p key={m.id} className="rounded-xl px-3 py-2.5 text-sm" style={{ background: m.met ? "rgba(63,182,143,0.10)" : "var(--surface-alt)", border: m.met ? "1px solid rgba(63,182,143,0.45)" : "1px dashed var(--border)" }}>
                  <strong>{m.icon} {m.label}</strong> — {m.met ? <span className="font-bold" style={{ color: "var(--hold)" }}>✓ BUILT</span> : <span className="font-bold" style={{ color: "var(--dim)" }}>🔒 LOCKED</span>}<br />
                  <span style={{ color: "var(--dim)" }}>{m.met ? m.evidence : `Goal: ${m.condition}. ${m.evidence}`}</span>
                </p>
              ))}
            </div>
            {(() => { const next = (v2?.milestones ?? []).find(m => !m.met); return next ? <p className="mt-3 text-sm font-semibold">Next goal marker: <span style={{ color: "var(--accent-ink)" }}>{next.icon} {next.label}</span> — {next.condition}. <span className="font-normal" style={{ color: "var(--dim)" }}>{next.evidence}</span></p> : <p className="mt-3 text-sm font-semibold" style={{ color: "var(--hold)" }}>Every milestone is built — the town is complete. For now.</p>; })()}
          </div>
        </section>

        {/* ——— SLAB LINEAGE + SIBLING WATCH ——— */}
        <section id="v2-lineage" aria-label="Slab Lineage — cert watch management; full biographies open in the card detail" className="quiet-panel mt-8 p-4 sm:p-6 scroll-mt-24">
          <p className="kicker" style={{ color: "var(--accent-ink)" }}>🧬 Slab Lineage + Sibling Watch</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold mt-1.5">Cert watch — management</h2>
          <p className="text-sm mt-1 max-w-3xl leading-relaxed" style={{ color: "var(--dim)" }}>All 45 owned certs are auto-enrolled, seeded from card data, your provided acquisition events, and recorded sales evidence. Sweeps and the daily refresh match cert-number strings in listing titles/descriptions (eBay, Fanatics, major auction houses) against watched certs — a new appearance appends to that cert's timeline and fires an alert + digest entry. PSA cert status is re-checked where feasible; a deactivated/changed cert is recorded as <strong style={{ color: "var(--text)" }}>“cert status changed — possible regrade/crossover” — an inference to verify, not a fact</strong>. CGC uses the same string matching, with thinner verification coverage.</p>
          <p className="mt-2 rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ background: "rgba(217,164,65,0.09)", border: "1px solid var(--hairline)" }}>Hard limit: public appearances only — private sales and listings that don't print cert numbers are invisible to this. Private sales appear only if reported. Never infer an owner identity from an appearance.</p>
          <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>This page is the watch list only — <strong style={{ color: "var(--text)" }}>tap any cert to open its card's detail page</strong>, where the biography timeline and sibling certs live — scoped to that card only.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(v2?.lineageWatch ?? []).map(w => {
              const latest = (v2?.lineageEvents ?? []).filter(e => e.cert === w.cert)[0];
              const ownedCard = (data.cards ?? []).find(c => c.cert === w.cert);
              const firstToken = (w.label.split(" ")[0] ?? "").toLowerCase();
              const relatedCard = ownedCard ?? (data.cards ?? []).find(c => firstToken.length > 2 && c.name.toLowerCase().startsWith(firstToken));
              return (
                <button key={w.cert} onClick={() => { setLineageCert(w.cert); if (relatedCard) openCardDetail(relatedCard.cert); }} aria-label={relatedCard ? `Open card detail for ${relatedCard.name} — lineage cert ${w.cert}, ${w.label}` : `Select watched cert ${w.cert} — ${w.label}`} className="touch-target rounded-full px-3.5 py-2 text-xs font-bold text-left" style={{ border: w.relation === "owned" ? "1.5px solid var(--accent)" : w.relation === "sibling" ? "1.5px dashed #8b7fd4" : "1px solid var(--border)", color: "var(--text)", background: "var(--glass)" }}>
                  {w.relation === "owned" ? "🟢 OWNED" : w.relation === "sibling" ? "👀 SIBLING — NOT OWNED" : "🔎 WATCHED"} · {w.cert}<br />
                  <span className="font-normal">{w.label}{latest ? ` · latest: ${latest.venue} ${latest.eventDate}` : " · no events yet"}</span>
                </button>
              );
            })}
          </div>
          {(() => {
            const w = (v2?.lineageWatch ?? []).find(x => x.cert === lineageCert);
            if (!w) return null;
            const count = (v2?.lineageEvents ?? []).filter(e => e.cert === lineageCert).length;
            return (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "var(--glass)", border: "1px solid var(--hairline)" }}>
                <p className="text-sm flex-1 min-w-[220px]"><strong>Cert {w.cert}</strong> — {w.label} · <span style={{ color: "var(--dim)" }}>{count} event{count === 1 ? "" : "s"} on file — the full timeline renders on the card's detail page.</span></p>
                <button onClick={() => exportLineage(w.cert)} aria-label={`Export lineage record for cert ${w.cert} as JSON — passport-ready`} className="touch-target rounded-full px-3 py-2 text-xs font-bold border" style={{ borderColor: "var(--accent)", color: "var(--accent-ink)" }}>⬇ Export record (JSON)</button>
                {w.relation === "watched" && <button onClick={() => lineageRemoveMut.mutate({ cert: w.cert })} aria-label={`Remove cert ${w.cert} from lineage watch`} className="touch-target rounded-full px-3 py-2 text-xs font-bold border" style={{ borderColor: "var(--sell)", color: "var(--sell)" }}>Remove watch</button>}
              </div>
            );
          })()}
          <div className="mt-4 rounded-2xl p-4" style={{ background: "var(--glass)", border: "1px solid var(--hairline)" }}>
            <p className="font-semibold text-sm">Add a cert to the sibling watch</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--dim)" }}>Siblings of owned certs, or any cert of interest. Only appearances with a real source/link are ever recorded — no source, no event.</p>
            <div className="mt-2 flex flex-col sm:flex-row gap-2">
              <input aria-label="New lineage watch cert number" value={newLineageCert} onChange={e => setNewLineageCert(e.target.value)} placeholder="Cert number" inputMode="numeric" className="touch-target rounded-full px-4 py-2.5 text-sm outline-none" style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }} />
              <input aria-label="Label for new lineage watch cert" value={newLineageLabel} onChange={e => setNewLineageLabel(e.target.value)} placeholder="Label (e.g. sibling copy)" className="touch-target flex-1 rounded-full px-4 py-2.5 text-sm outline-none" style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }} />
              <button onClick={() => { if (newLineageCert.trim().length >= 3) { lineageAddMut.mutate({ cert: newLineageCert.trim(), label: newLineageLabel.trim() }); setLineageCert(newLineageCert.trim()); setNewLineageCert(""); setNewLineageLabel(""); } }} aria-label="Add cert to lineage watch" className="touch-target rounded-full px-5 py-2.5 text-sm font-bold" style={{ background: "var(--accent)", color: "#1a0b36" }}>Watch this cert</button>
            </div>
          </div>
        </section>

        </div>

        <section id="findings-ledger" aria-label="Findings Ledger — every scout finding, kept and segmented" className="quiet-panel mt-8 p-5 sm:p-6 scroll-mt-6" style={vis(inGroup("deals", "ledger"))}>
          <div>
            <p className="kicker" style={{ color: "var(--hold)" }}>📒 Findings Ledger — kept for good</p>
            <h2 className="font-display text-2xl font-bold mt-1.5">Every scout finding, in one place</h2>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--dim)" }}>This ledger is the <strong style={{ color: "var(--text)" }}>single home for every scout finding</strong> — pinned deals live in its Pinned tab, and findings never vanish from here. Each one is stored with when it was first found, who found it, where, its link, ask, market/comp and % of market at time found — deduped by listing URL, so a re-found listing updates its last-seen and price instead of duplicating.</p>
            <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--faint)" }}>How a find qualifies: <strong style={{ color: "var(--dim)" }}>Tier 1 pinned</strong> = linked &amp; ≥15% under a verified comp · <strong style={{ color: "var(--dim)" }}>Close</strong> = 8–15% under comp (or under a watchlist max-buy), linked · no link = sighting, never a deal.</p>
            <p className="mt-4 inline-flex items-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-[13px] sm:text-sm font-bold" style={{ background: "rgba(63,182,143,0.12)", border: "1px solid rgba(63,182,143,0.45)", color: "var(--text)" }}>
              <span aria-hidden>🔗</span> {ledgerSummary}
            </p>
          </div>

          {/* Primary segmentation: deal tier tabs with count badges */}
          <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Ledger segment by deal tier">
            {([
              { id: "all" as const, label: "All findings", count: ledgerAll.filter(d => d.status !== "gone" && d.status !== "bought").length },
              { id: "pinned" as const, label: "📌 Pinned deals", count: ledgerPinned.length },
              { id: "close" as const, label: "🔎 Close — worth a look", count: ledgerClose.length },
              { id: "stale" as const, label: "⚠ Stale — unverified", count: ledgerStale.length },
              { id: "sightings" as const, label: "👀 Sightings", count: ledgerSightings.length },
              { id: "acquired" as const, label: "✓ Acquired via scouts", count: ledgerBought.length },
              { id: "expired" as const, label: "Expired / Gone", count: ledgerGone.length },
            ]).map(t => (
              <button key={t.id} onClick={() => setLedgerTier(t.id)} aria-label={`Ledger segment: ${t.label}, ${t.count} findings`} aria-pressed={ledgerTier === t.id} className="rounded-full px-3.5 py-2 text-xs font-bold border inline-flex items-center gap-1.5" style={ledgerTier === t.id ? { background: "var(--sel-bg)", color: "var(--sel-ink)", borderColor: "var(--sel-edge)" } : { borderColor: "var(--border)", color: "var(--dim)", background: "rgba(0,0,0,0.3)" }}>
                {t.label} <span className="num rounded-full px-1.5 py-0.5 text-[10px]" style={{ background: ledgerTier === t.id ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.08)" }}>{t.count}</span>
              </button>
            ))}
          </div>

          {/* Filter chips: scout / marketplace / target group / status */}
          <div className="mt-4 grid gap-3">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter ledger by scout">
              <span className="text-[11px] font-bold uppercase tracking-wider mr-1" style={{ color: "var(--faint)" }}>Scout</span>
              {["All", ...data.scouts.map(s => s.scoutId)].map(id => {
                const sc = id === "All" ? null : scoutById.get(id);
                const count = id === "All" ? ledgerAll.length : ledgerAll.filter(d => d.scoutId === id).length;
                return <button key={id} onClick={() => setLedgerScout(id)} aria-label={`Filter by scout: ${sc ? sc.name : "All scouts"}`} aria-pressed={ledgerScout === id} className="rounded-full px-2.5 py-1 text-[11px] font-semibold border" style={ledgerScout === id ? { background: "var(--surface-alt)", color: "var(--text)", borderColor: "var(--accent)" } : { borderColor: "var(--border)", color: "var(--dim)" }}>{sc ? `${sc.emoji} ${sc.name}` : "All scouts"} · {count}</button>;
              })}
            </div>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter ledger by marketplace">
              <span className="text-[11px] font-bold uppercase tracking-wider mr-1" style={{ color: "var(--faint)" }}>Market</span>
              {["All", ...ledgerMarkets].map(m => (
                <button key={m} onClick={() => setLedgerMarket(m)} aria-label={`Filter by marketplace: ${m}`} aria-pressed={ledgerMarket === m} className="rounded-full px-2.5 py-1 text-[11px] font-semibold border" style={ledgerMarket === m ? { background: "var(--surface-alt)", color: "var(--text)", borderColor: "var(--accent)" } : { borderColor: "var(--border)", color: "var(--dim)" }}>{m === "All" ? "All marketplaces" : m} · {m === "All" ? ledgerAll.length : ledgerAll.filter(d => (d.marketplace.split("—")[0]?.trim() ?? d.marketplace) === m).length}</button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter ledger by target group">
              <span className="text-[11px] font-bold uppercase tracking-wider mr-1" style={{ color: "var(--faint)" }}>Target</span>
              {["All", ...ledgerGroups].map(g => (
                <button key={g} onClick={() => setLedgerGroup(g)} aria-label={`Filter by target group: ${g}`} aria-pressed={ledgerGroup === g} className="rounded-full px-2.5 py-1 text-[11px] font-semibold border" style={ledgerGroup === g ? { background: "var(--surface-alt)", color: "var(--text)", borderColor: "var(--accent)" } : { borderColor: "var(--border)", color: "var(--dim)" }}>{g === "All" ? "All targets" : g} · {g === "All" ? ledgerAll.length : ledgerAll.filter(d => (d.targetGroup || "Watchlist") === g).length}</button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter ledger by status">
              <span className="text-[11px] font-bold uppercase tracking-wider mr-1" style={{ color: "var(--faint)" }}>Status</span>
              {["All", ...ledgerStatuses].map(s => (
                <button key={s} onClick={() => setLedgerStatus(s)} aria-label={`Filter by status: ${s}`} aria-pressed={ledgerStatus === s} className="rounded-full px-2.5 py-1 text-[11px] font-semibold border capitalize" style={ledgerStatus === s ? { background: "var(--surface-alt)", color: "var(--text)", borderColor: "var(--accent)" } : { borderColor: "var(--border)", color: "var(--dim)" }}>{s === "All" ? "Any status" : s.replace("_", " ")} · {s === "All" ? ledgerAll.length : ledgerAll.filter(d => d.status === s).length}</button>
              ))}
              {(ledgerScout !== "All" || ledgerMarket !== "All" || ledgerGroup !== "All" || ledgerStatus !== "All") && (
                <button onClick={() => { setLedgerScout("All"); setLedgerMarket("All"); setLedgerGroup("All"); setLedgerStatus("All"); }} aria-label="Clear ledger filters" className="rounded-full px-2.5 py-1 text-[11px] font-bold underline" style={{ color: "var(--accent-ink)" }}>Clear filters ✕</button>
              )}
            </div>
          </div>

          <p className="mt-3 text-xs" style={{ color: "var(--faint)" }}>Showing {ledgerFiltered.length} of {ledgerAll.length} kept findings{ledgerTier === "all" && ledgerGone.length > 0 ? " (expired hidden — open the Expired tab or the collapsed section below)" : ""}</p>

          {ledgerFiltered.length > 0 ? (
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {ledgerFiltered.map(d => {
                const scout = scoutById.get(d.scoutId);
                const isGone = d.status === "gone";
                const isBought = d.status === "bought";
                const isStale = d.status === "stale";
                const statusStyle: Record<string, { label: string; color: string; bg: string }> = {
                  new: { label: "● New — latest sweep", color: "var(--accent-ink)", bg: "var(--accent-dim)" },
                  live: { label: "● Live — re-verified", color: "var(--hold)", bg: "rgba(63,182,143,0.15)" },
                  price_dropped: { label: "↓ Price dropped", color: "var(--teal)", bg: "rgba(126,200,227,0.15)" },
                  stale: { label: "⚠ Stale — unverified", color: "var(--trim)", bg: "rgba(255,217,77,0.14)" },
                  gone: { label: "Gone — listing ended", color: "var(--faint)", bg: "var(--glass)" },
                  bought: { label: "✓ Bought — acquired via scouts", color: "var(--hold)", bg: "rgba(63,182,143,0.2)" },
                  sighting: { label: "Sighting — link unverified", color: "var(--faint)", bg: "var(--glass)" },
                };
                const st = statusStyle[d.status] ?? statusStyle.live!;
                const tierLabel = !d.listingUrl ? "Sighting" : isStale ? "Stale — not a live deal" : isLedgerPinned(d) ? "Tier 1 · Pinned" : "Tier 2 · Close";
                return (
                  <article key={`${d.source}-${d.id}`} id={`ledger-${d.source}-${d.id}`} className="rounded-2xl p-4 scroll-mt-24" style={{ background: "var(--glass)", border: isGone ? "1px dashed var(--border)" : "1px solid var(--hairline)", opacity: isGone ? 0.72 : 1 }}>
                    <div className="flex items-start gap-3">
                      <ScoutAvatar scout={scout} size={38} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-semibold leading-snug">{d.cardName}</p>
                          {d.gradeLabel && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--surface-alt)", color: "var(--accent-ink)" }}>{d.gradeLabel}</span>}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "var(--dim)" }}>{scout ? `${scout.emoji} ${scout.name}` : d.scoutId} · {d.marketplace}{d.seller ? ` · ${d.seller}` : ""}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ background: "var(--surface-alt)", color: "var(--dim)" }}>{tierLabel}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--surface-alt)", color: "var(--accent-ink)" }}>{d.targetGroup || "Watchlist"}</span>
                        </div>
                      </div>
                      {d.discountPct != null && d.discountPct >= 0 && !!d.listingUrl && <span className="shrink-0 font-display text-lg font-black" style={{ color: "var(--accent-text)" }}>−{d.discountPct.toFixed(0)}%</span>}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                      <span>Asking: <strong className="num">{fmt(d.askingUsd)}</strong></span>
                      {d.marketUsd != null && <span>Market / comp: <strong className="num">{fmt(d.marketUsd)}</strong></span>}
                      {d.pctOfMarket != null && <span className="num" style={{ color: "var(--dim)" }}>{d.pctOfMarket.toFixed(0)}% of market at find</span>}
                    </div>
                    {d.status === "price_dropped" && d.prevAskingUsd != null && (
                      <p className="mt-1.5 text-sm font-bold" style={{ color: "var(--teal)" }}>Price dropped: <span className="num" style={{ textDecoration: "line-through", color: "var(--dim)" }}>{fmt(d.prevAskingUsd)}</span> → <span className="num">{fmt(d.askingUsd)}</span> <span className="font-normal" style={{ color: "var(--dim)" }}>(−{fmt(d.prevAskingUsd - d.askingUsd)} on the same listing)</span></p>
                    )}
                    {isStale && <p className="mt-0.5 text-[11px] font-semibold leading-relaxed" style={{ color: "var(--trim)" }}>⚠ Stale — link not positively verified live{d.lastCheckAt ? ` · last check ${new Date(d.lastCheckAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : ""}{d.verifyMissStreak > 0 ? ` · ${d.verifyMissStreak} consecutive unverifiable check${d.verifyMissStreak === 1 ? "" : "s"}` : ""} · {fmtVerifiedLive(d.lastVerifiedLiveAt)}. Held out of the Ledger&apos;s live segments and pinned deals until a sweep positively re-verifies it — it may still appear in the Market Terminal labelled unverified; 72h without proof retires a deal finding to Gone.{d.endsAt ? ` Known end: ${new Date(d.endsAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.` : ""}</p>}
                    {isGone && <p className="mt-0.5 text-[11px] font-semibold" style={{ color: "var(--faint)" }}>Listing ended{d.endedAt ? ` · marked gone ${d.endedAt}` : ""}{d.endedReason ? ` · ${d.endedReason}` : ""}{d.lastVerifiedLiveAt ? ` · ${fmtVerifiedLive(d.lastVerifiedLiveAt)} before it ended` : ""}</p>}
                    {d.note && <p className="mt-1.5 text-xs leading-relaxed line-clamp-2" style={{ color: "var(--dim)" }}>{d.note}</p>}
                    {d.source === "deal" && rocketIntelByDeal.get(d.id) && <RocketIntelBlock points={rocketIntelByDeal.get(d.id)!.points} severity={rocketIntelByDeal.get(d.id)!.severity} />}
                    {d.source === "deal" && committeeByDeal.get(d.id) && <CommitteeCard rec={committeeByDeal.get(d.id)!} />}
                    <span className="flex flex-wrap items-center justify-end gap-2 mt-3">
                      {d.listingUrl && isGone && <span className="mr-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold" role="note" aria-label={`Listing ended for ${d.cardName} — link disabled`} style={{ background: "rgba(255,255,255,0.06)", color: "var(--faint)" }}>Listing ended — link disabled, not actionable</span>}
                      {!d.listingUrl && <span className="mr-auto text-xs font-semibold" style={{ color: "var(--faint)" }}>🔗 No link on file — sighting only, never counted as a find</span>}
                      {!isBought && !isGone && d.source === "deal" && (
                        <>
                          {isStale && <button onClick={() => findingStatusMut.mutate({ id: d.id, status: "live" })} aria-label={`Mark ${d.cardName} as live — verified manually`} className="rounded-full px-3.5 py-2 text-sm font-semibold border" style={{ borderColor: "var(--hold)", color: "var(--hold)", background: "var(--glass)" }}>Mark live — I verified it ✓</button>}
                          <button onClick={() => findingStatusMut.mutate({ id: d.id, status: "bought" })} aria-label={`Mark ${d.cardName} as bought in ledger`} className="rounded-full px-3.5 py-2 text-sm font-semibold border" style={{ borderColor: "var(--hold)", color: "var(--hold)", background: "rgba(0,0,0,0.3)" }}>Bought ✓</button>
                        </>
                      )}
                      {!isBought && !isGone && (
                        <button onClick={() => endFindingMut.mutate({ source: d.source, id: d.id })} aria-label={`Mark ${d.cardName} closed / ended — file as ended and never show again`} className="rounded-full px-3.5 py-2 text-sm font-semibold border" style={{ borderColor: "var(--border)", color: "var(--dim)", background: "rgba(0,0,0,0.3)" }}>Closed / Ended</button>
                      )}
                      {!isBought && <button onClick={() => d.source === "listing" ? passListingMut.mutate({ id: d.id }) : passDealMut.mutate({ id: d.id })} aria-label={`Pass on ${d.cardName} in ledger — remove forever`} className="rounded-full px-3.5 py-2 text-sm font-semibold border" style={{ borderColor: "var(--border)", color: "var(--dim)", background: "rgba(0,0,0,0.3)" }}>Pass — remove</button>}
                      {d.listingUrl && isStale && <a href={d.listingUrl} target="_blank" rel="noreferrer" aria-label={`Open stale listing for ${d.cardName} on ${d.marketplace} to check it manually`} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold border" style={{ borderColor: "var(--trim)", color: "var(--trim)" }}>Open listing — check it manually ↗</a>}
                      {d.listingUrl && !isGone && !isStale && <a href={d.listingUrl} target="_blank" rel="noreferrer" aria-label={`View listing for ${d.cardName} on ${d.marketplace}`} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold" style={{ background: "var(--accent)", color: "#1a0b36" }}>View listing on {d.marketplace.split("—")[0]?.trim() ?? d.marketplace} ↗</a>}
                    </span>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm rounded-xl px-4 py-3 leading-relaxed" style={{ background: "var(--glass)", color: "var(--dim)" }}>
              {ledgerAll.length === 0
                ? "The ledger is empty because no sweep has kept a qualifying finding yet — that's an honest zero, not a missing section. The guarantee still holds: when a sweep does keep something, it will appear here with its verbatim listing link, scout, marketplace, ask and % of market, and it will stay here. Sightings from dated research (unlinked) live in the Sightings tab."
                : "No findings match this segment + filters. Loosen a chip or switch tier tab — the counts on the tabs and chips show where the kept findings actually sit."}
            </p>
          )}

          {/* Acquired via scouts — small permanent record */}
          {ledgerBought.length > 0 && ledgerTier !== "acquired" && (
            <div className="mt-5 rounded-2xl p-4" style={{ background: "rgba(63,182,143,0.08)", border: "1px solid rgba(63,182,143,0.35)" }}>
              <p className="font-display font-bold text-sm">✓ Acquired via scouts <span className="font-normal" style={{ color: "var(--dim)" }}>— {ledgerBought.length} bought from scout findings</span></p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ledgerBought.map(d => (
                  <span key={d.id} className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--hairline)" }}>
                    {d.cardName} · <span className="num">{fmt(d.askingUsd)}</span> · {d.marketplace.split("—")[0]?.trim()}
                    {d.listingUrl && <a href={d.listingUrl} target="_blank" rel="noreferrer" aria-label={`View bought listing for ${d.cardName} on ${d.marketplace}`} className="underline font-bold" style={{ color: "var(--accent-ink)" }}>listing ↗</a>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Expired — collapsed by default, kept for the record */}
          {ledgerGone.length > 0 && ledgerTier !== "expired" && (
            <div className="mt-4 rounded-2xl" style={{ border: "1px dashed var(--border)", background: "var(--glass)" }}>
              <button onClick={() => setLedgerShowExpired(v => !v)} aria-expanded={ledgerShowExpired} aria-label="Toggle expired findings section" className="w-full flex items-center justify-between px-4 py-3 text-left">
                <span className="text-sm font-bold" style={{ color: "var(--dim)" }}>Expired / Gone — {ledgerGone.length} kept for the record, not actionable</span>
                <span aria-hidden style={{ color: "var(--dim)" }}>{ledgerShowExpired ? "▾ Hide" : "▸ Show"}</span>
              </button>
              {ledgerShowExpired && (
                <div className="px-4 pb-4 grid gap-2">
                  {ledgerGone.map(d => (
                    <p key={d.id} className="text-xs leading-relaxed rounded-lg px-3 py-2" style={{ background: "rgba(0,0,0,0.25)", color: "var(--faint)" }}>
                      <strong style={{ color: "var(--dim)" }}>{d.cardName}</strong> · was {fmt(d.askingUsd)} on {d.marketplace} · first found {d.firstFoundAt ?? d.foundAt} · last seen {d.lastSeenAt ?? d.foundAt} · by {scoutById.get(d.scoutId)?.name ?? d.scoutId} — <strong>Listing ended</strong>{d.endedAt ? ` (gone ${d.endedAt})` : ""}{d.endedReason ? `: ${d.endedReason}` : " / link dead"}. {d.lastVerifiedLiveAt ? `${fmtVerifiedLive(d.lastVerifiedLiveAt)} before it ended. ` : ""}Kept here so the hunt history stays honest — not actionable, no live link.
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ——— MARKET TERMINAL — every watchlist item + every owned card ——— */}
        <section id="v2-terminal" aria-label="Market Terminal — market value and live listings for every card" className="quiet-panel mt-8 p-5 sm:p-6 scroll-mt-24" style={vis(inGroup("deals", "market"))}>
          <p className="kicker" style={{ color: "var(--accent-ink)" }}>▦ Market Terminal</p>
          <h2 className="font-display text-2xl font-bold mt-1.5">Every card, priced against the live market</h2>
          <p className="text-sm mt-1 max-w-3xl leading-relaxed" style={{ color: "var(--dim)" }}>The slab / market-value approach, applied to <strong style={{ color: "var(--text)" }}>everything</strong>: every watchlist target and every owned card gets (a) its market value — our verified comp, with source and sales volume where known, (b) the live listings the 2-hourly sweeps captured for that exact card/grade, each priced as <strong style={{ color: "var(--text)" }}>% of market value</strong>, and (c) a <strong style={{ color: "var(--text)" }}>deal flag at ≤80% of market</strong>, which also flags the finding in the Findings Ledger. Listings are captured at <strong style={{ color: "var(--text)" }}>every price</strong> — at, under and over market — like a terminal census: a listing whose page check was blocked still shows here, labelled <strong style={{ color: "var(--text)" }}>never positively verified live</strong> in its row; only <strong style={{ color: "var(--text)" }}>pinned deals</strong> require positive live verification, and a listing positively shown to have ended leaves the Terminal in the same sweep. For owned cards the same row is sell-side intel: your card&apos;s value vs the competing listings. Cards with an owner-kept (locked) value use it as their market value here, labelled owner-kept; every other card&apos;s market value is its latest verified comp. Cards with fewer than 3 sales in the last 30 days — or no verified volume on file — are labelled <strong style={{ color: "var(--text)" }}>thin comps</strong> wherever their value shows.</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <label className="text-xs font-semibold" style={{ color: "var(--dim)" }}>Search cards
              <input aria-label="Search Market Terminal cards" value={termSearch} onChange={e => setTermSearch(e.target.value)} placeholder="Card name…" className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", color: "var(--text)" }} />
            </label>
            <label className="text-xs font-semibold" style={{ color: "var(--dim)" }}>List type
              <select aria-label="Filter terminal by owned or watchlist" value={termType} onChange={e => setTermType(e.target.value)} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", color: "var(--text)" }}>
                <option value="All">All cards</option><option value="owned">Owned collection</option><option value="watchlist">Watchlist</option>
              </select>
            </label>
            <label className="text-xs font-semibold" style={{ color: "var(--dim)" }}>Max % of market value: <span className="num" style={{ color: "var(--accent-ink)" }}>{termMaxPct}%</span>
              <input aria-label="Maximum percent of market value for listings" type="range" min={50} max={150} step={5} value={termMaxPct} onChange={e => setTermMaxPct(Number(e.target.value))} className="mt-2 w-full" />
            </label>
            <label className="text-xs font-semibold" style={{ color: "var(--dim)" }}>Max listing price ($)
              <input aria-label="Maximum listing price in dollars" inputMode="numeric" value={termMaxPrice} onChange={e => setTermMaxPrice(e.target.value)} placeholder="No cap" className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", color: "var(--text)" }} />
            </label>
            <label className="text-xs font-semibold" style={{ color: "var(--dim)" }}>Grade
              <select aria-label="Filter terminal by grade" value={termGrade} onChange={e => setTermGrade(e.target.value)} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", color: "var(--text)" }}>
                <option>All</option>{termGrades.map(g => <option key={g}>{g}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold" style={{ color: "var(--dim)" }}>Ships from
              <select aria-label="Filter terminal listings by ships-from country" value={termShips} onChange={e => setTermShips(e.target.value)} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", color: "var(--text)" }}>
                <option>All</option>{termShipsFrom.map(c => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>
          <label className="mt-3 inline-flex items-center gap-2 text-sm font-semibold cursor-pointer">
            <input type="checkbox" aria-label="Hide low volume cards with thin comps" checked={termHideLowVol} onChange={e => setTermHideLowVol(e.target.checked)} className="w-4 h-4" />
            Hide low volume — cards with fewer than 3 sales in 30 days (thin comps)
          </label>
          <p className="mt-2 text-xs" style={{ color: "var(--faint)" }}>Showing {terminalFiltered.length} of {data.terminal.length} cards · {liveListings.length} listings captured by sweeps (every priced listing for tracked cards, re-checked every sweep — listings positively shown ended are removed in the same sweep they end; unverified rows are labelled in place){data.sweeps[0] ? ` · last swept ${new Date(data.sweeps[0].sweptAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : ""}</p>

          <div className="mt-4 grid gap-3">
            {terminalFiltered.map((t: TerminalItem, tIdx: number) => {
              const ls = (listingsBySubject.get(t.subjectKey) ?? []).filter(l => (l.pctOfMarket == null || l.pctOfMarket <= termMaxPct) && (termShips === "All" || l.shipsFrom === termShips));
              const tScout = t.scoutId ? scoutById.get(t.scoutId) : undefined;
              return (
                <article key={t.subjectKey} className="zebra-card rounded-2xl p-4" style={{ background: tIdx % 2 === 1 ? "var(--row-zebra)" : "var(--glass)", border: "1px solid var(--hairline)" }}>
                  <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                    <div className="flex-1 min-w-[220px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold leading-snug">{t.name}</p>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--surface-alt)", color: "var(--accent-ink)" }}>{t.gradeLabel}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ background: "var(--surface-alt)", color: t.subjectType === "owned" ? "var(--hold)" : "var(--ask-text)" }}>{t.subjectType === "owned" ? "Owned — sell-side intel" : `Watchlist · ${t.kind}`}</span>
                        {t.thinComps && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ border: "1px dashed var(--trim)", color: "var(--trim)" }}>Thin comps</span>}
                        {t.subjectType === "owned" && <button onClick={() => openCardDetail(t.subjectKey.replace(/^owned-/, ""))} aria-label={`Open card detail page for ${t.name}`} className="text-[11px] font-bold px-2.5 py-1 rounded-full border" style={{ borderColor: "var(--accent)", color: "var(--accent-ink)" }}>Open card detail →</button>}
                      </div>
                      <p className="text-xs mt-1" style={{ color: "var(--faint)" }}>{tScout ? `Scout: ${tScout.emoji} ${tScout.name} · ` : ""}Last swept {t.lastSweptAt ? new Date(t.lastSweptAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "— (awaiting first 2-hourly sweep)"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--faint)" }}>Market value{t.thinComps ? " · thin comps" : ""}</p>
                      <p className="num text-xl font-bold">{fmt(t.marketUsd)}</p>
                      <p className="text-[11px] max-w-[300px]" style={{ color: "var(--dim)" }}>{t.marketSource}{t.salesVolume30d != null ? ` · ${t.salesVolume30d} verified sales in the 30d evidence window` : " · sales volume (30d) not on file"}</p>
                    </div>
                  </div>
                  {t.marketNote && <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "var(--dim)" }}>{t.marketNote}</p>}
                  {ls.length > 0 ? (
                    <div className="mt-3 grid gap-2">
                      {ls.map(l => (
                        <div key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl px-3 py-2 text-sm" style={{ background: "rgba(0,0,0,0.25)", border: l.isDeal ? "1px solid rgba(63,182,143,0.6)" : "1px solid var(--hairline)" }}>
                          <span>Asking <strong className="num">{fmt(l.askingUsd)}</strong></span>
                          {l.pctOfMarket != null && <span className="num font-bold" style={{ color: l.isDeal ? "var(--hold)" : l.pctOfMarket <= 100 ? "var(--accent-ink)" : "var(--sell)" }}>{l.pctOfMarket.toFixed(0)}% of market{l.discountPct != null ? (l.discountPct >= 0 ? ` · ${l.discountPct.toFixed(0)}% under` : ` · ${Math.abs(l.discountPct).toFixed(0)}% over`) : ""}</span>}
                          {l.isDeal && <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ background: "var(--hold)", color: "var(--ink-on-fill)" }}>⚑ Deal territory ≤80%</span>}
                          <span style={{ color: "var(--dim)" }}>{l.marketplace}{l.seller ? ` · ${l.seller}` : ""}{l.shipsFrom ? ` · ships from ${l.shipsFrom}` : " · ships-from unknown"}</span>
                          <span className="text-[11px] font-semibold" style={{ color: "var(--hold)" }}>{fmtVerifiedLive(l.lastVerifiedLiveAt)}</span>
                          {l.listingUrl && <a href={l.listingUrl} target="_blank" rel="noreferrer" aria-label={`View listing for ${t.name} on ${l.marketplace}`} className="font-bold underline" style={{ color: "var(--accent-ink)" }}>View listing on {l.marketplace} ↗</a>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2.5 text-xs rounded-lg px-3 py-2" style={{ background: "rgba(0,0,0,0.2)", color: "var(--faint)" }}>No live listings captured for this exact card/grade yet — the 2-hourly sweeps (newly listed first) populate this row; nothing is shown rather than a listing we cannot link.</p>
                  )}
                </article>
              );
            })}
            {terminalFiltered.length === 0 && <p className="text-sm rounded-xl px-4 py-3" style={{ background: "var(--glass)", color: "var(--dim)" }}>No cards match those terminal filters — loosen the % of market, price cap, or the low-volume toggle.</p>}
          </div>
        </section>

        {/* ——— GROWTH (Insights › Growth) — allocation + category
               momentum only. The isolated per-card chart panels (Ditto
               sales, Porygon-Z LV.X comps, Mega Gengar raw, Magikarp
               marker) were REMOVED from here (Oct 9): each now renders
               inside its own card's detail page, with the same
               series and honesty captions. ——— */}
        <section className="mt-12" style={vis(inGroup("insights", "growth"))} aria-label="Growth — value by era and category momentum">
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {/* Era allocation */}
            <div className="quiet-panel p-5">
              <p className="font-display font-bold text-lg">Value by era</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--dim)" }}>Computed live from the 45-card collection at official values · total {fmt(base)}</p>
              <div className="mt-3" style={{ height: 250 }} role="img" aria-label={`Bar chart of portfolio value by era. ${eraData.map(e => `${e.name}: ${fmt(e.value)}, ${e.count} cards, ${e.share} percent`).join(". ")}. The same figures are listed in text beneath the chart.`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eraData} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false} />
                    <XAxis dataKey="name" tick={chartTick} axisLine={{ stroke: "var(--border)" }} tickLine={false} interval={0} angle={-14} textAnchor="end" height={52} />
                    <YAxis domain={[0, "dataMax + 1500"]} tick={chartTick} axisLine={false} tickLine={false} tickFormatter={(v: number) => "$" + Math.round(v / 1000) + "k"} width={48} />
                    <Tooltip formatter={(v: any, _n: any, p: any) => [fmt(Number(v)) + ` · ${p?.payload?.count ?? 0} cards · ${p?.payload?.share ?? 0}% of portfolio`, "Era value"]} contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_TEXT} itemStyle={CHART_TOOLTIP_TEXT} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {eraData.map((e, i) => <Cell key={e.name} fill={i === 1 ? "var(--teal)" : "var(--accent)"} fillOpacity={e.value === 0 ? 0.25 : 0.9} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {eraData.map(e => <p key={e.name} className="text-xs" style={{ color: "var(--dim)" }}>{e.name} ({e.sub}): <strong className="num" style={{ color: "var(--text)" }}>{fmt(e.value)}</strong> · {e.count} cards · {e.share}%</p>)}
              </div>
            </div>

            {/* Watchlist momentum */}
            <div className="quiet-panel p-5">
              <p className="font-display font-bold text-lg">Watchlist category momentum</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--dim)" }}>30-day median move by category · tracker data, Sep 27, 2026</p>
              <div className="mt-3" style={{ height: 250 }} role="img" aria-label={`Bar chart of 30-day median price moves by category from the September 27 2026 tracker: ${MOMENTUM_SERIES.map(m => `${m.name} up ${m.move} percent`).join(", ")}. Category medians, not any single card's return.`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MOMENTUM_SERIES} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 8 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" horizontal={false} />
                    <XAxis type="number" domain={[0, 26]} tick={chartTick} axisLine={false} tickLine={false} tickFormatter={(v: number) => "+" + v + "%"} />
                    <YAxis type="category" dataKey="name" tick={{ ...chartTick, fontSize: 12 }} axisLine={false} tickLine={false} width={76} />
                    <Tooltip formatter={(v: any) => ["+" + Number(v).toFixed(1) + "% median (30d)", "Category move"]} contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_TEXT} itemStyle={CHART_TOOLTIP_TEXT} />
                    <Bar dataKey="move" radius={[0, 6, 6, 0]}>
                      {MOMENTUM_SERIES.map(m => <Cell key={m.name} fill="var(--teal)" fillOpacity={0.9} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--faint)" }}>Crystal and Gold Star led the Sep 27, 2026 tracker; LV.X moved +13.5% median over the same 30 days. Category medians, not any single card's return.</p>
            </div>
          </div>

          {/* ——— FORECAST TRACK RECORD (fc-v1) — the published
                 scoreboard for the Forecast Engine: live grades and
                 the labelled backtest, ALWAYS reported separately,
                 never blended, with coverage next to accuracy so
                 neither can be cherry-picked. Collapsible like the
                 Change log; collapsed summary carries the headline
                 numbers. ——— */}
          {data?.trackRecord && (() => {
            const tr = data.trackRecord;
            const cov = tr.coverage;
            const pctTxt = (v: number | null) => v == null ? "—" : v.toFixed(1) + "%";
            const tableFor = (rec: typeof tr.live, caption: string) => (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                  <caption className="text-left text-xs font-bold pb-1.5" style={{ color: "var(--dim)" }}>{caption}</caption>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--hairline)" }}>
                      <th scope="col" className="text-left py-1.5 pr-3 font-semibold" style={{ color: "var(--dim)" }}>Breakdown</th>
                      <th scope="col" className="text-right py-1.5 px-3 font-semibold" style={{ color: "var(--dim)" }}>Issued</th>
                      <th scope="col" className="text-right py-1.5 px-3 font-semibold" style={{ color: "var(--dim)" }}>Graded</th>
                      <th scope="col" className="text-right py-1.5 pl-3 font-semibold" style={{ color: "var(--dim)" }}>In range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...rec.byHorizon.map(b => ({ label: `${b.horizonDays}-day horizon`, issued: b.issued, graded: b.graded, inRangePct: b.inRangePct })), ...rec.byConfidence.map(b => ({ label: `Confidence ${b.confidence}`, issued: b.issued, graded: b.graded, inRangePct: b.inRangePct }))].map(r => (
                      <tr key={r.label} style={{ borderBottom: "1px solid var(--hairline)" }}>
                        <th scope="row" className="text-left py-1.5 pr-3 font-medium">{r.label}</th>
                        <td className="num text-right py-1.5 px-3">{r.issued}</td>
                        <td className="num text-right py-1.5 px-3">{r.graded}</td>
                        <td className="num text-right py-1.5 pl-3 font-semibold">{pctTxt(r.inRangePct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
            return (
              <details className="quiet-panel mt-4 p-5">
                <summary aria-label="Forecast track record — live and backtest results, coverage (sample data — demo)" className="cursor-pointer font-display font-bold text-lg" style={{ minHeight: 44 }}>
                  📈 Forecast track record <span className="ml-1 align-middle text-[11px] font-black px-2 py-1 rounded-full tracking-wider" style={{ border: "1px solid var(--accent)", color: "var(--accent-ink)" }}>SAMPLE DATA</span>
                  <span className="block sm:inline text-xs font-sans font-semibold sm:ml-3 mt-1 sm:mt-0" style={{ color: "var(--dim)", fontFamily: "inherit" }}>
                    {cov.cardsForecast} of {cov.totalCards} cards forecast · {cov.pumpSuspended} pump-suspended · backtest {tr.backtest.graded} graded{tr.backtest.inRangePct != null ? `, ${pctTxt(tr.backtest.inRangePct)} in range` : ""}
                  </span>
                </summary>
                <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--dim)" }}>
                  Coverage: <strong style={{ color: "var(--text)" }}>{cov.cardsForecast} of {cov.totalCards} cards</strong> carry a live forecast · <strong style={{ color: "var(--text)" }}>{cov.cardsEligible}</strong> meet the evidence bar (≥3 verified sales in 180 days, latest within 90) · <strong style={{ color: "var(--text)" }}>{cov.pumpSuspended}</strong> pump-suspended · <strong style={{ color: "var(--text)" }}>{cov.insufficient}</strong> insufficient signal. Mean range width — live {pctTxt(tr.live.meanRangeWidthPct)} · backtest {pctTxt(tr.backtest.meanRangeWidthPct)} (width is the honest price of accuracy: wider ranges grade better, so width is published beside the hit rate).
                </p>
                <div className="mt-4 grid gap-5 xl:grid-cols-2">
                  <div>
                    <p className="font-display font-bold">Live record</p>
                    {tr.live.issued === 0 ? (
                      <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "var(--dim)" }}>No live forecasts issued yet — they issue on the daily refresh for every card with enough verified sales. First live grades land ~30 days after the first forecasts.</p>
                    ) : tr.live.graded === 0 ? (
                      <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "var(--dim)" }}>{tr.live.issued} live forecast{tr.live.issued === 1 ? "" : "s"} issued, none graded yet. First live grades land ~30 days after the first forecasts.</p>
                    ) : (
                      <>
                        <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "var(--dim)" }}><strong className="num" style={{ color: "var(--text)" }}>{pctTxt(tr.live.inRangePct)}</strong> of {tr.live.graded} graded live forecasts landed in range ({tr.live.issued} issued).</p>
                        {tableFor(tr.live, "Live forecasts by horizon and confidence grade")}
                      </>
                    )}
                  </div>
                  <div>
                    <p className="font-display font-bold">Backtest record <span className="text-[10px] font-sans font-black px-2 py-0.5 rounded-full align-middle" style={{ border: "1px solid var(--accent)", color: "var(--accent-ink)" }}>REPLAYED HISTORY — NEVER BLENDED WITH LIVE</span></p>
                    {tr.backtest.issued === 0 ? (
                      <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "var(--dim)" }}>No backtest yet — it seeds on the first forecast pass, for cards with at least 6 dated verified sales, forecasting at past dates using only the sales known then.</p>
                    ) : (
                      <>
                        <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "var(--dim)" }}><strong className="num" style={{ color: "var(--text)" }}>{pctTxt(tr.backtest.inRangePct)}</strong> of {tr.backtest.graded} graded backtest forecasts landed in range (n = {tr.backtest.graded} graded of {tr.backtest.issued} issued).</p>
                        {tableFor(tr.backtest, "Backtest forecasts by horizon and confidence grade")}
                      </>
                    )}
                  </div>
                </div>
                {tr.live.superseded > 0 && (
                  <p className="text-xs mt-3" style={{ color: "var(--faint)" }}>{tr.live.superseded} forecast{tr.live.superseded === 1 ? "" : "s"} superseded Oct 13, 2026 — basis corrected (owner-kept value filings were excluded from the forecast evidence base). Superseded forecasts count as neither hits nor misses and appear in no statistic above.</p>
                )}
                <p className="text-xs mt-4" style={{ color: "var(--faint)" }}>Every forecast is logged at issuance from verified sold comps only and graded at its horizon against the card&apos;s verified-comp value. Ranges from verified sales only — scenarios, not predictions.</p>
              </details>
            );
          })()}
        </section>

        {/* ——— WATCHLIST ——— */}
        <section id="v2-watchlist" className="mt-12 scroll-mt-24" style={vis(inGroup("vault", "watch"))}>
          <div className="quiet-panel px-5 py-4">
            <p className="kicker" style={{ color: "var(--accent-ink)" }}>The hunt</p>
          <h2 className="font-display text-3xl font-bold mt-1.5">Acquisition watchlist</h2>
          <p className="text-sm mt-1.5 max-w-3xl leading-relaxed" style={{ color: "var(--dim)" }}>Your rule: <strong style={{ color: "var(--text)" }}>never buy the top of the market.</strong> Lagging, second-tier and quiet-accumulation plays from the Oct 8, 2026 research — each price carries its own check date and source type, and each target has an assigned scout. Hit <strong style={{ color: "var(--text)" }}>Pass</strong> on anything you don&apos;t want and it leaves the page for good — refreshes never bring a passed suggestion back.</p>
          </div>
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {watchItems.map((w, i) => {
              const scout = w.scoutId ? scoutById.get(w.scoutId) : undefined;
              return (
                <div key={w.id} className={`quiet-panel p-4${i % 2 === 1 ? " quiet-alt" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold leading-snug"><span className="num mr-1.5" style={{ color: "var(--accent-ink)" }}>{i + 1}.</span>{w.name}</p>
                    <select aria-label={`Status for ${w.name}`} value={w.status} onChange={e => updateWatch.mutate({ id: w.id, status: e.target.value })} className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold" style={{ border: "1px solid var(--border)", background: "var(--surface-alt)", color: "var(--text)" }}>
                      <option>Watching</option><option>Bought</option><option>Pass</option>
                    </select>
<button onClick={() => updateWatch.mutate({ id: w.id, status: "Pass" })} aria-label={`Pass on ${w.name} — remove from page`} className="shrink-0 rounded-full px-3 py-1 text-xs font-bold border" style={{ borderColor: "var(--sell)", color: "var(--sell)", background: "rgba(200,64,42,0.08)" }}>Pass ✕</button>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold" style={{ color: "var(--accent-ink)" }}>{w.priceContext}</p>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--dim)" }}>{w.thesis}</p>
                  <p className="mt-2 text-sm leading-relaxed"><strong>Rule:</strong> {w.actionRule}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {scout && <span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1" style={{ background: "var(--glass)", border: "1px solid var(--hairline)" }}><span aria-hidden>{scout.emoji}</span> Scout: {scout.name} · {scout.territory}</span>}
                    {w.lastChecked && <span className="text-[11px]" style={{ color: "var(--faint)" }}>Price checked {w.lastChecked}{w.status !== "Watching" ? ` · Status: ${w.status}` : ""}</span>}
                  </div>
                  {(() => { const link = watchSearchLink(w, scout); return (
                    <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <a href={link.url} target="_blank" rel="noreferrer" aria-label={`${link.label} — ${w.name}`} className="text-xs font-bold underline" style={{ color: "var(--accent-ink)" }}>{link.label}</a>
                      <span className="text-[11px]" style={{ color: "var(--faint)" }}>Live {link.marketplace} search page — current asks, not sold comps. Verify against comps before buying.</span>
                    </p>
                  ); })()}
                  {(() => { const link = watchSearchLink(w, scout); return (
                    <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <a href={link.url} target="_blank" rel="noreferrer" aria-label={`${link.label} — ${w.name}`} className="text-xs font-bold underline" style={{ color: "var(--accent-ink)" }}>{link.label}</a>
                      <span className="text-[11px]" style={{ color: "var(--faint)" }}>Live {link.marketplace} search page — current asks, not sold comps. Verify against comps before buying.</span>
                    </p>
                  ); })()}
                </div>
              );
            })}
            {watchItems.length === 0 && <p className="text-sm" style={{ color: "var(--dim)" }}>Watchlist loading…</p>}
          </div>

          {vintageItems.length > 0 && (
            <>
              <div className="quiet-panel px-5 py-4 mt-10">
                <h3 className="font-display text-2xl font-bold mt-0">Mid-era & vintage — the other half of the hunt</h3>
              <p className="text-sm mt-1 max-w-3xl" style={{ color: "var(--dim)" }}>EX, Diamond & Pearl, HGSS, XY and Sun & Moon — plus WOTC-adjacent vintage. Same rule, older cards: buy the rung below the headline print.</p>
              </div>
              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {vintageItems.map((w, i) => {
                  const scout = w.scoutId ? scoutById.get(w.scoutId) : undefined;
                  return (
                    <div key={w.id} className={`quiet-panel p-4${i % 2 === 1 ? " quiet-alt" : ""}`}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold leading-snug"><span className="num mr-1.5" style={{ color: "var(--accent-ink)" }}>{i + 1}.</span>{w.name}</p>
                        <select aria-label={`Status for ${w.name}`} value={w.status} onChange={e => updateWatch.mutate({ id: w.id, status: e.target.value })} className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold" style={{ border: "1px solid var(--border)", background: "var(--surface-alt)", color: "var(--text)" }}>
                          <option>Watching</option><option>Bought</option><option>Pass</option>
                        </select>
<button onClick={() => updateWatch.mutate({ id: w.id, status: "Pass" })} aria-label={`Pass on ${w.name} — remove from page`} className="shrink-0 rounded-full px-3 py-1 text-xs font-bold border" style={{ borderColor: "var(--sell)", color: "var(--sell)", background: "rgba(200,64,42,0.08)" }}>Pass ✕</button>
                      </div>
                      <p className="mt-1.5 text-sm font-semibold" style={{ color: "var(--accent-ink)" }}>{w.priceContext}</p>
                      <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--dim)" }}>{w.thesis}</p>
                      <p className="mt-2 text-sm leading-relaxed"><strong>Rule:</strong> {w.actionRule}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {scout && <span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1" style={{ background: "var(--glass)", border: "1px solid var(--hairline)" }}><span aria-hidden>{scout.emoji}</span> Scout: {scout.name} · {scout.territory}</span>}
                        {w.lastChecked && <span className="text-[11px]" style={{ color: "var(--faint)" }}>Price checked {w.lastChecked}{w.status !== "Watching" ? ` · Status: ${w.status}` : ""}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {wcItems.length > 0 && (
            <>
              <div className="quiet-panel px-5 py-4 mt-10">
                <p className="kicker" style={{ color: "var(--accent-ink)" }}>Silver border · EX era · 2005–2008 decks</p>
                <h3 className="font-display text-2xl font-bold mt-1">Silver-Border World Championship Decks (EX era)</h3>
                <p className="text-sm mt-1.5 max-w-3xl leading-relaxed" style={{ color: "var(--dim)" }}>These are the World Championship deck reprints: <strong style={{ color: "var(--text)" }}>silver border, the champion&apos;s signature on the card, a special WC back — not tournament legal.</strong> PSA 10 copies are repricing hard — Mew Gold Star PSA 10 set a $1,800 record in 2024, then a <strong style={{ color: "var(--text)" }}>$20,400 Fanatics Collect record in 2026</strong>, with a 2026 sales ladder of $6,100 (Apr) rising to $24,400–$29,280 (Sep). But <strong style={{ color: "var(--text)" }}>raw copies still lag</strong> — so every target here is a near-mint <strong style={{ color: "var(--text)" }}>raw grading candidate</strong>, never a graded 10. Graded 10s are already the top of the market. Prices are TCGplayer-tracked WC deck values, checked Oct 8, 2026, and re-verified on every refresh. Hunted by <strong style={{ color: "var(--text)" }}>Pikachu</strong> (TCGplayer / raw) and <strong style={{ color: "var(--text)" }}>Gengar</strong> (eBay).</p>
              </div>
              <div className="mt-4 rounded-2xl p-4 border-2 border-dashed" style={{ borderColor: "var(--sell)", background: "rgba(200,64,42,0.07)" }} role="note" aria-label="Silver-border WC category warning">
                <p className="text-sm leading-relaxed"><strong style={{ color: "var(--sell)" }}>⚠ Thin-market warning:</strong> WC deck cards were bulk for two decades and liquidity is thin — and one anomalous <strong>$50,100 Jul 2026 PSA 10 print</strong> sits amid $11k–$15k sales for the same tier. That print is an outlier, not a comp. Buy <strong>only on multiple confirmed paid sales</strong>, top species only, and verify silver border, signature and WC back on every copy.</p>
              </div>
              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {wcItems.map((w, i) => renderHuntCard(w, i))}
              </div>
            </>
          )}

          {vendingItems.length > 0 && (
            <>
              <div className="quiet-panel px-5 py-4 mt-10">
                <p className="kicker" style={{ color: "var(--accent-ink)" }}>Japan only · 1998–99 · Eevee&apos;s standing hunt</p>
                <h3 className="font-display text-2xl font-bold mt-1">Japanese Vending Series (1998–99)</h3>
                <p className="text-sm mt-1.5 max-w-3xl leading-relaxed" style={{ color: "var(--dim)" }}>The 1998–1999 Japanese vending / expansion sheet series (Series 1–3): glossy cards peeled by hand from vending-machine sheets. <strong style={{ color: "var(--text)" }}>Eevee</strong> has a standing hunt across <strong style={{ color: "var(--text)" }}>Yahoo Japan, Mercari and eBay JP sellers</strong> for unpeeled sheets and clean singles of the notable cards. This is a thin Japanese-market niche where <strong style={{ color: "var(--text)" }}>condition drives value</strong> — peel marks, curl and gloss wear are the difference between grades — so comps must come from <strong style={{ color: "var(--text)" }}>Japanese sources, labelled as such</strong>. No prices have been invented for this group: every target reads <strong style={{ color: "var(--text)" }}>“Price research on first refresh”</strong>, and the first refresh / sweep cycle establishes real comps from confirmed Japanese sales before any max-buy is shown.</p>
              </div>
              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {vendingItems.map((w, i) => renderHuntCard(w, i))}
              </div>
            </>
          )}

          {warningItems.map(w => (
            <div key={w.id} className="mt-5 rounded-2xl p-4 sm:p-5" style={{ background: "var(--red)", color: "#fff" }}>
              <h3 className="font-display text-xl font-bold">{w.name}</h3>
              <p className="mt-1.5 text-sm font-semibold">{w.priceContext}</p>
              <p className="mt-1 text-sm leading-relaxed opacity-90">{w.thesis}</p>
              <p className="mt-2 text-sm leading-relaxed"><strong>Rule:</strong> {w.actionRule}</p>
            </div>
          ))}

          <div className="mt-5 rounded-2xl border-2 p-4 sm:p-5" style={{ borderColor: "var(--red)", background: "var(--surface)" }}>
            <h3 className="font-display text-xl font-bold" style={{ color: "var(--sell)" }}>⛔ Do not buy — these ARE the top</h3>
            <div className="mt-3 space-y-3">
              {avoidItems.map(w => (
                <div key={w.id} className="pt-3 first:pt-0" style={{ borderTop: "1px solid var(--hairline)" }}>
                  <p className="font-semibold">{w.name}</p>
                  <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--sell)" }}>{w.priceContext}</p>
                  <p className="text-sm leading-relaxed mt-0.5" style={{ color: "var(--dim)" }}>{w.thesis} <strong style={{ color: "var(--text)" }}>{w.actionRule}</strong></p>
                  {(() => { const link = watchSearchLink(w); return <p className="mt-1.5"><a href={link.url} target="_blank" rel="noreferrer" aria-label={`See current eBay asks for ${w.name}`} className="text-xs font-bold underline" style={{ color: "var(--dim)" }}>See current asks on eBay ↗</a> <span className="text-[11px]" style={{ color: "var(--faint)" }}>— live search, to confirm it&apos;s still the top. Not a buy link.</span></p>; })()}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ——— PROJECTIONS ——— */}
        <section className="mt-12" style={vis(inGroup("vault", "collection"))}>
          <div className="quiet-panel px-5 py-4">
            <p className="kicker" style={{ color: "var(--accent-ink)" }}>Scenarios</p>
          <h2 className="font-display text-3xl font-bold mt-1.5">Projections — scenarios, not predictions</h2>
          <p className="text-sm mt-1.5 max-w-3xl" style={{ color: "var(--dim)" }}>Ranges built from the ${base.toLocaleString()} official base. Pokemon prices move on sold listings, pop growth and hype cycles — treat these as planning scenarios.</p>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {scenarios.map(s => (
              <div key={s.label} className="quiet-panel p-4">
                <p className="font-display font-bold">{s.label}</p>
                <p className="text-xs mt-0.5 leading-snug" style={{ color: "var(--dim)" }}>{s.desc}</p>
                <div className="mt-3 space-y-2">
                  {s.rows.map(r => (
                    <div key={r.h} className="flex justify-between text-sm pt-2" style={{ borderTop: "1px solid var(--hairline)" }}><span style={{ color: "var(--dim)" }}>{r.h}</span><span className="font-semibold num">{fmt(Math.round(base * r.mult))} <span className="font-normal" style={{ color: "var(--dim)" }}>({r.mult >= 1 ? "+" : ""}{Math.round((r.mult - 1) * 100)}%)</span></span></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 quiet-panel p-4">
            <p className="kicker" style={{ color: "var(--faint)" }}>24-month scenario spread</p>
            <div className="mt-3 space-y-2">
              {scenarios.map(s => { const v = base * (s.rows[2]?.mult ?? 1); const w = Math.min(100, (v / (base * 1.6)) * 100); return (
                <div key={s.label} className="flex items-center gap-3 text-sm"><span className="w-28 shrink-0">{s.label}</span><div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "var(--surface-alt)" }}><div className="h-full rounded-full" style={{ width: w + "%", background: "var(--accent)" }} /></div><span className="font-semibold num w-20 text-right">{fmt(Math.round(v))}</span></div>
              ); })}
            </div>
          </div>
        </section>

        {/* ——— COLLECTION ——— */}
        <section id="v2-collection" className="mt-12 scroll-mt-24" style={vis(inGroup("vault", "collection"))}>
          <div className="quiet-panel px-5 py-4 inline-block">
            <p className="kicker" style={{ color: "var(--accent-ink)" }}>The vault</p>
          <h2 className="font-display text-3xl font-bold mt-1.5">Full collection — {filtered.length} shown</h2>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <input aria-label="Search cards" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, set, cert…" className="flex-1 min-w-[180px] rounded-full px-4 py-2 text-sm outline-none" style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }} />
            <select aria-label="Filter by grader" value={graderFilter} onChange={e => setGraderFilter(e.target.value)} className="rounded-full px-3 py-2 text-sm" style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}><option>All</option><option>PSA</option><option>CGC</option></select>
            <select aria-label="Filter by era" value={eraFilter} onChange={e => setEraFilter(e.target.value)} className="rounded-full px-3 py-2 text-sm" style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}><option>All</option><option>Vintage</option><option>Modern</option></select>
            <select aria-label="Filter by advisor call" value={callFilter} onChange={e => setCallFilter(e.target.value)} className="rounded-full px-3 py-2 text-sm" style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}><option>All</option><option>HOLD</option><option>SELL</option><option>TRIM</option></select>
            <select aria-label="Sort cards" value={sortKey} onChange={e => setSortKey(e.target.value as "value" | "year" | "grade" | "name")} className="rounded-full px-3 py-2 text-sm" style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}><option value="value">Sort: Value ↓</option><option value="year">Sort: Year ↓</option><option value="grade">Sort: Grade ↓</option><option value="name">Sort: Name A–Z</option></select>
          </div>

          <div className="mt-3 quiet-panel overflow-hidden">
            {filtered.map((c, idx) => (
              <button key={c.cert} onClick={() => openCardDetail(c.cert)} aria-label={`Open detail page for ${c.name} — ${c.grader} ${c.grade}, cert ${c.cert}`} className="zebra-row w-full text-left px-4 py-3 flex items-center gap-3 slab-hover" style={{ borderTop: idx === 0 ? "none" : "1px solid var(--hairline)", background: idx % 2 === 1 ? "var(--row-zebra)" : "transparent" }}>
                {c.imageUrl && <img src={c.imageUrl} alt="" loading="lazy" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} className="shrink-0 rounded" style={{ width: 30, height: 41, objectFit: "cover", border: "1px solid var(--hairline)" }} />}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{c.name} <span className="font-normal" style={{ color: "var(--dim)" }}>#{c.number}</span>
                    {(salesByCert.get(c.cert) ?? []).some(s => !s.verified) && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full" style={{ background: "var(--red)", color: "var(--ink-on-fill)" }}>UNVERIFIED SIGNAL</span>}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--dim)" }}>{c.year} · {c.setName} · Cert {c.cert}</p>
                </div>
                <span className="hidden sm:block text-[11px] font-bold px-2 py-1 rounded-full" style={{ background: "var(--surface-alt)" }}>{c.grader} {c.grade}</span>
                <span title={c.advisorCall} className="shrink-0 max-w-[128px] sm:max-w-[180px] truncate text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: callColor(c.advisorCall), color: "var(--ink-on-fill)" }}>{c.advisorCall}</span>
                <span className="hidden md:flex items-center gap-2 shrink-0"><Sparkline values={(salesByCert.get(c.cert) ?? []).filter(s => s.verified).map(s => s.price)} width={52} height={16} /><DeltaChip value={cardChange30(c.cert)} /></span>
                <span className="num font-bold w-20 text-right">{fmt(c.effectiveUsd)}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-sm py-8 text-center" style={{ color: "var(--dim)" }}>No cards match those filters.</p>}
          </div>
        </section>

        {/* ——— SOURCES & DATA QUALITY ——— */}
        <section className="mt-12" style={vis(inGroup("vault", "collection"))}>
          <div className="quiet-panel px-5 py-4 inline-block">
            <p className="kicker" style={{ color: "var(--accent-ink)" }}>Provenance</p>
            <h2 className="font-display text-3xl font-bold mt-1.5">Sources & data quality</h2>
          </div>
          <div className="mt-4 quiet-panel p-4" style={{ borderColor: "rgba(217,164,65,0.4)" }}>
            <p className="text-sm leading-relaxed"><strong>The rule:</strong> every price on this desk shows its source type — <strong>verified sold comp</strong>, <strong>active listing / ask</strong>, <strong>aggregator value</strong>, <strong>cert verification</strong>, or <strong>seller-reported / unverified</strong>. Aggregator or single-source prints never override verified sold comps or owner-kept values.</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.sources.map(s => {
              const c = registryTypeColor(s.sourceType);
              const notServed = s.trustLevel === "Not served" || s.sourceType === "Not served";
              const caution = s.trustLevel === "Caution" || s.trustLevel === "Unverified" || notServed;
              return (
                <article key={s.id} className="quiet-panel p-4" style={caution ? { borderColor: "rgba(224,90,58,0.5)", ...(notServed ? { opacity: 0.75 } : {}) } : undefined}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{s.name}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide" style={{ color: c, border: `1px solid ${c}` }}>{notServed ? "not served — links broken (removed Oct 9, 2026)" : s.sourceType}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide" style={{ background: "var(--surface-alt)", color: "var(--dim)" }}>{s.trustLevel}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--dim)" }}>{s.coverage}</p>
                  <p className="mt-2 text-sm leading-relaxed" style={caution ? { color: "var(--sell)" } : { color: "var(--text)" }}>
                    {s.trustLevel === "Caution" && <strong>USE WITH CAUTION — </strong>}
                    {s.trustLevel === "Unverified" && <strong>UNVERIFIED — </strong>}
                    {notServed && <strong>NOT SERVED — </strong>}
                    {s.caveat.replace(/^USE WITH CAUTION: /, "").replace(/^not served — links broken \(removed Oct 9, 2026\)\. /, "")}
                  </p>
                </article>
              );
            })}
          </div>

          <div className="mt-4 quiet-panel p-5">
            <h3 className="font-display text-xl font-bold">Verify next refresh</h3>
            <div className="mt-3 grid gap-4 lg:grid-cols-2 text-sm leading-relaxed">
              <div>
                {(() => {
                  const unpriced = (data?.cards ?? []).filter(c => c.status === "active" && c.effectiveUsd == null);
                  return (<>
                    <p className="font-bold">{unpriced.length} card{unpriced.length === 1 ? "" : "s"} with no price yet</p>
                    {unpriced.length > 0 ? (
                      <ul className="mt-1.5 space-y-1 list-disc pl-5" style={{ color: "var(--dim)" }}>
                        {unpriced.map(c => <li key={c.cert}>{c.name} — {c.setName} #{c.number}, {c.grader} {c.grade} (cert {c.cert})</li>)}
                      </ul>
                    ) : <p className="mt-1.5" style={{ color: "var(--dim)" }}>Every active card is priced.</p>}
                    <p className="mt-2" style={{ color: "var(--dim)" }}>Unpriced cards are excluded from the portfolio total until a checked value lands.</p>
                  </>);
                })()}
              </div>
              <div>
                <p className="font-bold">Unverified estimates &amp; signals on file</p>
                <ul className="mt-1.5 space-y-1 list-disc pl-5" style={{ color: "var(--dim)" }}>
                  {(data?.cards ?? []).filter(c => c.status === "active" && c.checkedUsd == null && c.vaultUsd != null).map(c => (
                    <li key={c.cert}>{c.name} #{c.number} {c.grader} {c.grade} — {fmt(c.vaultUsd)} vault estimate (cert {c.cert})</li>
                  ))}
                  {(data?.sales ?? []).filter(s => !s.verified).map(s => (
                    <li key={s.id}><span style={{ color: "var(--sell)" }}><strong>UNVERIFIED:</strong> {((data?.cards ?? []).find(x => x.cert === s.cardCert)?.name ?? s.cardCert)} sale reported at {fmt(s.price)} ({s.saleDate}, {s.source}) — signal only, excluded from comps and totals.</span></li>
                  ))}
                </ul>
                <p className="mt-2" style={{ color: "var(--dim)" }}>Owner-kept prices are official by the owner&apos;s confirmation and are not in this verify list — only their sales context updates.</p>
              </div>
            </div>
            {/* Change log — collapsible, SAME pattern as the Sweep log:
                ALWAYS collapsed on load (the owner, Oct 9 — no localStorage
                memory for this log), header shows the latest change's
                headline. Expanding lists every refresh/change entry on
                file (newest first). */}
            <div className="mt-4 rounded-2xl px-4 py-2" style={{ background: "var(--glass)", border: "1px solid var(--hairline)" }}>
              <button onClick={() => setChangeLogOpen(v => !v)} aria-expanded={changeLogOpen} aria-label={changeLogOpen ? "Collapse change log" : "Expand change log"} className="w-full flex items-center gap-3 text-left py-2.5 min-h-[48px]">
                <span className="font-display font-bold shrink-0">📝 Change log</span>
                <span className="flex-1 min-w-0 truncate text-xs" style={{ color: "var(--dim)" }}>
                  {data.logs[0]
                    ? `Latest ${new Date(data.logs[0].ranAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} — ${data.logs[0].summary}`
                    : "No changes logged yet"}
                </span>
                <span aria-hidden className="shrink-0 text-xs font-bold rounded-full px-2.5 py-1 border" style={{ borderColor: "var(--border)", color: "var(--accent-ink)" }}>{changeLogOpen ? "▾ Hide" : "▸ Show"}</span>
              </button>
              {changeLogOpen && (
                data.logs.length > 0 ? (
                  <div className="mb-2 grid gap-2">
                    {data.logs.map(l => (
                      <div key={l.id} className="rounded-xl px-3.5 py-2.5" style={{ background: "rgba(0,0,0,0.22)", borderTop: "1px solid var(--hairline)" }}>
                        <p className="text-xs font-bold num" style={{ color: "var(--accent-ink)" }}>{new Date(l.ranAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })} <span className="font-normal" style={{ color: "var(--faint)" }}>· {l.cardsChecked} cards checked</span></p>
                        <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--dim)" }}>{l.summary}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 mb-2 text-sm" style={{ color: "var(--dim)" }}>No refresh or change entries on file yet — the daily refresh writes the first one.</p>
                )
              )}
            </div>
          </div>
        </section>

        {/* ——— COLLECTION HISTORY / PREVIOUSLY OWNED ——— */}
        {sold.length > 0 && (
          <section className="mt-10" aria-label="Collection history — previously owned" style={vis(inGroup("vault", "collection"))}>
            <h2 className="quiet-panel font-display text-xl font-bold inline-block px-4 py-2">Collection history — previously owned</h2>
            <p className="quiet-panel mt-2 px-4 py-2.5 text-xs leading-relaxed max-w-3xl" style={{ color: "var(--dim)" }}>Trade log: previously-owned cards, with trade terms recorded on each entry. Provenance only — previously-owned cards do not count in the active collection or the portfolio total.</p>
            {sold.map(c => c.status === "traded" ? (
              <div key={c.cert} className="mt-2 quiet-panel px-4 py-3.5 text-sm">
                <div className="flex flex-wrap justify-between gap-3">
                  <span><strong>{c.name} #{c.number}</strong> <span style={{ color: "var(--dim)" }}>· {c.setName} · {c.grader} {c.grade}</span></span>
                  <span className="font-semibold shrink-0" style={{ color: "var(--accent-ink)" }}>{c.advisorReason ?? "Traded away"}</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "var(--dim)" }}>{c.notes}</p>
              </div>
            ) : (
              <div key={c.cert} className="mt-2 quiet-panel px-4 py-3 flex justify-between gap-3 text-sm">
                <span><strong>{c.name}</strong> <span style={{ color: "var(--dim)" }}>· {c.setName} #{c.number} · {c.grader} {c.grade}</span></span>
                <span className="font-semibold shrink-0 num">Sold {c.soldDate} · {fmt(c.soldPrice)}</span>
              </div>
            ))}
          </section>
        )}

        {/* The standalone methodology/disclaimer paragraph that used
            to sit here was REMOVED (design pass, Oct 13, remedy #10):
            its substance lives in Sources & Data Quality above and in
            the per-number source labels — it is not repeated on Home. */}
        </div>
        <div className="mobile-tab-spacer" aria-hidden />
      </main>
      {/* ——— SHOW MODE — MOBILE ONLY floating camera button (Oct 9
             redesign): fixed at the BOTTOM RIGHT corner, above the
             sticky footer, safe-area aware, 56px (≥44px target),
             always visible while browsing on mobile widths. It is
             the ONLY Show Mode entry point — there is no Show Mode
             button in the desktop top bar, and the mobile header is
             gone entirely. The green dot marks it as live/always
             available; it is decorative — the button's aria-label
             names the action. Hidden on desktop via CSS. ——— */}
      <button onClick={openShowMode} aria-current={showOpen ? "page" : undefined} aria-label="Open Show Mode — scan a slab with your camera" className="show-mode-fab" style={showOpen ? { borderColor: "var(--text)" } : undefined}>
        <span aria-hidden className="show-mode-fab-dot" />
        <span aria-hidden className="text-[26px] leading-none">📷</span>
      </button>
      {/* GLASS VAULT mobile chrome: the footer is a DETACHED floating
          glass capsule (five equal-width slots, the selected pill is a
          hot-pink fill with midnight ink), floating over the town
          band's top edge on Home. A tiny scout sprite perches on the
          capsule's top edge — personality living on the chrome. The
          Show Mode camera FAB above is the capsule's glass sibling:
          same vapor-glass material, diameter ≈ capsule height,
          floating separately beside it, never covering content. */}
      <nav className="mobile-tab-bar" aria-label="Mobile navigation — Home, Deals, Vault, Scouts, Insights">
        <span className="nav-scout-perch" aria-hidden="true"><PixelSprite scoutId="gengar" size={24} /></span>
        <div className="grid grid-cols-5">
          {([
            { id: "home", label: "Home" },
            { id: "deals", label: "Deals" },
            { id: "vault", label: "Vault" },
            { id: "scouts", label: "Scouts" },
            { id: "insights", label: "Insights" },
          ] as { id: NavGroupId; label: string }[]).map(t => {
            const hasSubs = t.id !== "home";
            return (
            <button key={t.id} onClick={e => openGroup(t.id, e.currentTarget)} aria-label={hasSubs ? `${t.label} — open surfaces menu` : `Go to ${t.label}`} aria-haspopup={hasSubs ? "dialog" : undefined} aria-expanded={hasSubs ? launcherGroup === t.id : undefined} aria-current={!showOpen && navGroup === t.id ? "page" : undefined} className="mobile-nav-btn flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold">
              <span aria-hidden className="leading-none"><NavGlyph id={t.id} size={17} /></span>{t.label}
            </button>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
