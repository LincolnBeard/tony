CREATE TABLE cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  set_name TEXT NOT NULL,
  number TEXT NOT NULL,
  grader TEXT NOT NULL,
  grade TEXT NOT NULL,
  cert TEXT NOT NULL UNIQUE,
  vault_usd REAL,
  checked_usd REAL,
  advisor_call TEXT NOT NULL DEFAULT 'HOLD',
  advisor_reason TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  sold_price REAL,
  sold_date TEXT,
  last_checked TEXT,
  pop_info TEXT,
  era TEXT NOT NULL DEFAULT 'Vintage'
);
--> statement-breakpoint
CREATE TABLE sales_evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_cert TEXT NOT NULL,
  sale_date TEXT NOT NULL,
  price REAL NOT NULL,
  source TEXT NOT NULL,
  description TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE refresh_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ran_at INTEGER NOT NULL,
  summary TEXT NOT NULL,
  cards_checked INTEGER NOT NULL DEFAULT 0
);
