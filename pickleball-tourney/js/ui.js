const TIER_EMOJI = { 1: '🟢', 2: '🟡', 3: '🔴' };
const TIER_LABEL = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' };

export function tierLabel(skill) {
  return TIER_EMOJI[skill] || '?';
}

// ───── Teams tab ─────

export function renderTeamsTab(container, teams, isLocked, handlers) {
  const count = teams.length;
  const target = 12;

  container.innerHTML = `
    <div class="teams-header">
      <div class="teams-counter">
        <span class="count">${count}</span> / ${target} teams
        ${isLocked ? '<span class="locked-badge">🔒 Pools locked</span>' : ''}
      </div>
    </div>

    ${!isLocked ? `
      <details class="add-team-form">
        <summary><strong>+ Add team</strong></summary>
        <div class="form-body">
          <label>Team name<input id="team-name" placeholder="e.g. Pickle Smashers" /></label>
          <div class="player-row">
            <label>Player 1<input id="p1-name" placeholder="Name" /></label>
            <label>Skill
              <select id="p1-skill">
                <option value="1">🟢 Beginner (1)</option>
                <option value="2">🟡 Intermediate (2)</option>
                <option value="3">🔴 Advanced (3)</option>
              </select>
            </label>
          </div>
          <div class="player-row">
            <label>Player 2<input id="p2-name" placeholder="Name" /></label>
            <label>Skill
              <select id="p2-skill">
                <option value="1">🟢 Beginner (1)</option>
                <option value="2">🟡 Intermediate (2)</option>
                <option value="3">🔴 Advanced (3)</option>
              </select>
            </label>
          </div>
          <div class="team-validity" id="team-validity"></div>
          <button id="add-team-btn">Add team</button>
        </div>
      </details>` : ''
    }

    <div class="teams-list-section">
      <h3>${isLocked ? 'Participating teams' : 'Registered teams'}</h3>
      <div class="teams-showcase">
        ${count === 0 ? '<p class="muted">No teams yet.</p>' : ''}
        ${teams.map(t => renderShowcaseTeamCard(t, isLocked)).join('')}
      </div>
    </div>

    ${!isLocked ? `
      <div class="pool-draw-section">
        <h3>Pool draw</h3>
        ${count < target
          ? `<p class="muted">Add ${target - count} more team${target - count === 1 ? '' : 's'} to enable pool draw.</p>`
          : `
            <p>All 12 teams registered. Click below for a snake-draft preview (balanced by skill points).</p>
            <button id="preview-draw-btn">🎲 Draw pools</button>
            <div id="draw-preview"></div>
          `
        }
      </div>` : ''
    }
  `;

  if (!isLocked) {
    const validityFn = () => {
      const s1 = Number(container.querySelector('#p1-skill').value || 0);
      const s2 = Number(container.querySelector('#p2-skill').value || 0);
      const total = s1 + s2;
      const valid = total === 3 || total === 4;
      const el = container.querySelector('#team-validity');
      el.innerHTML = `Total: <strong>${total} pts</strong> ${valid ? '✅' : '❌ (need 3 or 4)'}`;
      el.className = `team-validity ${valid ? 'valid' : 'invalid'}`;
      container.querySelector('#add-team-btn').disabled = !valid;
    };

    container.querySelector('#p1-skill').addEventListener('change', validityFn);
    container.querySelector('#p2-skill').addEventListener('change', validityFn);
    validityFn();

    container.querySelector('#add-team-btn').addEventListener('click', () => {
      const name = container.querySelector('#team-name').value.trim();
      const p1 = container.querySelector('#p1-name').value.trim();
      const s1 = Number(container.querySelector('#p1-skill').value);
      const p2 = container.querySelector('#p2-name').value.trim();
      const s2 = Number(container.querySelector('#p2-skill').value);

      if (!name || !p1 || !p2) {
        alert('Fill in team name and both player names.');
        return;
      }
      handlers.onAdd({ name, p1, s1, p2, s2 });
    });

    container.querySelectorAll('.delete-team-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.teamId);
        handlers.onDelete(id);
      });
    });

    if (count >= target) {
      container.querySelector('#preview-draw-btn')?.addEventListener('click', () => {
        handlers.onPreviewDraw();
      });
    }
  }
}

export function renderDrawPreview(container, pools, handlers) {
  const targetEl = container.querySelector('#draw-preview');
  if (!targetEl) return;

  targetEl.innerHTML = `
    <div class="pool-preview">
      ${['A', 'B', 'C'].map(p => {
        const total = pools[p].reduce((sum, t) => sum + t.pts, 0);
        return `
          <div class="pool-preview-col">
            <div class="pool-preview-header">
              <h4>Pool ${p}</h4>
              <span class="muted">${total} pts total</span>
            </div>
            ${pools[p].map((t, i) => `
              <div class="team-mini">
                <span class="seed-num">${i + 1}</span>
                <strong>${escapeHtml(t.name)}</strong>
                <span class="pts">${t.pts} pts</span>
              </div>
            `).join('')}
          </div>
        `;
      }).join('')}
    </div>
    <div class="draw-actions">
      <button id="reroll-btn">🎲 Reroll</button>
      <button id="lock-draw-btn" class="primary">Lock & start tournament</button>
    </div>
  `;

  targetEl.querySelector('#reroll-btn').addEventListener('click', () => handlers.onPreviewDraw());
  targetEl.querySelector('#lock-draw-btn').addEventListener('click', () => {
    handlers.onLock(pools);
  });
}

// ───── Standings + match list ─────

export function renderPoolStandings(container, rows) {
  if (!rows.length) {
    container.innerHTML = '<p class="muted">No teams in this pool yet.</p>';
    return;
  }
  container.innerHTML = `
    <table>
      <thead>
        <tr><th>#</th><th>Team</th><th>W</th><th>L</th><th>+/-</th><th>PF</th></tr>
      </thead>
      <tbody>
        ${rows.map((r, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(r.name)}</td>
            <td>${r.wins}</td>
            <td>${r.losses}</td>
            <td>${r.pt_diff > 0 ? '+' : ''}${r.pt_diff}</td>
            <td>${r.pts_for}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// ─── Scheduled match arrangement ────────────────────────────────
//
// Matches are grouped by session and slot for display:
//   Session 1 (Tue Jul 7, 6:00 PM): Rounds 1 + 2, 6 slots × 20 min
//   Session 2 (Tue Jul 28, 6:00 PM): Round 3, 3 slots × 20 min
//
// Court assignment: Pool A on Court 1, Pool B on Court 2. Pool C's two
// matches share the same slot on both courts.

const SESSION_META = {
  1: {
    label: 'Group Stage — Tue Jul 7 (Rounds 1 & 2)',
    time: '6:00 PM start',
    summary: '12 matches',
  },
  2: {
    label: 'Group Stage — Tue Jul 7 (Round 3)',
    time: 'same day, extended session',
    summary: '6 matches',
  },
};

const SLOT_MINUTES = 20;

function getMatchSlotInfo(match) {
  const seedPair = [match.team_a_seed, match.team_b_seed].sort().join('v');

  let subMatch;
  if (match.round === 1) subMatch = seedPair === '1v2' ? 1 : 2;   // 1v2 | 3v4
  else if (match.round === 2) subMatch = seedPair === '1v3' ? 1 : 2; // 1v3 | 2v4
  else subMatch = seedPair === '1v4' ? 1 : 2;                      // 1v4 | 2v3

  const session = match.round <= 2 ? 1 : 2;

  let slot;
  if (session === 1) {
    const base = (match.round - 1) * 3;
    slot = (match.pool === 'C') ? base + 3 : base + subMatch;
  } else {
    slot = (match.pool === 'C') ? 3 : subMatch;
  }

  let court;
  if (match.pool === 'C') court = subMatch;         // C splits across courts
  else if (match.pool === 'A') court = 1;
  else court = 2;

  return { session, slot, court };
}

function formatClockTime(hour, minute) {
  const h24 = hour + Math.floor(minute / 60);
  const m = minute % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 > 12 ? h24 - 12 : h24 === 0 ? 12 : h24;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

function getSlotTimeRange(slot) {
  const startMin = (slot - 1) * SLOT_MINUTES;
  return `${formatClockTime(18, startMin)} – ${formatClockTime(18, startMin + SLOT_MINUTES)}`;
}

export function renderMatchList(container, matches, onScoreChange, opts = {}) {
  const lockPools = !!opts.lockPools;
  const lockPlayoffs = !!opts.lockPlayoffs;
  const poolMatchesRaw = matches.filter(m => m.stage === 'pool');
  const playoffMatchesRaw = matches.filter(m => m.stage !== 'pool');
  const enriched = poolMatchesRaw.map(m => ({ ...m, ...getMatchSlotInfo(m) }));

  const bySession = { 1: {}, 2: {} };
  for (const m of enriched) {
    if (!bySession[m.session][m.slot]) bySession[m.session][m.slot] = {};
    bySession[m.session][m.slot][m.court] = m;
  }

  const poolHtml = [1, 2].map(sess => {
    const slots = bySession[sess];
    if (Object.keys(slots).length === 0) return '';

    const meta = SESSION_META[sess];
    const allMatchesForSession = Object.values(slots).flatMap(s => Object.values(s));
    const total = allMatchesForSession.length;
    const played = allMatchesForSession.filter(m => m.score_a != null && m.score_b != null).length;
    const slotKeys = Object.keys(slots).map(Number).sort((a, b) => a - b);

    return `
      <section class="session-section">
        <header class="session-header">
          <div>
            <h4>${meta.label}</h4>
            <div class="session-subtitle">${meta.time} · ${meta.summary}</div>
          </div>
          <span class="session-progress">${played} / ${total} played</span>
        </header>
        ${slotKeys.map(slotNum => {
          const slot = slots[slotNum];
          const time = getSlotTimeRange(slotNum);
          return `
            <div class="slot-block">
              <div class="slot-header">
                <span class="slot-num">Slot ${slotNum}</span>
                <span class="slot-time">${time}</span>
              </div>
              ${[1, 2].map(courtNum => {
                const m = slot[courtNum];
                if (!m) return '';
                return `
                  <div class="match slot-match ${lockPools ? 'locked' : ''}" data-match-id="${m.id}">
                    <span class="court-label">Court ${courtNum}</span>
                    <span class="match-id-badge" title="Type this ID as 'Tourney match ID' in the Pickled app">#${m.id}</span>
                    <div class="team team-a">
                      <span>${escapeHtml(m.team_a_name)}</span>
                    </div>
                    <div class="score-input">
                      <input type="number" class="score-a" min="0" max="99" value="${m.score_a ?? ''}" placeholder="-" ${lockPools ? 'disabled title="Group stage locked — bracket already generated"' : ''} />
                      <span> – </span>
                      <input type="number" class="score-b" min="0" max="99" value="${m.score_b ?? ''}" placeholder="-" ${lockPools ? 'disabled title="Group stage locked — bracket already generated"' : ''} />
                    </div>
                    <div class="team team-b">
                      <span>${escapeHtml(m.team_b_name)}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `;
        }).join('')}
      </section>
    `;
  }).join('');

  const playoffHtml = renderPlayoffMatchList(playoffMatchesRaw, lockPlayoffs);
  container.innerHTML = poolHtml + playoffHtml;

  container.querySelectorAll('.slot-match').forEach(el => {
    const id = Number(el.dataset.matchId);
    el.querySelector('.score-a').addEventListener('change', e => {
      onScoreChange(id, 'a', e.target.value);
    });
    el.querySelector('.score-b').addEventListener('change', e => {
      onScoreChange(id, 'b', e.target.value);
    });
  });
}

const PLAYOFF_LABEL = {
  qf: 'Quarterfinal',
  sf: 'Semifinal',
  final: 'Final',
  '3rd': '3rd Place',
};

function renderPlayoffMatchList(matches, lockPlayoffs = false) {
  if (matches.length === 0) return '';
  // Order: qf1, qf2, sf1, sf2, final, 3rd
  const order = ['qf', 'sf', 'final', '3rd'];
  const sorted = matches.slice().sort((a, b) => {
    const oa = order.indexOf(a.stage);
    const ob = order.indexOf(b.stage);
    if (oa !== ob) return oa - ob;
    return (a.round || 0) - (b.round || 0);
  });
  const total = sorted.length;
  const played = sorted.filter(m => m.score_a != null && m.score_b != null).length;
  return `
    <section class="session-section playoffs-section">
      <header class="session-header">
        <div>
          <h4>🏆 Playoffs</h4>
          <div class="session-subtitle">Quarterfinals → Semifinals → Final</div>
        </div>
        <span class="session-progress">${played} / ${total} played</span>
      </header>
      ${sorted.map((m) => {
        const key = m.stage === '3rd' ? '3rd'
          : m.stage === 'final' ? 'final'
          : m.stage + m.round;
        const label = PLAYOFF_LABEL[m.stage] + (['qf', 'sf'].includes(m.stage) ? ` ${m.round}` : '');
        const disabled = lockPlayoffs || !m.team_a_name || !m.team_b_name;
        const lockTitle = lockPlayoffs ? 'Tournament complete — playoffs locked' : '';
        return `
          <div class="match slot-match ${lockPlayoffs ? 'locked' : ''}" data-match-id="${m.id}">
            <span class="court-label">${escapeHtml(label)}</span>
            <span class="match-id-badge" title="Type this ID as 'Tourney match ID' in the Pickled app">#${key}</span>
            <div class="team team-a"><span>${escapeHtml(m.team_a_name || 'TBD')}</span></div>
            <div class="score-input">
              <input type="number" class="score-a" min="0" max="99" value="${m.score_a ?? ''}" placeholder="-" ${disabled ? `disabled title="${lockTitle}"` : ''} />
              <span> – </span>
              <input type="number" class="score-b" min="0" max="99" value="${m.score_b ?? ''}" placeholder="-" ${disabled ? `disabled title="${lockTitle}"` : ''} />
            </div>
            <div class="team team-b"><span>${escapeHtml(m.team_b_name || 'TBD')}</span></div>
          </div>
        `;
      }).join('')}
    </section>
  `;
}

export function renderScoringEmpty(container, reason) {
  container.innerHTML = `<div class="empty-state"><p>${reason}</p></div>`;
}

// ───── Visual bracket ─────

function matchCard(key, label, match, role, lockPlayoffs = false) {
  const hasMatch = !!match;
  const aSet = role.a != null;
  const bSet = role.b != null;
  const scoreA = hasMatch ? match.score_a : null;
  const scoreB = hasMatch ? match.score_b : null;
  const winner = hasMatch && scoreA != null && scoreB != null
    ? (scoreA > scoreB ? 'a' : 'b')
    : null;

  const isFinal = role.isFinal;
  const maxScore = isFinal ? 2 : 99;
  const scoreHint = isFinal ? 'Bo3: games won (first to 2)' : 'Game to 11';
  const disabled = !hasMatch || lockPlayoffs;
  const lockTitle = lockPlayoffs ? 'Tournament complete — locked' : '';

  const inputs = `
    <div class="match-inputs">
      <input type="number" class="score-input score-a"
        data-match-key="${key}" data-side="a"
        min="0" max="${maxScore}" value="${scoreA ?? ''}"
        placeholder="-" ${disabled ? `disabled title="${lockTitle}"` : ''} />
      <span class="dash">–</span>
      <input type="number" class="score-input score-b"
        data-match-key="${key}" data-side="b"
        min="0" max="${maxScore}" value="${scoreB ?? ''}"
        placeholder="-" ${disabled ? `disabled title="${lockTitle}"` : ''} />
    </div>
  `;

  const aClass = ['team', 'team-a'];
  const bClass = ['team', 'team-b'];
  if (!aSet) aClass.push('tbd');
  if (!bSet) bClass.push('tbd');
  if (winner === 'a') { aClass.push('winner'); bClass.push('loser'); }
  if (winner === 'b') { bClass.push('winner'); aClass.push('loser'); }

  return `
    <div class="bracket-match ${isFinal ? 'final-match' : ''}" data-match-key="${key}">
      <div class="match-label">${label}</div>
      <div class="${aClass.join(' ')}">
        <span class="seed">${aSet && role.a.seed ? '#' + role.a.seed : ''}</span>
        <span class="name">${aSet ? escapeHtml(role.a.name) : 'TBD'}</span>
      </div>
      <div class="${bClass.join(' ')}">
        <span class="seed">${bSet && role.b.seed ? '#' + role.b.seed : ''}</span>
        <span class="name">${bSet ? escapeHtml(role.b.name) : 'TBD'}</span>
      </div>
      ${inputs}
      <p class="score-hint">${scoreHint}</p>
    </div>
  `;
}

export function renderVisualBracket(container, state, onPlayoffScore, opts = {}) {
  const showSeedList = opts.showSeedList !== false;
  const lockPlayoffs = !!opts.lockPlayoffs;
  if (!state.complete) {
    container.innerHTML = `
      <div class="bracket-locked">
        <p>🔒 Bracket unlocks after all 18 Group Stage matches are scored.</p>
      </div>
    `;
    return;
  }

  const { seeds, matches } = state;
  const seedMap = {};
  seeds.forEach(s => { seedMap[s.seed] = s; });

  const winnerInfo = (match) => {
    if (!match || match.score_a == null || match.score_b == null) return null;
    const aWins = match.score_a > match.score_b;
    return {
      winnerId: aWins ? match.team_a_id : match.team_b_id,
      loserId: aWins ? match.team_b_id : match.team_a_id,
      winnerName: aWins ? match.team_a_name : match.team_b_name,
      loserName: aWins ? match.team_b_name : match.team_a_name,
    };
  };

  const qf1Info = winnerInfo(matches.qf1);
  const qf2Info = winnerInfo(matches.qf2);
  const sf1Info = winnerInfo(matches.sf1);
  const sf2Info = winnerInfo(matches.sf2);
  const finalInfo = winnerInfo(matches.final);

  const role = (team) => team ? { seed: team.seed, name: team.name } : null;
  const fromMatch = (info, side) => info ? {
    seed: null,
    name: side === 'winner' ? info.winnerName : info.loserName,
  } : null;

  const qf1Role = { a: role(seedMap[3]), b: role(seedMap[6]) };
  const qf2Role = { a: role(seedMap[4]), b: role(seedMap[5]) };
  const sf1Role = { a: role(seedMap[1]), b: fromMatch(qf2Info, 'winner') };
  const sf2Role = { a: role(seedMap[2]), b: fromMatch(qf1Info, 'winner') };
  const finalRole = {
    a: fromMatch(sf1Info, 'winner'),
    b: fromMatch(sf2Info, 'winner'),
    isFinal: true,
  };
  const thirdRole = {
    a: fromMatch(sf1Info, 'loser'),
    b: fromMatch(sf2Info, 'loser'),
  };

  container.innerHTML = `
    <div class="bracket-container">
      <div class="bracket-rounds">
        <div class="round" data-round="qf">
          <div class="round-label">Quarterfinals</div>
          ${matchCard('qf1', 'QF1', matches.qf1, qf1Role, lockPlayoffs)}
          ${matchCard('qf2', 'QF2', matches.qf2, qf2Role, lockPlayoffs)}
        </div>
        <div class="round" data-round="sf">
          <div class="round-label">Semifinals</div>
          ${matchCard('sf1', 'SF1', matches.sf1, sf1Role, lockPlayoffs)}
          ${matchCard('sf2', 'SF2', matches.sf2, sf2Role, lockPlayoffs)}
        </div>
        <div class="round" data-round="final">
          <div class="round-label">Final (Bo3)</div>
          ${matchCard('final', 'Final', matches.final, finalRole, lockPlayoffs)}
        </div>
        <div class="round" data-round="champion">
          <div class="round-label">Champion</div>
          <div class="champion-card ${finalInfo ? 'crowned' : ''}">
            ${finalInfo
              ? `<div class="trophy">🏆</div><div class="champion-name">${escapeHtml(finalInfo.winnerName)}</div>`
              : `<div class="trophy muted">🏆</div><div class="champion-name muted">TBD</div>`}
          </div>
        </div>
      </div>

      <div class="third-place-section">
        <div class="round-label">3rd Place Playoff</div>
        <div class="third-place-card">
          ${matchCard('third', '3rd Place', matches.third, thirdRole, lockPlayoffs)}
        </div>
      </div>

      ${showSeedList ? `
        <div class="bracket-seed-list">
          <h4>Seeds</h4>
          <ol>
            ${seeds.map(s => `
              <li><strong>#${s.seed}</strong> ${escapeHtml(s.name)} <span class="muted">(Pool ${s.pool})</span></li>
            `).join('')}
          </ol>
        </div>` : ''
      }
    </div>
  `;

  container.querySelectorAll('.score-input').forEach(input => {
    input.addEventListener('change', e => {
      const key = e.target.dataset.matchKey;
      const side = e.target.dataset.side;
      onPlayoffScore(key, side, e.target.value);
    });
  });
}

export function setActiveTab(tab) {
  document.querySelectorAll('nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.tab === tab);
  });
  document.querySelectorAll('.tab').forEach(s => {
    s.hidden = s.id !== tab;
  });
  // Also tag <body> so tab-scoped CSS (e.g. .tab-overview .page-hero) can react.
  document.body.className = document.body.className
    .split(/\s+/).filter(c => !c.startsWith('tab-')).join(' ');
  document.body.classList.add(`tab-${tab}`);
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}

// ───── Team image helpers ─────
// Convention: pickleball-tourney/images/teams/<slug>.jpg
// where slug is derived from the team name (lowercase, hyphenated, ascii).

export function teamSlug(name) {
  return String(name || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[!?.,'"]/g, '')
    .replace(/&/g, 'and')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'team';
}

export function teamImageUrl(name) {
  return `images/teams/${teamSlug(name)}.jpg`;
}


function teamAvatar(name, size = 44) {
  const slug = teamSlug(name);
  const initials = String(name || '?')
    .split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
  return `
    <div class="team-avatar" style="width:${size}px;height:${size}px" data-team-slug="${slug}">
      <img
        src="images/teams/${slug}.jpg"
        alt=""
        loading="lazy"
        decoding="async"
        onload="this.closest('.team-avatar').classList.add('loaded');"
        onerror="if(this.dataset.f!=='1'){this.dataset.f='1';this.src='images/teams/${slug}.png';return;}this.style.display='none';"
      />
      <span class="team-avatar-initials" style="font-size:${Math.round(size * 0.4)}px">${escapeHtml(initials)}</span>
    </div>
  `;
}

export function playerSlug(name) {
  return String(name || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'player';
}

function playerAvatar(name, size = 40) {
  const slug = playerSlug(name);
  const initial = String(name || '?').trim().charAt(0).toUpperCase() || '?';
  return `
    <div class="player-avatar" style="width:${size}px;height:${size}px">
      <img
        src="images/players/${slug}.jpg"
        alt=""
        loading="lazy"
        decoding="async"
        onload="this.closest('.player-avatar').classList.add('loaded');this.closest('.team-showcase-player, .overview-card, .team-modal')?.classList.add('has-image');"
        onerror="if(this.dataset.f!=='1'){this.dataset.f='1';this.src='images/players/${slug}.png';return;}this.style.display='none';"
      />
      <span class="player-avatar-initials" style="font-size:${Math.round(size * 0.45)}px">${escapeHtml(initial)}</span>
    </div>
  `;
}

function renderShowcaseTeamCard(t, isLocked) {
  const slug = teamSlug(t.name);
  const total = (t.player1_skill || 0) + (t.player2_skill || 0);
  const p1Slug = playerSlug(t.player1);
  const p2Slug = playerSlug(t.player2);
  return `
    <div class="team-showcase-card ${isLocked ? 'locked' : ''}" data-team-id="${t.id}">
      <div class="team-showcase-photo empty" data-team-slug="${slug}" data-team-file="images/teams/${slug}.jpg|.png">
        <img
          src="images/teams/${slug}.jpg"
          alt="${escapeHtml(t.name)}"
          loading="lazy"
          decoding="async"
          onerror="if(this.dataset.f!=='1'){this.dataset.f='1';this.src='images/teams/${slug}.png';return;}this.style.display='none';"
          onload="this.parentElement.classList.remove('empty');this.closest('.team-showcase-card')?.classList.add('has-team-image');var r=this.naturalWidth/this.naturalHeight;var top=r>=1.33?50:Math.max(5,Math.round(r*30));this.style.objectPosition='center '+top+'%';"
        />
        ${isLocked && t.pool ? `<span class="team-showcase-pool pool-${t.pool}">Pool ${t.pool}</span>` : ''}
      </div>
      <div class="team-showcase-body">
        <h4 class="team-showcase-name">${escapeHtml(t.name)}</h4>
        <div class="team-showcase-players">
          <div class="team-showcase-player" data-slug="${p1Slug}"
               data-player-name="${escapeHtml(t.player1 || '')}"
               data-player-skill="${t.player1_skill || ''}"
               data-team-name="${escapeHtml(t.name)}">
            ${playerAvatar(t.player1, 56)}
            <div class="team-showcase-player-info">
              <span class="team-showcase-player-name">${escapeHtml(t.player1 || '?')}</span>
              <span class="team-showcase-player-tier">${TIER_EMOJI[t.player1_skill] || ''} ${TIER_LABEL[t.player1_skill] || ''}</span>
              <span class="team-showcase-player-slug">images/players/${p1Slug}.jpg</span>
            </div>
          </div>
          <div class="team-showcase-player" data-slug="${p2Slug}"
               data-player-name="${escapeHtml(t.player2 || '')}"
               data-player-skill="${t.player2_skill || ''}"
               data-team-name="${escapeHtml(t.name)}">
            ${playerAvatar(t.player2, 56)}
            <div class="team-showcase-player-info">
              <span class="team-showcase-player-name">${escapeHtml(t.player2 || '?')}</span>
              <span class="team-showcase-player-tier">${TIER_EMOJI[t.player2_skill] || ''} ${TIER_LABEL[t.player2_skill] || ''}</span>
              <span class="team-showcase-player-slug">images/players/${p2Slug}.jpg</span>
            </div>
          </div>
        </div>
        <div class="team-showcase-slug-hint">Team photo: <code>images/teams/${slug}.png</code></div>
        <div class="team-showcase-footer">
          <span class="team-showcase-points">${total} pts</span>
          ${!isLocked ? `<button class="delete-team-btn" data-team-id="${t.id}" aria-label="Delete team">×</button>` : ''}
        </div>
      </div>
    </div>
  `;
}

// ───── Overview tab ─────

export function renderOverview(container, ctx) {
  const {
    poolsLocked,
    teamCount,
    matches,             // all matches (already enriched via renderMatchList's helper caller)
    lastUpdated,         // date-ish string
    bracket,             // { complete, seeds, matches: {qf1, qf2, sf1, sf2, final, third} }
    poolStageComplete,
    seeds = [],          // top playoff seeds after group stage
    onPlayoffScoreChange,
  } = ctx;

  const hero = renderHero(matches, poolsLocked, teamCount);
  const recent = renderOverviewRecent(matches);
  const upcoming = renderOverviewUpcoming(matches);
  const seedsStrip = seeds.length > 0 ? renderOverviewSeeds(seeds) : '';
  const showFullBracket = poolStageComplete;

  container.innerHTML = `
    <section class="overview-hero" data-anim>${hero}</section>
    <section class="overview-strip" data-anim>
      <div class="overview-strip-label">Recent results</div>
      ${recent}
    </section>
    <section class="overview-strip" data-anim>
      <div class="overview-strip-label">Coming up</div>
      ${upcoming}
    </section>
    ${seedsStrip ? `
      <section class="overview-strip" data-anim>
        <div class="overview-strip-label">Top seeds · Group stage complete</div>
        ${seedsStrip}
        <a class="overview-prize-hint" href="#rules">🏆 Prize pool: <strong>₱8,000</strong> up for grabs · see splits →</a>
      </section>` : ''
    }
    <section class="overview-strip overview-bracket-strip" data-anim>
      <div class="overview-strip-label">Bracket</div>
      ${showFullBracket
        ? '<div id="overview-bracket-view"></div>'
        : renderOverviewBracket(bracket, poolStageComplete)
      }
    </section>
    ${lastUpdated ? `<p class="overview-updated">Snapshot loaded: ${escapeHtml(lastUpdated)}</p>` : ''}
  `;

  if (showFullBracket && bracket) {
    const bracketEl = container.querySelector('#overview-bracket-view');
    if (bracketEl) {
      const finalMatch = bracket.matches?.final;
      const finalPlayed = !!(finalMatch && finalMatch.score_a != null && finalMatch.score_b != null);
      renderVisualBracket(bracketEl, bracket, onPlayoffScoreChange || (() => {}), {
        showSeedList: false,
        lockPlayoffs: finalPlayed,
      });
    }
  }

  activateScrollFadeIn(container);
  activateHeroSlideshow(container);
}

function renderHero(matches, locked, teamCount) {
  if (!locked) {
    return `
      <div class="hero-card hero-setup">
        <div class="hero-eyebrow">Setup</div>
        <div class="hero-title">${teamCount} / 12 teams registered</div>
        <p class="hero-sub">Add teams in <a href="#teams">Teams</a>. Draw pools once all 12 are in to start.</p>
      </div>
    `;
  }

  const upcoming = matches.filter(m => m.score_a == null && m.score_b == null).slice(0, 5);
  const played = matches.filter(m => m.score_a != null && m.score_b != null);

  if (upcoming.length > 0) {
    return `
      <div class="hero-card hero-live hero-slideshow" data-hero-slideshow>
        <div class="hero-eyebrow">Up next</div>
        <div class="hero-slides">
          ${upcoming.map((m, i) => `
            <div class="hero-slide ${i === 0 ? 'active' : ''}" data-slide-index="${i}">
              <div class="hero-vs">
                ${teamAvatar(m.team_a_name, 56)}
                <div class="hero-vs-body">
                  <div class="hero-vs-name">${escapeHtml(m.team_a_name)}</div>
                  <div class="hero-vs-x">vs</div>
                  <div class="hero-vs-name">${escapeHtml(m.team_b_name)}</div>
                </div>
                ${teamAvatar(m.team_b_name, 56)}
              </div>
              <div class="hero-meta">
                ${m.stage === 'pool'
                  ? `Pool ${m.pool} · Round ${m.round}`
                  : String(m.stage).toUpperCase()
                }
                · Match #${m.id}
              </div>
            </div>
          `).join('')}
        </div>
        ${upcoming.length > 1 ? `
          <div class="hero-dots" role="tablist">
            ${upcoming.map((_, i) => `
              <button class="hero-dot ${i === 0 ? 'active' : ''}" data-dot-index="${i}" aria-label="Show match ${i + 1}"></button>
            `).join('')}
          </div>` : ''
        }
      </div>
    `;
  }

  if (played.length > 0) {
    const last = played[played.length - 1];
    const winnerName = last.score_a > last.score_b ? last.team_a_name : last.team_b_name;
    return `
      <div class="hero-card hero-done">
        <div class="hero-eyebrow">Latest result</div>
        <div class="hero-vs">
          ${teamAvatar(last.team_a_name, 56)}
          <div class="hero-vs-body">
            <div class="hero-vs-name">${escapeHtml(last.team_a_name)}</div>
            <div class="hero-vs-score">${last.score_a} – ${last.score_b}</div>
            <div class="hero-vs-name">${escapeHtml(last.team_b_name)}</div>
          </div>
          ${teamAvatar(last.team_b_name, 56)}
        </div>
        <div class="hero-meta">🏆 ${escapeHtml(winnerName)} took it</div>
      </div>
    `;
  }

  return `
    <div class="hero-card hero-ready">
      <div class="hero-eyebrow">Ready to play</div>
      <div class="hero-title">Pools drawn · 18 pool matches queued</div>
      <p class="hero-sub">Head to <a href="#schedule">Schedule</a> to enter scores as matches finish.</p>
    </div>
  `;
}

// After the hero renders, wire the slideshow auto-advance + dot clicks.
function activateHeroSlideshow(scope = document) {
  const slideshow = scope.querySelector('[data-hero-slideshow]');
  if (!slideshow) return;
  const slides = slideshow.querySelectorAll('.hero-slide');
  const dots = slideshow.querySelectorAll('.hero-dot');
  if (slides.length < 2) return;

  let i = 0;
  const show = (n) => {
    i = ((n % slides.length) + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle('active', k === i));
    dots.forEach((d, k) => d.classList.toggle('active', k === i));
  };
  dots.forEach((d, k) => d.addEventListener('click', (e) => {
    e.stopPropagation();
    show(k);
    reset();
  }));

  let timer = null;
  const start = () => { timer = setInterval(() => show(i + 1), 4500); };
  const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
  const reset = () => { stop(); start(); };
  slideshow.addEventListener('mouseenter', stop);
  slideshow.addEventListener('mouseleave', start);
  start();
}

function renderOverviewRecent(matches) {
  const played = matches
    .filter(m => m.score_a != null && m.score_b != null)
    .slice(-5).reverse();
  if (played.length === 0) {
    return '<div class="overview-empty">No matches played yet.</div>';
  }
  return `
    <div class="overview-cards">
      ${played.map(m => overviewResultCard(m)).join('')}
    </div>
  `;
}

function renderOverviewUpcoming(matches) {
  const upcoming = matches
    .filter(m => m.score_a == null && m.score_b == null)
    .slice(0, 12);
  if (upcoming.length === 0) {
    return '<div class="overview-empty">All pool matches done — bracket time.</div>';
  }
  return `
    <div class="overview-cards overview-cards-scroll">
      ${upcoming.map(m => overviewUpcomingCard(m)).join('')}
    </div>
  `;
}

function overviewResultCard(m) {
  const aWin = m.score_a > m.score_b;
  return `
    <div class="overview-card overview-card-done">
      <div class="overview-card-meta">
        ${m.stage === 'pool' ? `Pool ${m.pool} · R${m.round}` : String(m.stage).toUpperCase()}
        · #${m.id}
      </div>
      <div class="overview-card-line ${aWin ? 'winner' : 'loser'}">
        ${teamAvatar(m.team_a_name, 32)}
        <span class="overview-card-name">${escapeHtml(m.team_a_name)}</span>
        <span class="overview-card-score">${m.score_a}</span>
      </div>
      <div class="overview-card-line ${!aWin ? 'winner' : 'loser'}">
        ${teamAvatar(m.team_b_name, 32)}
        <span class="overview-card-name">${escapeHtml(m.team_b_name)}</span>
        <span class="overview-card-score">${m.score_b}</span>
      </div>
    </div>
  `;
}

function overviewUpcomingCard(m) {
  return `
    <div class="overview-card overview-card-upcoming">
      <div class="overview-card-meta">
        ${m.stage === 'pool' ? `Pool ${m.pool} · R${m.round}` : String(m.stage).toUpperCase()}
        · #${m.id}
      </div>
      <div class="overview-card-line">
        ${teamAvatar(m.team_a_name, 32)}
        <span class="overview-card-name">${escapeHtml(m.team_a_name)}</span>
      </div>
      <div class="overview-card-vs">vs</div>
      <div class="overview-card-line">
        ${teamAvatar(m.team_b_name, 32)}
        <span class="overview-card-name">${escapeHtml(m.team_b_name)}</span>
      </div>
    </div>
  `;
}

function renderOverviewSeeds(seeds) {
  const winners = seeds.filter((s) => s.seed <= 3);
  const runners = seeds.filter((s) => s.seed > 3);
  return `
    <div class="seed-section">
      <div class="seed-section-label">🏆 Pool Winners</div>
      <div class="seed-row seed-row-winners">
        ${winners.map((s, i) => renderSeedCard(s, 'winner', i)).join('')}
      </div>
    </div>
    <div class="seed-section">
      <div class="seed-section-label">Runner-ups</div>
      <div class="seed-row seed-row-runners">
        ${runners.map((s, i) => renderSeedCard(s, 'runner', i)).join('')}
      </div>
    </div>
  `;
}

function renderSeedCard(s, stage, indexInRow) {
  const slug = teamSlug(s.name);
  const wins = s.wins ?? '?';
  const losses = s.losses ?? '?';
  const diff = s.pt_diff > 0 ? '+' + s.pt_diff : s.pt_diff;
  const avatarSize = stage === 'winner' ? 120 : 88;
  return `
    <div class="seed-card seed-${stage}" data-seed="${s.seed}" style="--seed-delay:${indexInRow * 90}ms">
      <div class="seed-bg" style="background-image:url('images/teams/${slug}.jpg')"></div>
      <div class="seed-content">
        <div class="seed-photo">
          ${teamAvatar(s.name, avatarSize)}
          <div class="seed-badge">#${s.seed}</div>
        </div>
        <div class="seed-body">
          <div class="seed-pool">Pool ${s.pool} · ${stage === 'winner' ? 'Winner' : 'Runner-up'}</div>
          <div class="seed-name">${escapeHtml(s.name)}</div>
          <div class="seed-record">
            <span>${wins}W · ${losses}L</span>
            <span class="seed-diff">${diff}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderOverviewBracket(bracket, poolComplete) {
  if (!poolComplete) {
    return `<div class="overview-empty">Bracket unlocks after all 18 pool matches are played.</div>`;
  }
  if (!bracket || !bracket.complete) {
    return `<div class="overview-empty">Bracket forming…</div>`;
  }
  const finalName = bracket.matches.final
    ? renderBracketMini(bracket.matches.final, 'Final')
    : '';
  const third = bracket.matches.third
    ? renderBracketMini(bracket.matches.third, '3rd place')
    : '';
  const sf1 = bracket.matches.sf1 ? renderBracketMini(bracket.matches.sf1, 'SF 1') : '';
  const sf2 = bracket.matches.sf2 ? renderBracketMini(bracket.matches.sf2, 'SF 2') : '';
  const qf1 = bracket.matches.qf1 ? renderBracketMini(bracket.matches.qf1, 'QF 1') : '';
  const qf2 = bracket.matches.qf2 ? renderBracketMini(bracket.matches.qf2, 'QF 2') : '';

  return `
    <div class="overview-bracket-grid">
      <div class="overview-bracket-col">
        <div class="overview-bracket-col-label">Quarterfinals</div>
        ${qf1}${qf2}
      </div>
      <div class="overview-bracket-col">
        <div class="overview-bracket-col-label">Semifinals</div>
        ${sf1}${sf2}
      </div>
      <div class="overview-bracket-col">
        <div class="overview-bracket-col-label">Final</div>
        ${finalName}
        ${third}
      </div>
    </div>
    <p class="overview-hint">See the full bracket in <a href="#standings">Standings</a>.</p>
  `;
}

function renderBracketMini(m, label) {
  const played = m.score_a != null && m.score_b != null;
  const aWin = played && m.score_a > m.score_b;
  return `
    <div class="mini-match ${played ? 'played' : 'pending'}">
      <div class="mini-match-label">${label}</div>
      <div class="mini-match-row ${played && aWin ? 'winner' : ''}">
        <span class="mini-match-name">${escapeHtml(m.team_a_name || 'TBD')}</span>
        <span class="mini-match-score">${played ? m.score_a : '—'}</span>
      </div>
      <div class="mini-match-row ${played && !aWin ? 'winner' : ''}">
        <span class="mini-match-name">${escapeHtml(m.team_b_name || 'TBD')}</span>
        <span class="mini-match-score">${played ? m.score_b : '—'}</span>
      </div>
    </div>
  `;
}

// ───── Schedule filter chips ─────

const SCHEDULE_FILTERS = [
  { key: 'all',       label: 'All' },
  { key: 'session-1', label: 'Session 1' },
  { key: 'session-2', label: 'Session 2' },
  { key: 'unplayed',  label: 'Unplayed' },
  { key: 'playoffs',  label: 'Playoffs' },
];

export function renderScheduleFilters(container, current, counts, onChange) {
  container.innerHTML = `
    <div class="filter-chips">
      ${SCHEDULE_FILTERS.map(f => `
        <button class="filter-chip ${current === f.key ? 'active' : ''}" data-filter="${f.key}">
          ${f.label}<span class="filter-chip-count">${counts[f.key] ?? 0}</span>
        </button>
      `).join('')}
    </div>
  `;
  container.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => onChange(btn.dataset.filter));
  });
}

export function filterMatches(matches, filterKey) {
  switch (filterKey) {
    case 'session-1':
      return matches.filter(m => m.stage === 'pool' && m.round <= 2);
    case 'session-2':
      return matches.filter(m => m.stage === 'pool' && m.round === 3);
    case 'unplayed':
      return matches.filter(m => m.score_a == null || m.score_b == null);
    case 'playoffs':
      return matches.filter(m => m.stage !== 'pool');
    case 'all':
    default:
      return matches;
  }
}

// Copy-match-id handler — attach to all `.match-id-badge` inside a container.
export function activateMatchIdCopy(scope = document) {
  const badges = scope.querySelectorAll('.match-id-badge');
  badges.forEach(b => {
    if (b.dataset.copyBound === '1') return;
    b.dataset.copyBound = '1';
    b.setAttribute('title', 'Click to copy match ID');
    b.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = (b.textContent || '').replace(/^#/, '').trim();
      try {
        await navigator.clipboard.writeText(id);
      } catch {
        // Fallback: select + copy via a hidden input
        const ta = document.createElement('textarea');
        ta.value = id;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch {}
        ta.remove();
      }
      b.classList.add('copied');
      showCopyToast(`Match ID ${id} copied`);
      setTimeout(() => b.classList.remove('copied'), 900);
    });
  });
}

function showCopyToast(text) {
  let toast = document.getElementById('copy-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'copy-toast';
    toast.className = 'copy-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = text;
  requestAnimationFrame(() => toast.classList.add('show'));
  clearTimeout(showCopyToast._t);
  showCopyToast._t = setTimeout(() => toast.classList.remove('show'), 1500);
}

// ───── Team detail modal ─────

export function openTeamDetailModal(team, teamMatches) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const played = teamMatches.filter(m => m.score_a != null && m.score_b != null);
  const upcoming = teamMatches.filter(m => m.score_a == null || m.score_b == null);
  const wins = played.filter(m => {
    const isA = m.team_a_id === team.id;
    return (isA && m.score_a > m.score_b) || (!isA && m.score_b > m.score_a);
  }).length;
  const losses = played.length - wins;
  const totalPts = (team.player1_skill || 0) + (team.player2_skill || 0);

  const renderRow = (m) => {
    const isA = m.team_a_id === team.id;
    const oppName = isA ? m.team_b_name : m.team_a_name;
    const ownScore = isA ? m.score_a : m.score_b;
    const oppScore = isA ? m.score_b : m.score_a;
    const played = ownScore != null && oppScore != null;
    const won = played && ownScore > oppScore;
    const cls = !played ? 'upcoming' : won ? 'won' : 'lost';
    const meta = m.stage === 'pool' ? `Pool ${m.pool} · R${m.round}` : String(m.stage).toUpperCase();
    const scoreText = played ? `${ownScore} – ${oppScore}` : '—';
    return `
      <div class="team-modal-match ${cls}">
        <div class="team-modal-match-meta">${meta} · #${m.id}</div>
        <div class="team-modal-match-vs">vs ${escapeHtml(oppName)}</div>
        <div class="team-modal-match-score">${scoreText}</div>
      </div>
    `;
  };

  overlay.innerHTML = `
    <div class="modal team-modal" role="dialog" aria-modal="true">
      <button class="team-modal-close" aria-label="Close">×</button>
      <div class="team-modal-header">
        ${teamAvatar(team.name, 64)}
        <div>
          <h3 class="team-modal-title">${escapeHtml(team.name)}</h3>
          <p class="team-modal-sub">
            ${team.pool ? `Pool ${team.pool} · Seed ${team.seed_in_pool}` : 'No pool assigned'}
            · ${totalPts} pts
          </p>
        </div>
      </div>
      <div class="team-modal-stats">
        <div class="team-modal-stat">
          <div class="team-modal-stat-value">${wins}</div>
          <div class="team-modal-stat-label">Wins</div>
        </div>
        <div class="team-modal-stat">
          <div class="team-modal-stat-value">${losses}</div>
          <div class="team-modal-stat-label">Losses</div>
        </div>
        <div class="team-modal-stat">
          <div class="team-modal-stat-value">${played.length}/${teamMatches.length}</div>
          <div class="team-modal-stat-label">Played</div>
        </div>
      </div>
      <div class="team-modal-section">
        <div class="team-modal-section-label">Players</div>
        <div class="players">
          <span>${escapeHtml(team.player1 || '?')} ${TIER_EMOJI[team.player1_skill] || ''}</span>
          <span class="plus">+</span>
          <span>${escapeHtml(team.player2 || '?')} ${TIER_EMOJI[team.player2_skill] || ''}</span>
        </div>
      </div>
      ${played.length > 0 ? `
        <div class="team-modal-section">
          <div class="team-modal-section-label">Results</div>
          ${played.map(renderRow).join('')}
        </div>` : ''
      }
      ${upcoming.length > 0 ? `
        <div class="team-modal-section">
          <div class="team-modal-section-label">Upcoming</div>
          ${upcoming.map(renderRow).join('')}
        </div>` : ''
      }
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', keyHandler);
  };
  overlay.querySelector('.team-modal-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  const keyHandler = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', keyHandler);
}

// ───── Phase flow (Rules tab: Group Stage → Playoffs → Champion) ─────

export function renderPhaseFlow(container, { poolDone, playoffsDone, champion }) {
  if (!container) return;
  let currentIdx;
  if (champion) currentIdx = 2;
  else if (poolDone) currentIdx = 1;
  else currentIdx = 0;

  const phases = [
    { label: 'Group Stage', sub: 'round-robin pools' },
    { label: 'Playoffs',    sub: '6-team knockout bracket' },
    { label: 'Champion',    sub: champion ? escapeHtml(champion) : 'best-of-3 final' },
  ];

  container.innerHTML = phases.map((p, i) => {
    const state = i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'future';
    const sep = i < phases.length - 1 ? '<div class="phase-sep"></div>' : '';
    return `
      <div class="phase-step phase-${state}">
        <div class="phase-marker">
          ${state === 'done' ? '✓' : state === 'current' ? (i === 2 ? '🏆' : '▶') : (i + 1)}
        </div>
        <div class="phase-text">
          <div class="phase-label">${p.label}</div>
          <div class="phase-sub">${p.sub}</div>
        </div>
      </div>
      ${sep}
    `;
  }).join('');
}

// ───── Player detail modal ─────

export function openPlayerDetailModal({ name, skill, teamName }) {
  const slug = playerSlug(name);
  const initial = String(name || '?').trim().charAt(0).toUpperCase() || '?';
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal player-modal" role="dialog" aria-modal="true">
      <button class="team-modal-close" aria-label="Close">×</button>
      <div class="player-modal-photo" data-slug="${slug}">
        <img
          src="images/players/${slug}.jpg"
          alt="${escapeHtml(name || '')}"
          decoding="async"
          onload="this.closest('.player-modal-photo').classList.add('loaded');"
          onerror="if(this.dataset.f!=='1'){this.dataset.f='1';this.src='images/players/${slug}.png';return;}this.style.display='none';"
        />
        <span class="player-modal-initial">${escapeHtml(initial)}</span>
      </div>
      <div class="player-modal-info">
        <div class="player-modal-eyebrow">${escapeHtml(teamName || '')}</div>
        <h3 class="player-modal-name">${escapeHtml(name || '')}</h3>
        <div class="player-modal-skill">
          ${TIER_EMOJI[skill] || ''} ${TIER_LABEL[skill] || 'Unranked'}
          ${skill ? `<span class="player-modal-skill-pts">· ${skill} pt${skill === 1 ? '' : 's'}</span>` : ''}
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', keyHandler);
  };
  overlay.querySelector('.team-modal-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  const keyHandler = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', keyHandler);
}

// Scroll-triggered fade-in for [data-anim] children.
// Opt-in via <html class="js-anim"> so if this fails, elements are visible by default.
function activateScrollFadeIn(scope = document) {
  const els = scope.querySelectorAll('[data-anim]');
  if (els.length === 0) return;
  document.documentElement.classList.add('js-anim');

  const reveal = (el) => el.classList.add('anim-in');

  if (!('IntersectionObserver' in window)) {
    els.forEach(reveal);
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        reveal(entry.target);
        io.unobserve(entry.target);
      }
    }
  }, { threshold: 0.05 });
  els.forEach(el => io.observe(el));

  // Safety net: if any element hasn't been revealed after 1.2s, force it visible.
  setTimeout(() => els.forEach(reveal), 1200);
}
