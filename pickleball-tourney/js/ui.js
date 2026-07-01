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
      <p>Add approved teams. Once you have ${target}, draw the pools to start the tournament.</p>
      <div class="teams-counter">
        <span class="count">${count}</span> / ${target} teams
        ${isLocked ? '<span class="locked-badge">🔒 Pools locked</span>' : ''}
      </div>
    </div>

    <details class="add-team-form" ${isLocked ? '' : 'open'}>
      <summary><strong>+ Add team</strong></summary>
      <div class="form-body ${isLocked ? 'disabled' : ''}">
        <label>Team name<input id="team-name" placeholder="e.g. Pickle Smashers" ${isLocked ? 'disabled' : ''} /></label>
        <div class="player-row">
          <label>Player 1<input id="p1-name" placeholder="Name" ${isLocked ? 'disabled' : ''} /></label>
          <label>Skill
            <select id="p1-skill" ${isLocked ? 'disabled' : ''}>
              <option value="1">🟢 Beginner (1)</option>
              <option value="2">🟡 Intermediate (2)</option>
              <option value="3">🔴 Advanced (3)</option>
            </select>
          </label>
        </div>
        <div class="player-row">
          <label>Player 2<input id="p2-name" placeholder="Name" ${isLocked ? 'disabled' : ''} /></label>
          <label>Skill
            <select id="p2-skill" ${isLocked ? 'disabled' : ''}>
              <option value="1">🟢 Beginner (1)</option>
              <option value="2">🟡 Intermediate (2)</option>
              <option value="3">🔴 Advanced (3)</option>
            </select>
          </label>
        </div>
        <div class="team-validity" id="team-validity"></div>
        <button id="add-team-btn" ${isLocked ? 'disabled' : ''}>Add team</button>
      </div>
    </details>

    <div class="teams-list-section">
      <h3>Registered teams</h3>
      <div class="teams-list-container">
        ${count === 0 ? '<p class="muted">No teams yet.</p>' : ''}
        ${teams.map(t => `
          <div class="team-card ${isLocked ? 'locked' : ''}">
            ${isLocked && t.pool ? `<span class="pool-badge pool-${t.pool}">Pool ${t.pool}</span>` : ''}
            <div class="team-card-body">
              <strong>${escapeHtml(t.name)}</strong>
              <div class="players">
                <span>${escapeHtml(t.player1 || '?')} ${TIER_EMOJI[t.player1_skill] || ''}</span>
                <span class="plus">+</span>
                <span>${escapeHtml(t.player2 || '?')} ${TIER_EMOJI[t.player2_skill] || ''}</span>
                <span class="pts">= ${(t.player1_skill || 0) + (t.player2_skill || 0)} pts</span>
              </div>
            </div>
            ${!isLocked ? `<button class="delete-team-btn" data-team-id="${t.id}" aria-label="Delete team">×</button>` : ''}
          </div>
        `).join('')}
      </div>
    </div>

    <div class="pool-draw-section">
      <h3>Pool draw</h3>
      ${
        isLocked
          ? `
            <p class="muted">✅ Pools are locked. Tournament is live.</p>
            <button class="danger" id="reset-pools-btn">Reset pools (wipes all scores)</button>
          `
          : count < target
            ? `<p class="muted">Add ${target - count} more team${target - count === 1 ? '' : 's'} to enable pool draw.</p>`
            : `
              <p>All 12 teams registered. Click below for a snake-draft preview (balanced by skill points).</p>
              <button id="preview-draw-btn">🎲 Draw pools</button>
              <div id="draw-preview"></div>
            `
      }
    </div>
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
  } else {
    container.querySelector('#reset-pools-btn')?.addEventListener('click', () => {
      handlers.onReset();
    });
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
    label: 'Session 1 — Tue Jul 7',
    time: '6:00 PM start',
    summary: 'Rounds 1 & 2, 12 matches',
  },
  2: {
    label: 'Session 2 — Tue Jul 28',
    time: '6:00 PM start',
    summary: 'Round 3, 6 matches',
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

export function renderMatchList(container, matches, onScoreChange) {
  const enriched = matches.map(m => ({ ...m, ...getMatchSlotInfo(m) }));

  const bySession = { 1: {}, 2: {} };
  for (const m of enriched) {
    if (!bySession[m.session][m.slot]) bySession[m.session][m.slot] = {};
    bySession[m.session][m.slot][m.court] = m;
  }

  container.innerHTML = [1, 2].map(sess => {
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
                  <div class="match slot-match" data-match-id="${m.id}">
                    <span class="court-label">Court ${courtNum}</span>
                    <div class="team team-a">
                      <span>${escapeHtml(m.team_a_name)}</span>
                    </div>
                    <div class="score-input">
                      <input type="number" class="score-a" min="0" max="99" value="${m.score_a ?? ''}" placeholder="-" />
                      <span> – </span>
                      <input type="number" class="score-b" min="0" max="99" value="${m.score_b ?? ''}" placeholder="-" />
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

export function renderScoringEmpty(container, reason) {
  container.innerHTML = `<div class="empty-state"><p>${reason}</p></div>`;
}

// ───── Visual bracket ─────

function matchCard(key, label, match, role) {
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

  const inputs = `
    <div class="match-inputs">
      <input type="number" class="score-input score-a"
        data-match-key="${key}" data-side="a"
        min="0" max="${maxScore}" value="${scoreA ?? ''}"
        placeholder="-" ${!hasMatch ? 'disabled' : ''} />
      <span class="dash">–</span>
      <input type="number" class="score-input score-b"
        data-match-key="${key}" data-side="b"
        min="0" max="${maxScore}" value="${scoreB ?? ''}"
        placeholder="-" ${!hasMatch ? 'disabled' : ''} />
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

export function renderVisualBracket(container, state, onPlayoffScore) {
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
          ${matchCard('qf1', 'QF1', matches.qf1, qf1Role)}
          ${matchCard('qf2', 'QF2', matches.qf2, qf2Role)}
        </div>
        <div class="round" data-round="sf">
          <div class="round-label">Semifinals</div>
          ${matchCard('sf1', 'SF1', matches.sf1, sf1Role)}
          ${matchCard('sf2', 'SF2', matches.sf2, sf2Role)}
        </div>
        <div class="round" data-round="final">
          <div class="round-label">Final (Bo3)</div>
          ${matchCard('final', 'Final', matches.final, finalRole)}
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
          ${matchCard('third', '3rd Place', matches.third, thirdRole)}
        </div>
      </div>

      <div class="bracket-seed-list">
        <h4>Seeds</h4>
        <ol>
          ${seeds.map(s => `
            <li><strong>#${s.seed}</strong> ${escapeHtml(s.name)} <span class="muted">(Pool ${s.pool})</span></li>
          `).join('')}
        </ol>
      </div>
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
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}
