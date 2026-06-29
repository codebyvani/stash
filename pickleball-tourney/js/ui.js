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
        if (confirm('Delete this team?')) handlers.onDelete(id);
      });
    });

    if (count >= target) {
      container.querySelector('#preview-draw-btn')?.addEventListener('click', () => {
        handlers.onPreviewDraw();
      });
    }
  } else {
    container.querySelector('#reset-pools-btn')?.addEventListener('click', () => {
      if (confirm('Reset pools? This wipes all scores and pool assignments.')) {
        handlers.onReset();
      }
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
    if (confirm('Lock in this pool assignment? You can reset later if needed.')) {
      handlers.onLock(pools);
    }
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

export function renderMatchList(container, matches, onScoreChange) {
  container.innerHTML = matches.map(m => `
    <div class="match" data-match-id="${m.id}">
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
  `).join('');

  container.querySelectorAll('.match').forEach(el => {
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
