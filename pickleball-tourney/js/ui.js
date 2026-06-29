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

export function renderBracket(container, seeds, isComplete) {
  if (!isComplete) {
    container.innerHTML = '<p class="muted">Bracket unlocks after all Group Stage matches are scored.</p>';
    return;
  }

  if (seeds.length < 6) {
    container.innerHTML = '<p class="muted">Need at least 6 advancing teams to render bracket.</p>';
    return;
  }

  const s = seeds; // indexed 0..5 = seeds 1..6
  container.innerHTML = `
    <div class="bracket">
      <h4>Quarterfinals</h4>
      <p><strong>QF1:</strong> ${escapeHtml(s[2].name)} (#3) vs ${escapeHtml(s[5].name)} (#6)</p>
      <p><strong>QF2:</strong> ${escapeHtml(s[3].name)} (#4) vs ${escapeHtml(s[4].name)} (#5)</p>

      <h4>Semifinals</h4>
      <p><strong>SF1:</strong> ${escapeHtml(s[0].name)} (#1) vs winner QF2</p>
      <p><strong>SF2:</strong> ${escapeHtml(s[1].name)} (#2) vs winner QF1</p>

      <h4>Final</h4>
      <p>Best of 3, games to 11.</p>
    </div>
  `;
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
