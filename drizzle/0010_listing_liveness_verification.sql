ALTER TABLE `deal_feed` ADD COLUMN `last_verified_live_at` text;
--> statement-breakpoint
ALTER TABLE `deal_feed` ADD COLUMN `ended_at` text;
--> statement-breakpoint
ALTER TABLE `deal_feed` ADD COLUMN `ended_reason` text;
--> statement-breakpoint
ALTER TABLE `market_listings` ADD COLUMN `last_verified_live_at` text;
--> statement-breakpoint
ALTER TABLE `market_listings` ADD COLUMN `ended_at` text;
--> statement-breakpoint
ALTER TABLE `market_listings` ADD COLUMN `ended_reason` text;
