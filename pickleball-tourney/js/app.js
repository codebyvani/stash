import { init, run, exportSqlite, clear, exec } from './db.js';
import {
  poolStandings,
  poolMatches,
  playoffSeeds,
  poolStageComplete,
} from './queries.js';
import {
  renderPoolStandings,
  renderMatchList,
  renderBracket,
  setActiveTab,
} from './ui.js';

async function main() {
  await init();

  // Tab routing via hash
  const tab = (window.location.hash || '#info').slice(1);
  setActiveTab(tab);

  window.addEventListener('hashchange', () => {
    const t = (window.location.hash || '#info').slice(1);
    setActiveTab(t);
    refresh();
  });

  document.querySelectorAll('nav a').forEach(a => {
    a.addEventListener('click', () => {
      setTimeout(refresh, 0);
    });
  });

  document.getElementById('export-btn').addEventListener('click', exportSqlite);
  document.getElementById('clear-btn').addEventListener('click', clear);

  refresh();
}

function refresh() {
  refreshScoring();
  refreshBracket();
  refreshAdmin();
}

function refreshScoring() {
  for (const pool of ['A', 'B', 'C']) {
    const standings = poolStandings(pool);
    const el = document.getElementById(`pool-${pool.toLowerCase()}-standings`);
    if (el) renderPoolStandings(el, standings);
  }

  const allMatches = ['A', 'B', 'C'].flatMap(p => poolMatches(p));
  renderMatchList(document.getElementById('match-list'), allMatches, onScoreChange);
}

function refreshBracket() {
  const container = document.getElementById('bracket-view');
  if (!container) return;
  const complete = poolStageComplete();
  const seeds = complete ? playoffSeeds() : [];
  renderBracket(container, seeds, complete);
}

function refreshAdmin() {
  const el = document.getElementById('db-status');
  if (!el) return;
  const teamCount = exec('SELECT COUNT(*) AS n FROM teams')[0]?.values[0][0];
  const matchCount = exec('SELECT COUNT(*) AS n FROM matches')[0]?.values[0][0];
  const playedCount = exec(
    'SELECT COUNT(*) AS n FROM matches WHERE score_a IS NOT NULL'
  )[0]?.values[0][0];
  el.textContent = [
    `Teams:           ${teamCount}`,
    `Matches total:   ${matchCount}`,
    `Matches played:  ${playedCount}`,
    `Pool complete:   ${poolStageComplete() ? 'yes' : 'no'}`,
  ].join('\n');
}

function onScoreChange(matchId, side, raw) {
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
