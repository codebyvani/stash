const TIER_EMOJI = { 1: '🟢', 2: '🟡', 3: '🔴' };

export function tierLabel(skill) {
  return TIER_EMOJI[skill] || '?';
}

export function renderPoolStandings(container, rows) {
  if (!rows.length) {
    container.innerHTML = '<p class="muted">No teams yet.</p>';
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

// ───── Visual bracket ─────

function teamSlot({ seed, name, score, isWinner, isLoser, isTbd, isFinalist }) {
  const classes = ['team'];
  if (isWinner) classes.push('winner');
  if (isLoser) classes.push('loser');
  if (isTbd) classes.push('tbd');
  return `
    <div class="${classes.join(' ')}">
      <span class="seed">${seed != null ? '#' + seed : ''}</span>
      <span class="name">${escapeHtml(name)}</span>
      <span class="score">${score != null ? score : (isFinalist ? '0' : '')}</span>
    </div>
  `;
}

function matchCard(key, label, match, seeds, role) {
  // role = { a: {seed, name} | null, b: {seed, name} | null, isFinal? }
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
      <input
        type="number"
        class="score-input score-a"
        data-match-key="${key}"
        data-side="a"
        min="0"
        max="${maxScore}"
        value="${scoreA ?? ''}"
        placeholder="-"
        ${!hasMatch ? 'disabled' : ''}
      />
      <span class="dash">–</span>
      <input
        type="number"
        class="score-input score-b"
        data-match-key="${key}"
        data-side="b"
        min="0"
        max="${maxScore}"
        value="${scoreB ?? ''}"
        placeholder="-"
        ${!hasMatch ? 'disabled' : ''}
      />
    </div>
  `;

  const aClass = ['team', 'team-a'];
  const bClass = ['team', 'team-b'];
  if (!aSet) aClass.push('tbd');
  if (!bSet) bClass.push('tbd');
  if (winner === 'a') aClass.push('winner');
  if (winner === 'b') bClass.push('winner');
  if (winner === 'b') aClass.push('loser');
  if (winner === 'a') bClass.push('loser');

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

  // Determine teams for each slot
  const seedMap = {}; // by seed number 1..6
  seeds.forEach(s => { seedMap[s.seed] = s; });

  const winnerInfo = (match) => {
    if (!match || match.score_a == null || match.score_b == null) return null;
    const aWins = match.score_a > match.score_b;
    const winnerId = aWins ? match.team_a_id : match.team_b_id;
    const loserId = aWins ? match.team_b_id : match.team_a_id;
    const winnerName = aWins ? match.team_a_name : match.team_b_name;
    const loserName = aWins ? match.team_b_name : match.team_a_name;
    return { winnerId, loserId, winnerName, loserName };
  };

  const qf1Info = winnerInfo(matches.qf1);
  const qf2Info = winnerInfo(matches.qf2);
  const sf1Info = winnerInfo(matches.sf1);
  const sf2Info = winnerInfo(matches.sf2);

  // Build role objects (team data for each slot)
  const role = (team) => team ? { seed: team.seed, name: team.name } : null;
  const roleFromMatch = (info, side, fallback) => {
    if (!info) return fallback;
    const name = side === 'winner' ? info.winnerName : info.loserName;
    return { seed: null, name };
  };

  const qf1Role = { a: role(seedMap[3]), b: role(seedMap[6]) };
  const qf2Role = { a: role(seedMap[4]), b: role(seedMap[5]) };
  const sf1Role = {
    a: role(seedMap[1]),
    b: qf2Info ? roleFromMatch(qf2Info, 'winner') : null,
  };
  const sf2Role = {
    a: role(seedMap[2]),
    b: qf1Info ? roleFromMatch(qf1Info, 'winner') : null,
  };
  const finalRole = {
    a: sf1Info ? roleFromMatch(sf1Info, 'winner') : null,
    b: sf2Info ? roleFromMatch(sf2Info, 'winner') : null,
    isFinal: true,
  };
  const thirdRole = {
    a: sf1Info ? roleFromMatch(sf1Info, 'loser') : null,
    b: sf2Info ? roleFromMatch(sf2Info, 'loser') : null,
  };

  // Determine champion
  const finalInfo = winnerInfo(matches.final);

  container.innerHTML = `
    <div class="bracket-container">
      <div class="bracket-rounds">

        <div class="round" data-round="qf">
          <div class="round-label">Quarterfinals</div>
          ${matchCard('qf1', 'QF1', matches.qf1, seeds, qf1Role)}
          ${matchCard('qf2', 'QF2', matches.qf2, seeds, qf2Role)}
        </div>

        <div class="round" data-round="sf">
          <div class="round-label">Semifinals</div>
          ${matchCard('sf1', 'SF1', matches.sf1, seeds, sf1Role)}
          ${matchCard('sf2', 'SF2', matches.sf2, seeds, sf2Role)}
        </div>

        <div class="round" data-round="final">
          <div class="round-label">Final (Bo3)</div>
          ${matchCard('final', 'Final', matches.final, seeds, finalRole)}
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
          ${matchCard('third', '3rd Place', matches.third, seeds, thirdRole)}
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

  // Wire score inputs
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
