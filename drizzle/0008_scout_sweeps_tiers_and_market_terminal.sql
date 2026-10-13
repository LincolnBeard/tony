ALTER TABLE `deal_feed` ADD COLUMN `tier` integer DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `scout_status` ADD COLUMN `last_sweep_at` text;
--> statement-breakpoint
ALTER TABLE `scout_status` ADD COLUMN `last_sweep_candidates` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `scout_status` ADD COLUMN `last_sweep_finds` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE `scout_sweeps` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `scout_id` text NOT NULL,
  `swept_at` text NOT NULL,
  `sources_checked` text NOT NULL DEFAULT '',
  `candidates_seen` integer DEFAULT 0 NOT NULL,
  `finds_count` integer DEFAULT 0 NOT NULL,
  `tier1_count` integer DEFAULT 0 NOT NULL,
  `tier2_count` integer DEFAULT 0 NOT NULL,
  `note` text NOT NULL DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE `market_listings` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `subject_key` text NOT NULL,
  `subject_name` text NOT NULL,
  `grade_label` text NOT NULL DEFAULT '',
  `asking_usd` real NOT NULL,
  `market_usd` real,
  `marketplace` text NOT NULL DEFAULT '',
  `seller` text,
  `ships_from` text,
  `listing_url` text,
  `found_at` text NOT NULL DEFAULT '',
  `last_swept_at` text,
  `scout_id` text NOT NULL DEFAULT '',
  `passed` integer DEFAULT 0 NOT NULL
);
