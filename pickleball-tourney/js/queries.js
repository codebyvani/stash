import { all, exec, run } from './db.js';

const BLOWOUT_CAP = 7;

// Pool standings: W-L, capped point differential, total points scored.
// Tiebreakers applied in ORDER BY: wins → pt_diff → pts_for.
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

// All teams sorted with cross-pool seeds 1–6 (top 2 from each pool).
// Seeds 1–3 from pool winners, 4–6 from pool runners-up.
export function playoffSeeds() {
  const pools = ['A', 'B', 'C'];
  const winners = [];
  const runners = [];

  for (const p of pools) {
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

export function allTeams() {
  return all('SELECT * FROM teams ORDER BY pool, seed_in_pool');
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
  const rows = all(
    `SELECT COUNT(*) AS pending FROM matches WHERE stage = 'pool' AND score_a IS NULL`
  );
  return rows[0]?.pending === 0;
}

// ───── Playoff bracket ─────

// Playoff slots — fixed structure for 6-team bracket
// qf1: Seed 3 vs Seed 6
// qf2: Seed 4 vs Seed 5
// sf1: Seed 1 vs winner(qf2)
// sf2: Seed 2 vs winner(qf1)
// final: winner(sf1) vs winner(sf2)  (Bo3 — score = games won, max 2)
// third: loser(sf1) vs loser(sf2)
export const PLAYOFF_SLOTS = ['qf1', 'qf2', 'sf1', 'sf2', 'final', 'third'];

function nextMatchId() {
  const rows = all('SELECT COALESCE(MAX(id), 0) + 1 AS next FROM matches');
  return rows[0].next;
}

function getMatch(stage, slot) {
  // Slot encoded as round number: qf1/sf1/final/third = 1, qf2/sf2 = 2
  // and stage column: 'qf' | 'sf' | 'final' | '3rd'
  const stageCol = stage === 'third' ? '3rd' : stage;
  const round = slot === 1 || slot === 'a' ? 1 : 2;
  return all(
    `SELECT m.*, ta.name AS team_a_name, tb.name AS team_b_name
     FROM matches m
     JOIN teams ta ON ta.id = m.team_a_id
     JOIN teams tb ON tb.id = m.team_b_id
     WHERE m.stage = ? AND m.round = ?`,
    [stageCol, round]
  )[0];
}

function ensureMatch(stageCol, round, teamA, teamB) {
  const existing = all(
    `SELECT id FROM matches WHERE stage = ? AND round = ?`,
    [stageCol, round]
  );
  if (existing.length > 0) {
    // Match exists — update team IDs if they were unset / changed
    run(
      `UPDATE matches SET team_a_id = ?, team_b_id = ? WHERE id = ?`,
      [teamA, teamB, existing[0].id]
    );
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

// Idempotent: regenerates playoff matches based on current pool standings + playoff results.
// Call after every score change to cascade winners forward.
export function syncBracket() {
  if (!poolStageComplete()) return;

  const seeds = playoffSeeds();
  if (seeds.length < 6) return;

  // QF1: Seed 3 vs Seed 6 — both teams known once pool stage complete
  ensureMatch('qf', 1, seeds[2].id, seeds[5].id);
  // QF2: Seed 4 vs Seed 5
  ensureMatch('qf', 2, seeds[3].id, seeds[4].id);

  const qf1 = getMatch('qf', 1);
  const qf2 = getMatch('qf', 2);
  const qf1Winner = winnerOf(qf1);
  const qf2Winner = winnerOf(qf2);

  // SF1: Seed 1 vs winner(QF2) — needs qf2 winner
  if (qf2Winner) ensureMatch('sf', 1, seeds[0].id, qf2Winner);
  // SF2: Seed 2 vs winner(QF1)
  if (qf1Winner) ensureMatch('sf', 2, seeds[1].id, qf1Winner);

  const sf1 = qf2Winner ? getMatch('sf', 1) : null;
  const sf2 = qf1Winner ? getMatch('sf', 2) : null;
  const sf1Winner = winnerOf(sf1);
  const sf2Winner = winnerOf(sf2);
  const sf1Loser = loserOf(sf1);
  const sf2Loser = loserOf(sf2);

  // Final: SF1 winner vs SF2 winner (Bo3 — score = games won, first to 2)
  if (sf1Winner && sf2Winner) {
    ensureMatch('final', 1, sf1Winner, sf2Winner);
  }
  // 3rd place: SF1 loser vs SF2 loser
  if (sf1Loser && sf2Loser) {
    ensureMatch('3rd', 1, sf1Loser, sf2Loser);
  }
}

export function getBracketState() {
  const seeds = playoffSeeds();
  const complete = poolStageComplete();

  if (!complete) return { complete: false, seeds: [], matches: {} };

  syncBracket();

  return {
    complete: true,
    seeds,
    matches: {
      qf1: getMatch('qf', 1) || null,
      qf2: getMatch('qf', 2) || null,
      sf1: getMatch('sf', 1) || null,
      sf2: getMatch('sf', 2) || null,
      final: getMatch('final', 1) || null,
      third: getMatch('third', 1) || null,
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
    `SELECT id FROM matches WHERE stage = ? AND round = ?`,
    [stage, round]
  );
  return rows[0]?.id ?? null;
}
