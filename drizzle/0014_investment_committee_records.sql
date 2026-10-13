CREATE TABLE `committee_records` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `deal_id` integer NOT NULL,
  `card_name` text NOT NULL DEFAULT '',
  `score` integer NOT NULL DEFAULT 0,
  `verdict` text NOT NULL DEFAULT '',
  `bull` text NOT NULL DEFAULT '',
  `bear` text NOT NULL DEFAULT '',
  `liquidity` text NOT NULL DEFAULT '',
  `rationale` text NOT NULL DEFAULT '',
  `created_at` text NOT NULL DEFAULT ''
);
--> statement-breakpoint
CREATE UNIQUE INDEX `committee_records_deal_id_unique` ON `committee_records` (`deal_id`);
