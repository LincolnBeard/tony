CREATE TABLE `card_forecasts` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `cert` text NOT NULL,
  `issued_at` text NOT NULL,
  `horizon_days` integer NOT NULL,
  `range_low` real NOT NULL,
  `range_high` real NOT NULL,
  `midpoint` real NOT NULL,
  `confidence` text NOT NULL,
  `basis_n` integer NOT NULL DEFAULT 0,
  `basis_last_sale` text NOT NULL DEFAULT '',
  `liquidity` text NOT NULL DEFAULT 'thin',
  `regime` text NOT NULL DEFAULT 'normal',
  `model_version` text NOT NULL DEFAULT 'fc-v1',
  `origin` text NOT NULL DEFAULT 'live',
  `status` text NOT NULL DEFAULT 'open',
  `realized_value` real,
  `in_range` integer,
  `graded_at` text
);
--> statement-breakpoint
CREATE INDEX `card_forecasts_cert_idx` ON `card_forecasts` (`cert`);
--> statement-breakpoint
CREATE INDEX `card_forecasts_origin_status_idx` ON `card_forecasts` (`origin`, `status`);
