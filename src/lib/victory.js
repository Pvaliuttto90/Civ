// Compute the win/lose state. Returns null if the game continues.
export function checkVictory(state) {
  const player = state.civs.player;
  if (!player) return null;

  const cityOwners = Object.values(state.hexes)
    .map((h) => h.cityOwnerId)
    .filter(Boolean);
  const totalCities = cityOwners.length;
  const playerCities = cityOwners.filter((o) => o === 'player').length;
  const playerUnits = Object.values(state.units).filter(
    (u) => u.civId === 'player'
  ).length;
  const enemyUnits = Object.values(state.units).filter(
    (u) => u.civId !== 'player'
  ).length;

  // Defeat first — if the player has nothing left, no other condition
  // can flip it back to a win.
  if (playerUnits === 0 && playerCities === 0) {
    return {
      won: false,
      turn: state.turn,
      cities: playerCities,
      techs: player.techs.length,
    };
  }

  const dominance =
    totalCities > 0 && playerCities / totalCities >= 0.6 && playerCities > 0;
  const annihilation = enemyUnits === 0 && totalCities > 0 && playerCities > 0;
  if (dominance || annihilation) {
    return {
      won: true,
      turn: state.turn,
      cities: playerCities,
      techs: player.techs.length,
    };
  }
  return null;
}

export function withVictoryCheck(state) {
  if (state.phase === 'result') return state;
  const result = checkVictory(state);
  if (result) return { ...state, phase: 'result', result };
  return state;
}
