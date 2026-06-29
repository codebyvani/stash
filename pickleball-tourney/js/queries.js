import { all } from './db.js';

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

  // Cross-pool sort by record → pt_diff → pts_for
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

export function allPoolMatches() {
  return all(
    `SELECT m.*, ta.name AS team_a_name, tb.name AS team_b_name
     FROM matches m
     JOIN teams ta ON ta.id = m.team_a_id
     JOIN teams tb ON tb.id = m.team_b_id
     WHERE m.stage = 'pool'
     ORDER BY m.pool, m.round, m.id`
  );
}

export function poolStageComplete() {
  const rows = all(
    `SELECT COUNT(*) AS pending FROM matches WHERE stage = 'pool' AND score_a IS NULL`
  );
  return rows[0]?.pending === 0;
}
