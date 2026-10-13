ALTER TABLE sales_evidence ADD COLUMN verified INTEGER NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE watchlist ADD COLUMN scout_id TEXT;
--> statement-breakpoint
CREATE TABLE portfolio_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_date TEXT NOT NULL,
  total_usd REAL NOT NULL,
  priced_count INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE scout_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scout_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pokemon TEXT NOT NULL,
  emoji TEXT NOT NULL,
  territory TEXT NOT NULL,
  status_line TEXT NOT NULL DEFAULT '',
  last_checked TEXT,
  finds_count INTEGER NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE deal_feed (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_name TEXT NOT NULL,
  grade_label TEXT NOT NULL DEFAULT '',
  asking_usd REAL NOT NULL,
  market_usd REAL,
  discount_pct REAL,
  marketplace TEXT NOT NULL DEFAULT '',
  listing_url TEXT,
  found_at TEXT NOT NULL DEFAULT '',
  scout_id TEXT NOT NULL DEFAULT '',
  checked_date TEXT,
  note TEXT NOT NULL DEFAULT '',
  is_example INTEGER NOT NULL DEFAULT 0
);
