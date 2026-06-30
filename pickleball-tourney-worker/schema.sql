-- Pickle Ball Tourney — D1 schema
-- Apply with: wrangler d1 execute tournament --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    pool TEXT,
    seed_in_pool INTEGER,
    player1 TEXT,
    player1_skill INTEGER,
    player2 TEXT,
    player2_skill INTEGER
);

CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY,
    stage TEXT NOT NULL,
    round INTEGER,
    pool TEXT,
    team_a_id INTEGER NOT NULL,
    team_b_id INTEGER NOT NULL,
    score_a INTEGER,
    score_b INTEGER,
    played_at TEXT,
    FOREIGN KEY (team_a_id) REFERENCES teams(id),
    FOREIGN KEY (team_b_id) REFERENCES teams(id)
);

CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT
);

INSERT OR IGNORE INTO meta (key, value) VALUES ('schema_version', '2');
