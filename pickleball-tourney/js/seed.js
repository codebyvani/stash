// Placeholder teams — replace with actual approved teams after signups close (Sun Jul 5)
// pool: 'A' | 'B' | 'C'
// seed: 1..4 within the pool (used for matchup ordering)
// skill: 1 (🟢 Beginner), 2 (🟡 Intermediate), 3 (🔴 Advanced)
// Reminder: player1_skill + player2_skill must equal 3 or 4

export const SEED_TEAMS = [
  { id: 1,  name: 'Team A1', pool: 'A', seed: 1, player1: 'TBD', player1_skill: 1, player2: 'TBD', player2_skill: 3 },
  { id: 2,  name: 'Team A2', pool: 'A', seed: 2, player1: 'TBD', player1_skill: 2, player2: 'TBD', player2_skill: 2 },
  { id: 3,  name: 'Team A3', pool: 'A', seed: 3, player1: 'TBD', player1_skill: 1, player2: 'TBD', player2_skill: 2 },
  { id: 4,  name: 'Team A4', pool: 'A', seed: 4, player1: 'TBD', player1_skill: 2, player2: 'TBD', player2_skill: 2 },

  { id: 5,  name: 'Team B1', pool: 'B', seed: 1, player1: 'TBD', player1_skill: 1, player2: 'TBD', player2_skill: 3 },
  { id: 6,  name: 'Team B2', pool: 'B', seed: 2, player1: 'TBD', player1_skill: 2, player2: 'TBD', player2_skill: 2 },
  { id: 7,  name: 'Team B3', pool: 'B', seed: 3, player1: 'TBD', player1_skill: 1, player2: 'TBD', player2_skill: 2 },
  { id: 8,  name: 'Team B4', pool: 'B', seed: 4, player1: 'TBD', player1_skill: 2, player2: 'TBD', player2_skill: 2 },

  { id: 9,  name: 'Team C1', pool: 'C', seed: 1, player1: 'TBD', player1_skill: 1, player2: 'TBD', player2_skill: 3 },
  { id: 10, name: 'Team C2', pool: 'C', seed: 2, player1: 'TBD', player1_skill: 2, player2: 'TBD', player2_skill: 2 },
  { id: 11, name: 'Team C3', pool: 'C', seed: 3, player1: 'TBD', player1_skill: 1, player2: 'TBD', player2_skill: 2 },
  { id: 12, name: 'Team C4', pool: 'C', seed: 4, player1: 'TBD', player1_skill: 2, player2: 'TBD', player2_skill: 2 },
];

// Pool play schedule: each pool's round-robin maps to 3 rounds where every team plays once.
// Round 1: 1v2, 3v4 | Round 2: 1v3, 2v4 | Round 3: 1v4, 2v3
// Match IDs are stable so re-seeding doesn't break references.
function poolMatches(pool, baseIds) {
  const ids = baseIds; // [team1, team2, team3, team4] in seed order
  return [
    { round: 1, a: ids[0], b: ids[1] },
    { round: 1, a: ids[2], b: ids[3] },
    { round: 2, a: ids[0], b: ids[2] },
    { round: 2, a: ids[1], b: ids[3] },
    { round: 3, a: ids[0], b: ids[3] },
    { round: 3, a: ids[1], b: ids[2] },
  ].map((m, i) => ({ ...m, pool }));
}

const poolA = poolMatches('A', [1, 2, 3, 4]);
const poolB = poolMatches('B', [5, 6, 7, 8]);
const poolC = poolMatches('C', [9, 10, 11, 12]);

// Stable IDs: 1-6 Pool A, 7-12 Pool B, 13-18 Pool C
export const SEED_MATCHES = [...poolA, ...poolB, ...poolC].map((m, i) => ({
  id: i + 1,
  stage: 'pool',
  round: m.round,
  pool: m.pool,
  team_a_id: m.a,
  team_b_id: m.b,
}));
