CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vote_day TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  choice TEXT NOT NULL CHECK (choice IN ('bitcoin', 'ai')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (vote_day, visitor_hash)
);

CREATE INDEX IF NOT EXISTS votes_choice_idx ON votes (choice);
CREATE INDEX IF NOT EXISTS votes_day_ip_idx ON votes (vote_day, ip_hash);
