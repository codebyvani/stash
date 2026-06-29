import { all, run } from './db.js';
import { poolMatchupTemplate } from './seed.js';

const BLOWOUT_CAP = 7;
const POOL_NAMES = ['A', 'B', 'C'];

// ───── Teams CRUD ─────

export function getAllTeams() {
  return all('SELECT * FROM teams ORDER BY id');
}

export function teamTotalPoints(team) {
  return (team.player1_skill || 0) + (team.player2_skill || 0);
}

function nextTeamId() {
  return all('SELECT COALESCE(MAX(id), 0) + 1 AS next FROM teams')[0].next;
}

export function addTeam({ name, p1, s1, p2, s2 }) {
  const id = nextTeamId();
  run(
    `INSERT INTO teams (id, name, player1, player1_skill, player2, player2_skill)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, name, p1, s1, p2, s2]
  );
  return id;
}

export function deleteTeam(id) {
  run('DELETE FROM teams WHERE id = ?', [id]);
}

// ───── Pool draw ─────

// Snake-draft by total points to balance pools.
// Returns { A: [...], B: [...], C: [...] } — preview only, not yet committed.
export function previewPoolDraw() {
  const teams = getAllTeams();
  if (teams.length !== 12) {
    throw new Error(`Need exactly 12 teams to draw pools, have ${teams.length}.`);
  }

  const withPts = teams.map(t => ({
    ...t,
    pts: teamTotalPoints(t),
    _rand: Math.random(),
  }));
  // Sort by points desc, randomize ties
  withPts.sort((a, b) => b.pts - a.pts || a._rand - b._rand);

  const pools = { A: [], B: [], C: [] };
  for (let i = 0; i < withPts.length; i++) {
    const round = Math.floor(i / 3);
    const positionInRound = i % 3;
    const poolIdx = round % 2 === 0 ? positionInRound : (2 - positionInRound);
    pools[POOL_NAMES[poolIdx]].push(withPts[i]);
  }

  // Shuffle within each pool so seed_in_pool order isn't strictly by points
  for (const p of POOL_NAMES) {
    pools[p].sort(() => Math.random() - 0.5);
  }

  return pools;
}

function nextMatchId() {
  return all('SELECT COALESCE(MAX(id), 0) + 1 AS next FROM matches')[0].next;
}

export function lockPools(pools) {
  // Wipe any existing assignment + matches (idempotent if re-locked after reset)
  run('UPDATE teams SET pool = NULL, seed_in_pool = NULL');
  run("DELETE FROM matches WHERE stage = 'pool'");

  for (const poolName of POOL_NAMES) {
    pools[poolName].forEach((team, idx) => {
      run(
        'UPDATE teams SET pool = ?, seed_in_pool = ? WHERE id = ?',
        [poolName, idx + 1, team.id]
      );
    });
  }

  let matchId = nextMatchId();
  for (const poolName of POOL_NAMES) {
    const teamIds = pools[poolName].map(t => t.id);
    const template = poolMatchupTemplate(poolName, teamIds);
    for (const m of template) {
      run(
        `INSERT INTO matches (id, stage, round, pool, team_a_id, team_b_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [matchId++, m.stage, m.round, m.pool, m.a, m.b]
      );
    }
  }
}

export function resetPools() {
  run('UPDATE teams SET pool = NULL, seed_in_pool = NULL');
  run('DELETE FROM matches');
}

export function isPoolDrawLocked() {
  const assigned = all('SELECT COUNT(*) AS n FROM teams WHERE pool IS NOT NULL')[0].n;
  const matches = all("SELECT COUNT(*) AS n FROM matches WHERE stage = 'pool'")[0].n;
  return assigned === 12 && matches === 18;
}

// ───── Pool standings (only meaningful when locked) ─────

export function poolStandings(pool) {
  return all(
    `
    WITH results AS (
      SELECT t.id, t.name, t.seed_in_pool,
             m.score_a AS own, m.score_b AS opp
      FROM teams t
      JOIN matches m ON m.team_a_id = t.id
      WHERE t.pool = ? AND m.stage = 'pool' AND m.score_a IS NOT NULL
      UNION ALL
      SELECT t.id, t.name, t.seed_in_pool,
             m.score_b AS own, m.score_a AS opp
      FROM teams t
      JOIN matches m ON m.team_b_id = t.id
      WHERE t.pool = ? AND m.stage = 'pool' AND m.score_b IS NOT NULL
    ),
    capped AS (
      SELECT id, name, seed_in_pool, own, opp,
             CASE
               WHEN (own - opp) > ${BLOWOUT_CAP} THEN ${BLOWOUT_CAP}
               WHEN (own - opp) < -${BLOWOUT_CAP} THEN -${BLOWOUT_CAP}
               ELSE (own - opp)
             END AS diff_capped
      FROM results
    )
    SELECT
      t.id, t.name, t.seed_in_pool,
      COALESCE(SUM(CASE WHEN c.own > c.opp THEN 1 ELSE 0 END), 0) AS wins,
      COALESCE(SUM(CASE WHEN c.own < c.opp THEN 1 ELSE 0 END), 0) AS losses,
      COALESCE(SUM(c.diff_capped), 0) AS pt_diff,
      COALESCE(SUM(c.own), 0) AS pts_for
    FROM teams t
    LEFT JOIN capped c ON c.id = t.id
    WHERE t.pool = ?
    GROUP BY t.id
    ORDER BY wins DESC, pt_diff DESC, pts_for DESC, t.seed_in_pool ASC
    `,
    [pool, pool, pool]
  );
}

export function playoffSeeds() {
  if (!isPoolDrawLocked()) return [];

  const winners = [];
  const runners = [];
  for (const p of POOL_NAMES) {
    const standings = poolStandings(p);
    if (standings[0]) winners.push({ ...standings[0], pool: p });
    if (standings[1]) runners.push({ ...standings[1], pool: p });
  }
  const sorter = (a, b) =>
    b.wins - a.wins || b.pt_diff - a.pt_diff || b.pts_for - a.pts_for;
  winners.sort(sorter);
  runners.sort(sorter);
  return [
    ...winners.map((t, i) => ({ ...t, seed: i + 1 })),
    ...runners.map((t, i) => ({ ...t, seed: i + 4 })),
  ];
}

export function poolMatches(pool) {
  return all(
    `SELECT m.*, ta.name AS team_a_name, tb.name AS team_b_name
     FROM matches m
     JOIN teams ta ON ta.id = m.team_a_id
     JOIN teams tb ON tb.id = m.team_b_id
     WHERE m.stage = 'pool' AND m.pool = ?
     ORDER BY m.round, m.id`,
    [pool]
  );
}

export function poolStageComplete() {
  if (!isPoolDrawLocked()) return false;
  const rows = all(
    "SELECT COUNT(*) AS pending FROM matches WHERE stage = 'pool' AND score_a IS NULL"
  );
  return rows[0]?.pending === 0;
}

// ───── Playoff bracket ─────

function getPlayoffMatch(stage, round) {
  return all(
    `SELECT m.*, ta.name AS team_a_name, tb.name AS team_b_name
     FROM matches m
     JOIN teams ta ON ta.id = m.team_a_id
     JOIN teams tb ON tb.id = m.team_b_id
     WHERE m.stage = ? AND m.round = ?`,
    [stage, round]
  )[0];
}

function ensureMatch(stageCol, round, teamA, teamB) {
  const existing = all(
    'SELECT id FROM matches WHERE stage = ? AND round = ?',
    [stageCol, round]
  );
  if (existing.length > 0) {
    run('UPDATE matches SET team_a_id = ?, team_b_id = ? WHERE id = ?',
      [teamA, teamB, existing[0].id]);
    return existing[0].id;
  }
  const id = nextMatchId();
  run(
    `INSERT INTO matches (id, stage, round, team_a_id, team_b_id)
     VALUES (?, ?, ?, ?, ?)`,
    [id, stageCol, round, teamA, teamB]
  );
  return id;
}

function winnerOf(match) {
  if (!match || match.score_a == null || match.score_b == null) return null;
  return match.score_a > match.score_b ? match.team_a_id : match.team_b_id;
}

function loserOf(match) {
  if (!match || match.score_a == null || match.score_b == null) return null;
  return match.score_a > match.score_b ? match.team_b_id : match.team_a_id;
}

export function syncBracket() {
  if (!poolStageComplete()) return;
  const seeds = playoffSeeds();
  if (seeds.length < 6) return;

  ensureMatch('qf', 1, seeds[2].id, seeds[5].id);
  ensureMatch('qf', 2, seeds[3].id, seeds[4].id);

  const qf1 = getPlayoffMatch('qf', 1);
  const qf2 = getPlayoffMatch('qf', 2);
  const qf1Winner = winnerOf(qf1);
  const qf2Winner = winnerOf(qf2);

  if (qf2Winner) ensureMatch('sf', 1, seeds[0].id, qf2Winner);
  if (qf1Winner) ensureMatch('sf', 2, seeds[1].id, qf1Winner);

  const sf1 = qf2Winner ? getPlayoffMatch('sf', 1) : null;
  const sf2 = qf1Winner ? getPlayoffMatch('sf', 2) : null;
  const sf1Winner = winnerOf(sf1);
  const sf2Winner = winnerOf(sf2);
  const sf1Loser = loserOf(sf1);
  const sf2Loser = loserOf(sf2);

  if (sf1Winner && sf2Winner) ensureMatch('final', 1, sf1Winner, sf2Winner);
  if (sf1Loser && sf2Loser) ensureMatch('3rd', 1, sf1Loser, sf2Loser);
}

export function getBracketState() {
  const seeds = playoffSeeds();
  const poolComplete = poolStageComplete();

  if (!poolComplete) return { complete: false, seeds: [], matches: {} };

  syncBracket();

  return {
    complete: true,
    seeds,
    matches: {
      qf1: getPlayoffMatch('qf', 1) || null,
      qf2: getPlayoffMatch('qf', 2) || null,
      sf1: getPlayoffMatch('sf', 1) || null,
      sf2: getPlayoffMatch('sf', 2) || null,
      final: getPlayoffMatch('final', 1) || null,
      third: getPlayoffMatch('3rd', 1) || null,
    },
  };
}

export function getMatchIdByKey(key) {
  const map = {
    qf1: ['qf', 1],
    qf2: ['qf', 2],
    sf1: ['sf', 1],
    sf2: ['sf', 2],
    final: ['final', 1],
    third: ['3rd', 1],
  };
  const [stage, round] = map[key];
  const rows = all(
    'SELECT id FROM matches WHERE stage = ? AND round = ?',
    [stage, round]
  );
  return rows[0]?.id ?? null;
}
