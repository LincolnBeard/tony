ALTER TABLE `deal_feed` ADD COLUMN `status` text DEFAULT 'new' NOT NULL;
--> statement-breakpoint
ALTER TABLE `deal_feed` ADD COLUMN `first_found_at` text;
--> statement-breakpoint
ALTER TABLE `deal_feed` ADD COLUMN `last_seen_at` text;
--> statement-breakpoint
ALTER TABLE `deal_feed` ADD COLUMN `prev_asking_usd` real;
--> statement-breakpoint
ALTER TABLE `deal_feed` ADD COLUMN `subject_key` text;
--> statement-breakpoint
ALTER TABLE `deal_feed` ADD COLUMN `target_group` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `market_listings` ADD COLUMN `status` text DEFAULT 'live' NOT NULL;
--> statement-breakpoint
ALTER TABLE `market_listings` ADD COLUMN `prev_asking_usd` real;
--> statement-breakpoint
ALTER TABLE `market_listings` ADD COLUMN `first_found_at` text;
