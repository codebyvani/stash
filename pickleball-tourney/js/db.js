const STORAGE_KEY = 'pickleball-tourney-db';

let db;
let SQL;

const SCHEMA = `
  CREATE TABLE teams (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    pool TEXT,
    seed_in_pool INTEGER,
    player1 TEXT,
    player1_skill INTEGER,
    player2 TEXT,
    player2_skill INTEGER
  );

  CREATE TABLE matches (
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

  CREATE TABLE meta (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  INSERT INTO meta (key, value) VALUES ('created_at', datetime('now'));
  INSERT INTO meta (key, value) VALUES ('schema_version', '2');
`;

export async function init() {
  SQL = await initSqlJs({
    locateFile: f => `https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/${f}`
  });

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    db = new SQL.Database(new Uint8Array(JSON.parse(saved)));
  } else {
    db = new SQL.Database();
    db.exec(SCHEMA);
    save();
  }
  return db;
}

export function save() {
  const data = Array.from(db.export());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clear() {
  const typed = prompt('Type CLEAR to wipe the tournament:');
  if (typed !== 'CLEAR') return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

export function exportSqlite() {
  const data = db.export();
  const blob = new Blob([data], { type: 'application/x-sqlite3' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const stamp = new Date().toISOString().slice(0, 10);
  a.download = `pickleball-tourney-${stamp}.sqlite`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exec(sql, params = []) {
  return db.exec(sql, params);
}

export function run(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.run(params);
  stmt.free();
  save();
}

export function all(sql, params = []) {
  const stmt = db.prepare(sql);
  const rows = [];
  stmt.bind(params);
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}
