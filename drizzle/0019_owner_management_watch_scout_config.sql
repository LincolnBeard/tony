ALTER TABLE `watchlist` ADD COLUMN `set_name` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `watchlist` ADD COLUMN `card_number` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `watchlist` ADD COLUMN `intent` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `watchlist` ADD COLUMN `grade_label` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `watchlist` ADD COLUMN `max_buy_usd` real;
--> statement-breakpoint
CREATE TABLE `scout_configs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scout_id` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`focus_groups` text DEFAULT '' NOT NULL,
	`ceiling_usd` real,
	`tier1_discount_pct` real,
	`marketplaces` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scout_configs_scout_id_unique` ON `scout_configs` (`scout_id`);
