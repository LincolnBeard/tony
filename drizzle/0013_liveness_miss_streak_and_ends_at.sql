ALTER TABLE `deal_feed` ADD COLUMN `verify_miss_streak` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `deal_feed` ADD COLUMN `last_check_at` text;
--> statement-breakpoint
ALTER TABLE `deal_feed` ADD COLUMN `ends_at` text;
--> statement-breakpoint
ALTER TABLE `market_listings` ADD COLUMN `verify_miss_streak` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `market_listings` ADD COLUMN `last_check_at` text;
--> statement-breakpoint
ALTER TABLE `market_listings` ADD COLUMN `ends_at` text;
