import { init, run, exportSqlite, importBackup, loadSnapshotFromRepo, clear, exec, verifyPassword, all } from './db.js';
import {
  getAllTeams,
  addTeam,
  deleteTeam,
  previewPoolDraw,
  lockPools,
  resetPools,
  isPoolDrawLocked,
  poolStandings,
  poolMatches,
  poolStageComplete,
  getBracketState,
  getMatchIdByKey,
} from './queries.js';
import {
  renderTeamsTab,
  renderDrawPreview,
  renderPoolStandings,
  renderMatchList,
  renderScoringEmpty,
  renderVisualBracket,
  setActiveTab,
} from './ui.js';
import { initAutoImport, scanPickledMatch, stopScan } from './qr-receiver.js';

// In-memory preview state for the pool draw before it's locked
let pendingDraw = null;

async function main() {
  await init();

  const tab = (window.location.hash || '#info').slice(1);
  setActiveTab(tab);

  window.addEventListener('hashchange', () => {
    const t = (window.location.hash || '#info').slice(1);
    setActiveTab(t);
    refresh();
  });

  document.querySelectorAll('nav a').forEach(a => {
    a.addEventListener('click', () => setTimeout(refresh, 0));
  });

  document.getElementById('export-btn').addEventListener('click', exportSqlite);
  document.getElementById('clear-btn').addEventListener('click', clear);

  const fileInput = document.getElementById('import-file');
  document.getElementById('import-btn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (file) await importBackup(file);
  });

  document.getElementById('snapshot-btn').addEventListener('click', loadSnapshotFromRepo);

  // QR share integration
  initAutoImport();
  window.addEventListener('pickled:score-received', onScoreReceived);
  setupScanButton();

  refresh();
}

// ────────────────────────────────────────────────────────────
// Pickled app → tourney bridge
// ────────────────────────────────────────────────────────────

// Resolve a Pickled `eid` (tourney match ID) to a DB match row id.
// Supported forms:
//   - integer like "5"        → matches.id = 5
//   - pool round like "A1-1"  → stage='pool', pool='A', round=1, first match
//   - "A1-2"                  → second match of round 1 in pool A
//   - "qf1", "qf2"            → playoff QF
//   - "sf1", "sf2"            → playoff SF
//   - "final"                 → playoff final
//   - "third" or "3rd"        → 3rd place
function resolveTourneyId(rawId) {
  if (rawId == null) return null;
  const s = String(rawId).trim().toLowerCase();
  if (!s) return null;

  // Integer form → direct match ID
  if (/^\d+$/.test(s)) {
    const row = all('SELECT id FROM matches WHERE id = ?', [Number(s)])[0];
    return row?.id ?? null;
  }

  // Pool form: A1, A1-1, A1-2, B3-1, etc.
  const poolMatch = s.match(/^([abc])(\d+)(?:-(\d+))?$/);
  if (poolMatch) {
    const pool = poolMatch[1].toUpperCase();
    const round = Number(poolMatch[2]);
    const nth = poolMatch[3] ? Number(poolMatch[3]) : 1;
    const rows = all(
      "SELECT id FROM matches WHERE stage = 'pool' AND pool = ? AND round = ? ORDER BY id",
      [pool, round]
    );
    return rows[nth - 1]?.id ?? null;
  }

  // Playoff forms
  const playoff = {
    qf1: ['qf', 1], qf2: ['qf', 2],
    sf1: ['sf', 1], sf2: ['sf', 2],
    final: ['final', 1],
    third: ['3rd', 1], '3rd': ['3rd', 1],
  }[s];
  if (playoff) {
    const [stage, round] = playoff;
    const rows = all(
      'SELECT id FROM matches WHERE stage = ? AND round = ?',
      [stage, round]
    );
    return rows[0]?.id ?? null;
  }

  return null;
}

function onScoreReceived(e) {
  const { tourneyMatchId, scoreA, scoreB } = e.detail;
  const matchId = resolveTourneyId(tourneyMatchId);
  const status = document.getElementById('scan-status');
  if (matchId == null) {
    showScanStatus(`❌ Couldn't find tourney match "${tourneyMatchId}". No changes applied.`, true);
    return;
  }
  run(
    `UPDATE matches
       SET score_a = ?, score_b = ?, played_at = COALESCE(played_at, datetime('now'))
       WHERE id = ?`,
    [scoreA, scoreB, matchId]
  );
  showScanStatus(`✅ Match "${tourneyMatchId}" updated: ${scoreA} – ${scoreB}`);
  refresh();
}

function showScanStatus(message, isError = false) {
  const el = document.getElementById('scan-status');
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  el.classList.toggle('scan-status-error', isError);
  clearTimeout(showScanStatus._t);
  showScanStatus._t = setTimeout(() => { el.hidden = true; }, 5000);
}

function setupScanButton() {
  const btn = document.getElementById('scan-open-btn');
  const reader = document.getElementById('qr-reader');
  if (!btn || !reader) return;

  let scanning = false;
  btn.addEventListener('click', async () => {
    if (scanning) {
      stopScan('qr-reader');
      reader.hidden = true;
      btn.textContent = '📷 Scan match QR';
      scanning = false;
      return;
    }
    reader.hidden = false;
    btn.textContent = '✕ Cancel scan';
    scanning = true;
    try {
      await scanPickledMatch('qr-reader');
    } catch (err) {
      showScanStatus(`Camera error: ${err.message || err}`, true);
    } finally {
      btn.textContent = '📷 Scan match QR';
      reader.hidden = true;
      scanning = false;
    }
  });
}

function refresh() {
  refreshTeams();
  refreshScoring();
  refreshBracket();
  refreshAdmin();
}

function refreshTeams() {
  const container = document.getElementById('teams-content');
  if (!container) return;
  const teams = getAllTeams();
  const locked = isPoolDrawLocked();

  renderTeamsTab(container, teams, locked, {
    onAdd(team) {
      addTeam(team);
      pendingDraw = null;
      refresh();
    },
    async onDelete(id) {
      if (!await verifyPassword('Enter password to delete this team:')) return;
      deleteTeam(id);
      pendingDraw = null;
      refresh();
    },
    onPreviewDraw() {
      try {
        pendingDraw = previewPoolDraw();
        renderDrawPreview(container, pendingDraw, {
          onPreviewDraw() {
            pendingDraw = previewPoolDraw();
            renderDrawPreview(container, pendingDraw, this);
          },
          async onLock(pools) {
            if (!await verifyPassword('Enter password to lock the pool draw and start the tournament:')) return;
            lockPools(pools);
            pendingDraw = null;
            refresh();
          },
        });
      } catch (err) {
        alert(err.message);
      }
    },
    async onReset() {
      if (!await verifyPassword('Enter password to reset pools (clears all scores and pool assignments):')) return;
      resetPools();
      pendingDraw = null;
      refresh();
    },
  });
}

function refreshScoring() {
  if (!isPoolDrawLocked()) {
    for (const pool of ['A', 'B', 'C']) {
      const el = document.getElementById(`pool-${pool.toLowerCase()}-standings`);
      if (el) el.innerHTML = '';
    }
    const matchList = document.getElementById('match-list');
    if (matchList) {
      renderScoringEmpty(matchList,
        '🔒 Pools haven\'t been drawn yet. Go to the <a href="#teams">Teams</a> tab to set up the roster and draw pools.');
    }
    return;
  }

  for (const pool of ['A', 'B', 'C']) {
    const standings = poolStandings(pool);
    const el = document.getElementById(`pool-${pool.toLowerCase()}-standings`);
    if (el) renderPoolStandings(el, standings);
  }

  const allMatches = ['A', 'B', 'C'].flatMap(p => poolMatches(p));
  renderMatchList(document.getElementById('match-list'), allMatches, onPoolScoreChange);
}

function refreshBracket() {
  const container = document.getElementById('bracket-view');
  if (!container) return;
  const state = getBracketState();
  renderVisualBracket(container, state, onPlayoffScoreChange);
}

function refreshAdmin() {
  const el = document.getElementById('db-status');
  if (!el) return;
  const teamCount = exec('SELECT COUNT(*) AS n FROM teams')[0]?.values[0][0] ?? 0;
  const matchCount = exec('SELECT COUNT(*) AS n FROM matches')[0]?.values[0][0] ?? 0;
  const playedCount =
    exec('SELECT COUNT(*) AS n FROM matches WHERE score_a IS NOT NULL')[0]?.values[0][0] ?? 0;
  el.textContent = [
    `Teams:           ${teamCount}`,
    `Matches total:   ${matchCount}`,
    `Matches played:  ${playedCount}`,
    `Pools locked:    ${isPoolDrawLocked() ? 'yes' : 'no'}`,
    `Pool complete:   ${poolStageComplete() ? 'yes' : 'no'}`,
  ].join('\n');
}

function onPoolScoreChange(matchId, side, raw) {
  const val = raw === '' ? null : Number(raw);
  const col = side === 'a' ? 'score_a' : 'score_b';
  run(
    `UPDATE matches SET ${col} = ?, played_at = COALESCE(played_at, datetime('now')) WHERE id = ?`,
    [val, matchId]
  );
  refresh();
}

function onPlayoffScoreChange(key, side, raw) {
  const matchId = getMatchIdByKey(key);
  if (matchId == null) return;
  const val = raw === '' ? null : Number(raw);
  const col = side === 'a' ? 'score_a' : 'score_b';
  run(
    `UPDATE matches SET ${col} = ?, played_at = COALESCE(played_at, datetime('now')) WHERE id = ?`,
    [val, matchId]
  );
  refresh();
}

main().catch(err => {
  console.error(err);
  document.body.insertAdjacentHTML(
    'afterbegin',
    `<pre style="color:red;padding:1rem">Init failed: ${err.message}</pre>`
  );
});
