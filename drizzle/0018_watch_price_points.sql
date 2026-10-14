CREATE TABLE `watch_price_points` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`watch_id` integer NOT NULL,
	`price_usd` real NOT NULL,
	`source_type` text DEFAULT '' NOT NULL,
	`recorded_on` text NOT NULL
);
