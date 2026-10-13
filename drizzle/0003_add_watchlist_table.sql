CREATE TABLE watchlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'watch',
  price_context TEXT NOT NULL DEFAULT '',
  thesis TEXT NOT NULL DEFAULT '',
  action_rule TEXT NOT NULL DEFAULT '',
  last_checked TEXT,
  status TEXT NOT NULL DEFAULT 'Watching',
  sort_order INTEGER NOT NULL DEFAULT 0
);
