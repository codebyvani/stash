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
  matchesForTeam,
  getTeamById,
  playoffSeeds,
} from './queries.js';
import {
  renderTeamsTab,
  renderDrawPreview,
  renderPoolStandings,
  renderMatchList,
  renderScoringEmpty,
  renderVisualBracket,
  renderOverview,
  renderScheduleFilters,
  filterMatches,
  activateMatchIdCopy,
  openTeamDetailModal,
  openPlayerDetailModal,
  setActiveTab,
} from './ui.js';
import { initAutoImport, scanPickledMatch, stopScan } from './qr-receiver.js';

// In-memory preview state for the pool draw before it's locked
let pendingDraw = null;

const TAB_ALIASES = {
  info: 'rules',
  scoring: 'schedule',
  bracket: 'standings',
};

function resolveTab(raw) {
  const t = (raw || '#overview').replace(/^#/, '');
  return TAB_ALIASES[t] || t || 'overview';
}

async function main() {
  await init();

  const tab = resolveTab(window.location.hash);
  setActiveTab(tab);

  window.addEventListener('hashchange', () => {
    const t = resolveTab(window.location.hash);
    setActiveTab(t);
    refresh();
  });

  // Admin gear toggles visibility of the admin section as a sixth pseudo-tab
  document.getElementById('admin-gear')?.addEventListener('click', () => {
    window.location.hash = '#admin';
    setActiveTab('admin');
    refresh();
  });

  // Sticky Load-latest pill
  document.getElementById('sync-pill')?.addEventListener('click', () => {
    loadSnapshotFromRepo();
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
  setupHeroParallax();

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

async function onScoreReceived(e) {
  const { tourneyMatchId, scoreA, scoreB } = e.detail;
  const matchId = resolveTourneyId(tourneyMatchId);
  if (matchId == null) {
    showScanStatus(`❌ Couldn't find tourney match "${tourneyMatchId}". No changes applied.`, true);
    return;
  }

  const rows = all(
    `SELECT m.id, m.stage, m.pool, m.round, m.score_a, m.score_b,
            ta.name AS team_a_name, tb.name AS team_b_name
       FROM matches m
       JOIN teams ta ON ta.id = m.team_a_id
       JOIN teams tb ON tb.id = m.team_b_id
      WHERE m.id = ?`,
    [matchId]
  );
  const info = rows[0];
  if (!info) {
    showScanStatus(`❌ Match #${matchId} not found in DB.`, true);
    return;
  }

  const confirmed = await askScoreConfirm({
    matchId,
    tourneyMatchId,
    teamAName: info.team_a_name,
    teamBName: info.team_b_name,
    stage: info.stage,
    pool: info.pool,
    round: info.round,
    incomingScoreA: scoreA,
    incomingScoreB: scoreB,
    currentScoreA: info.score_a,
    currentScoreB: info.score_b,
  });
  if (!confirmed) {
    showScanStatus('Import cancelled.');
    return;
  }

  run(
    `UPDATE matches
       SET score_a = ?, score_b = ?, played_at = COALESCE(played_at, datetime('now'))
       WHERE id = ?`,
    [scoreA, scoreB, matchId]
  );
  showScanStatus(`✅ Match #${matchId} updated: ${scoreA} – ${scoreB}`);
  refresh();
}

function askScoreConfirm(details) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const stageLabel =
      details.stage === 'pool'
        ? `Pool ${details.pool} · Round ${details.round}`
        : details.stage.toUpperCase();
    const hasExisting = details.currentScoreA != null || details.currentScoreB != null;
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <p class="modal-message"><strong>Import scanned score?</strong></p>
        <div class="scan-confirm">
          <div class="scan-confirm-meta">Match #${details.matchId} · ${escapeHtml(stageLabel)}</div>
          <div class="scan-confirm-teams">
            <div class="scan-confirm-team">
              <span class="scan-confirm-name">${escapeHtml(details.teamAName)}</span>
              <span class="scan-confirm-score">${details.incomingScoreA}</span>
            </div>
            <div class="scan-confirm-vs">vs</div>
            <div class="scan-confirm-team">
              <span class="scan-confirm-name">${escapeHtml(details.teamBName)}</span>
              <span class="scan-confirm-score">${details.incomingScoreB}</span>
            </div>
          </div>
          ${hasExisting ? `
            <div class="scan-confirm-warn">
              ⚠️ This match already has a score:
              <strong>${details.currentScoreA ?? '-'} – ${details.currentScoreB ?? '-'}</strong>.
              Confirming will overwrite it.
            </div>` : ''
          }
        </div>
        <div class="modal-actions">
          <button type="button" id="scan-confirm-cancel">Cancel</button>
          <button type="button" id="scan-confirm-ok" class="primary">Confirm</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const finish = (result) => {
      overlay.remove();
      document.removeEventListener('keydown', keyHandler);
      resolve(result);
    };
    overlay.querySelector('#scan-confirm-cancel').addEventListener('click', () => finish(false));
    overlay.querySelector('#scan-confirm-ok').addEventListener('click', () => finish(true));
    const keyHandler = (ev) => {
      if (ev.key === 'Escape') finish(false);
      if (ev.key === 'Enter') finish(true);
    };
    document.addEventListener('keydown', keyHandler);
    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) finish(false); });

    setTimeout(() => overlay.querySelector('#scan-confirm-ok').focus(), 30);
  });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
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

// Parallax the hero banner image: as the page scrolls, drift the image up
// at ~40% of scroll speed so the Overview content below feels like it's
// sliding over the banner. Only applies on the Overview tab (where the hero
// is displayed).
function setupHeroParallax() {
  const hero = document.getElementById('page-hero');
  if (!hero) return;
  const img = hero.querySelector('.page-hero-fg') || hero.querySelector('img');
  if (!img) return;

  let ticking = false;
  const onScroll = () => {
    if (!document.body.classList.contains('tab-overview')) return;
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const heroHeight = hero.offsetHeight;
      // Fade + drift within the hero's own viewport; stop past the banner.
      if (y < heroHeight * 1.2) {
        img.style.transform = `translate3d(0, ${y * 0.4}px, 0)`;
        hero.style.setProperty('--hero-fade', String(Math.max(0, 1 - y / heroHeight * 1.2)));
      }
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
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
  refreshOverview();
  refreshTeams();
  refreshScoring();
  refreshBracket();
  refreshAdmin();
  refreshSyncPill();
}

function refreshOverview() {
  const container = document.getElementById('overview-content');
  if (!container) return;
  const teams = getAllTeams();
  const locked = isPoolDrawLocked();
  const bracket = locked ? getBracketState() : { complete: false, matches: {} };
  const stageDone = poolStageComplete();

  const poolMatchList = locked ? ['A', 'B', 'C'].flatMap(p => poolMatches(p)) : [];
  const bracketList = stageDone && bracket.matches
    ? [
        bracket.matches.qf1, bracket.matches.qf2,
        bracket.matches.sf1, bracket.matches.sf2,
        bracket.matches.final, bracket.matches.third,
      ].filter(Boolean)
    : [];
  const allMatches = [...poolMatchList, ...bracketList];
  renderOverview(container, {
    poolsLocked: locked,
    teamCount: teams.length,
    matches: allMatches,
    lastUpdated: getSnapshotUpdatedLabel(),
    bracket,
    poolStageComplete: stageDone,
    seeds: stageDone ? playoffSeeds() : [],
    onPlayoffScoreChange,
  });
  activateMatchIdCopy(container);
}

function getSnapshotUpdatedLabel() {
  const row = all("SELECT value FROM meta WHERE key = 'snapshot_updated'")[0];
  if (row?.value) return row.value;
  const created = all("SELECT value FROM meta WHERE key = 'created_at'")[0];
  return created?.value ?? null;
}

function refreshSyncPill() {
  // Show the sync pill on Overview, Schedule, Standings, Teams; hide elsewhere.
  const pill = document.getElementById('sync-pill');
  if (!pill) return;
  const currentTab = resolveTab(window.location.hash);
  const hide = currentTab === 'admin' || currentTab === 'rules';
  pill.hidden = hide;
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

  // Click a player row (photo or name) → open a player detail modal.
  container.querySelectorAll('.team-showcase-player').forEach((row) => {
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = row.dataset.playerName;
      const skill = Number(row.dataset.playerSkill) || null;
      const teamName = row.dataset.teamName;
      if (name) openPlayerDetailModal({ name, skill, teamName });
    });
  });

  // Click elsewhere on a team card → open the team detail modal.
  container.querySelectorAll('.team-showcase-card, .team-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.delete-team-btn')) return;
      if (e.target.closest('.team-showcase-player')) return; // handled above
      if (e.target.closest('input, select, button, .add-team-form, .pool-draw-section')) return;
      const teamId = Number(card.dataset.teamId);
      if (teamId) {
        const team = getTeamById(teamId);
        if (team) openTeamDetailModal(team, matchesForTeam(teamId));
      }
    });
  });
}

let scheduleFilter = 'all';

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

  // Pool standings (Standings tab)
  for (const pool of ['A', 'B', 'C']) {
    const standings = poolStandings(pool);
    const el = document.getElementById(`pool-${pool.toLowerCase()}-standings`);
    if (el) renderPoolStandings(el, standings);
  }

  // Schedule tab: filter chips + match list
  const poolList = ['A', 'B', 'C'].flatMap(p => poolMatches(p));
  const bracketState = getBracketState();
  const playoffList = bracketState.matches
    ? [
        bracketState.matches.qf1, bracketState.matches.qf2,
        bracketState.matches.sf1, bracketState.matches.sf2,
        bracketState.matches.final, bracketState.matches.third,
      ].filter(Boolean)
    : [];
  const allMatches = [...poolList, ...playoffList];
  const counts = {
    all: allMatches.length,
    'session-1': allMatches.filter(m => m.stage === 'pool' && m.round <= 2).length,
    'session-2': allMatches.filter(m => m.stage === 'pool' && m.round === 3).length,
    unplayed: allMatches.filter(m => m.score_a == null || m.score_b == null).length,
    playoffs: playoffList.length,
  };
  ensureFilterMount();
  const filterMount = document.getElementById('schedule-filters');
  if (filterMount) {
    renderScheduleFilters(filterMount, scheduleFilter, counts, (next) => {
      scheduleFilter = next;
      refreshScoring();
    });
  }

  const visibleMatches = filterMatches(allMatches, scheduleFilter);
  const matchListEl = document.getElementById('match-list');
  renderMatchList(matchListEl, visibleMatches, onPoolScoreChange, {
    lockPools: poolStageComplete(),
  });
  activateMatchIdCopy(matchListEl);
}

// The filter chips mount lives right above the match list — inject it once.
function ensureFilterMount() {
  if (document.getElementById('schedule-filters')) return;
  const matchListEl = document.getElementById('match-list');
  if (!matchListEl) return;
  const mount = document.createElement('div');
  mount.id = 'schedule-filters';
  matchListEl.parentElement.insertBefore(mount, matchListEl);
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
