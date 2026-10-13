CREATE TABLE `deal_alerts` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `alert_type` text NOT NULL DEFAULT 'tier1_find',
  `card_name` text NOT NULL,
  `price` real,
  `discount_pct` real,
  `listing_url` text,
  `payload` text NOT NULL DEFAULT '',
  `status` text NOT NULL DEFAULT 'pending_delivery',
  `created_at` text NOT NULL DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE `pop_history` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `cert` text NOT NULL,
  `card_name` text NOT NULL DEFAULT '',
  `pop_total` integer NOT NULL,
  `pop_grade` integer,
  `recorded_at` text NOT NULL DEFAULT '2026-10-08'
);
--> statement-breakpoint
CREATE TABLE `paper_positions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `scout_id` text NOT NULL,
  `deal_id` integer,
  `card_name` text NOT NULL,
  `entry_usd` real NOT NULL,
  `market_usd` real,
  `size_factor` real NOT NULL DEFAULT 1,
  `status` text NOT NULL DEFAULT 'open',
  `created_at` text NOT NULL DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE `exit_drafts` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `cert` text NOT NULL,
  `card_name` text NOT NULL DEFAULT '',
  `title` text NOT NULL DEFAULT '',
  `description` text NOT NULL DEFAULT '',
  `suggested_price` real,
  `price_source` text NOT NULL DEFAULT '',
  `status` text NOT NULL DEFAULT 'draft',
  `sale_price` real,
  `fee_estimate` real,
  `net_usd` real,
  `sold_date` text,
  `created_at` text NOT NULL DEFAULT ''
);
