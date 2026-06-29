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

const RESET_PASSWORD = 'pickles';

function askPassword(message) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <p class="modal-message">${message}</p>
        <input type="password" id="modal-password" placeholder="Password" autocomplete="off" />
        <p class="modal-error" id="modal-error" hidden>Wrong password.</p>
        <div class="modal-actions">
          <button type="button" id="modal-cancel">Cancel</button>
          <button type="button" id="modal-ok" class="primary">Confirm</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('#modal-password');
    const errEl = overlay.querySelector('#modal-error');

    const finish = (result) => {
      overlay.remove();
      document.removeEventListener('keydown', keyHandler);
      resolve(result);
    };
    const submit = () => {
      const value = input.value;
      if (value === '') {
        errEl.hidden = false;
        errEl.textContent = 'Enter the password.';
        input.focus();
        return;
      }
      finish(value);
    };

    overlay.querySelector('#modal-cancel').addEventListener('click', () => finish(null));
    overlay.querySelector('#modal-ok').addEventListener('click', submit);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });
    const keyHandler = e => { if (e.key === 'Escape') finish(null); };
    document.addEventListener('keydown', keyHandler);
    overlay.addEventListener('click', e => { if (e.target === overlay) finish(null); });

    setTimeout(() => input.focus(), 30);
  });
}

export async function clear() {
  const entered = await askPassword('Enter the password to reset the tournament:');
  if (entered === null) return;
  if (entered !== RESET_PASSWORD) {
    alert('Wrong password.');
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

export function exportSqlite() {
  const data = db.export();
  const blob = new Blob([data], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const stamp = new Date().toISOString().slice(0, 10);
  a.download = `pickleball-tourney-backup-${stamp}.db`;
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
