import { init, run, exportSqlite, importBackup, clear, exec, verifyPassword } from './db.js';
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

  refresh();
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
