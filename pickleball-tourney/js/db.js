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

export function askPassword(message) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <p class="modal-message">${message}</p>
        <input type="password" id="modal-password" placeholder="Password" autocomplete="off" />
        <p class="modal-error" id="modal-error" hidden></p>
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

export async function verifyPassword(message) {
  const entered = await askPassword(message);
  if (entered === null) return false;
  if (entered !== RESET_PASSWORD) {
    alert('Wrong password.');
    return false;
  }
  return true;
}

function showResetModal() {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal modal-wide" role="dialog" aria-modal="true">
        <h3 class="modal-title">Reset tournament data</h3>
        <p class="modal-message">Pick what to clear. Higher-level options include the ones above them.</p>
        <div class="reset-options">
          <label class="reset-option">
            <input type="checkbox" id="reset-scores" />
            <div class="reset-option-body">
              <strong>Match scores only</strong>
              <div class="muted">Wipes all entered scores. Teams, pool draw, and match schedule remain.</div>
            </div>
          </label>
          <label class="reset-option">
            <input type="checkbox" id="reset-pools" />
            <div class="reset-option-body">
              <strong>Pool draw + matches</strong>
              <div class="muted">Unassigns pools and deletes all matches (scores included). Team roster stays.</div>
            </div>
          </label>
          <label class="reset-option">
            <input type="checkbox" id="reset-teams" />
            <div class="reset-option-body">
              <strong>Team roster (everything)</strong>
              <div class="muted">Deletes all teams along with pools and matches. Full fresh start.</div>
            </div>
          </label>
        </div>
        <label class="reset-password-label">
          Password
          <input type="password" id="modal-password" placeholder="Password" autocomplete="off" />
        </label>
        <p class="modal-error" id="modal-error" hidden></p>
        <div class="modal-actions">
          <button type="button" id="modal-cancel">Cancel</button>
          <button type="button" id="modal-ok" class="danger primary">Reset selected</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const pwInput = overlay.querySelector('#modal-password');
    const errEl = overlay.querySelector('#modal-error');

    const finish = (result) => {
      overlay.remove();
      document.removeEventListener('keydown', keyHandler);
      resolve(result);
    };
    const submit = () => {
      const scores = overlay.querySelector('#reset-scores').checked;
      const pools = overlay.querySelector('#reset-pools').checked;
      const teams = overlay.querySelector('#reset-teams').checked;
      const password = pwInput.value;

      if (!scores && !pools && !teams) {
        errEl.hidden = false;
        errEl.textContent = 'Pick at least one thing to reset.';
        return;
      }
      if (password === '') {
        errEl.hidden = false;
        errEl.textContent = 'Enter the password.';
        pwInput.focus();
        return;
      }
      finish({ scores, pools, teams, password });
    };

    overlay.querySelector('#modal-cancel').addEventListener('click', () => finish(null));
    overlay.querySelector('#modal-ok').addEventListener('click', submit);
    pwInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });
    const keyHandler = e => { if (e.key === 'Escape') finish(null); };
    document.addEventListener('keydown', keyHandler);
    overlay.addEventListener('click', e => { if (e.target === overlay) finish(null); });

    setTimeout(() => pwInput.focus(), 30);
  });
}

export async function clear() {
  const choice = await showResetModal();
  if (!choice) return;

  if (choice.password !== RESET_PASSWORD) {
    alert('Wrong password.');
    return;
  }

  // Apply highest-level effect that's selected (each level includes the ones above)
  if (choice.teams) {
    db.exec('DELETE FROM matches');
    db.exec('DELETE FROM teams');
  } else if (choice.pools) {
    db.exec('DELETE FROM matches');
    db.exec('UPDATE teams SET pool = NULL, seed_in_pool = NULL');
  } else if (choice.scores) {
    db.exec('UPDATE matches SET score_a = NULL, score_b = NULL, played_at = NULL');
  }

  save();
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
