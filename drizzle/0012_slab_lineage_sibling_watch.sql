CREATE TABLE `lineage_watch` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `cert` text NOT NULL UNIQUE,
  `label` text NOT NULL DEFAULT '',
  `relation` text NOT NULL DEFAULT 'watched',
  `note` text NOT NULL DEFAULT '',
  `created_at` text NOT NULL DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE `lineage_events` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `cert` text NOT NULL,
  `event_date` text NOT NULL DEFAULT '',
  `event_type` text NOT NULL DEFAULT 'appearance',
  `venue` text NOT NULL DEFAULT '',
  `price` real,
  `source_label` text NOT NULL DEFAULT '',
  `link_url` text,
  `verified` integer NOT NULL DEFAULT 1,
  `note` text NOT NULL DEFAULT ''
);
