// Pool play matchup template — each pool of 4 plays a round-robin.
// Returns 6 matches per pool (3 rounds × 2 matches per round).
// Called by queries.lockPools() after the pool draw is finalized.
//
//   Round 1: 1v2, 3v4
//   Round 2: 1v3, 2v4
//   Round 3: 1v4, 2v3
export function poolMatchupTemplate(pool, teamIds) {
  return [
    { round: 1, a: teamIds[0], b: teamIds[1] },
    { round: 1, a: teamIds[2], b: teamIds[3] },
    { round: 2, a: teamIds[0], b: teamIds[2] },
    { round: 2, a: teamIds[1], b: teamIds[3] },
    { round: 3, a: teamIds[0], b: teamIds[3] },
    { round: 3, a: teamIds[1], b: teamIds[2] },
  ].map(m => ({ ...m, stage: 'pool', pool }));
}
