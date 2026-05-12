import { withFogUpdate } from './fog.js';

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

  // Don't trigger a dominance win before opponents have had a chance to
  // found their first city. A civ is "in the game" if it still has any
  // units or cities; dominance only fires once every such civ owns a
  // city (otherwise founding your first turn-1 city counts as 100%).
  const cityCountByCiv = {};
  for (const o of cityOwners) cityCountByCiv[o] = (cityCountByCiv[o] || 0) + 1;
  const unitsByCiv = {};
  for (const u of Object.values(state.units)) {
    unitsByCiv[u.civId] = (unitsByCiv[u.civId] || 0) + 1;
  }
  const activeCivs = Object.keys(state.civs).filter(
    (id) => (cityCountByCiv[id] || 0) > 0 || (unitsByCiv[id] || 0) > 0
  );
  const everyActiveCivHasCity = activeCivs.every(
    (id) => (cityCountByCiv[id] || 0) > 0
  );

  const dominance =
    everyActiveCivHasCity &&
    totalCities > 0 &&
    playerCities / totalCities >= 0.6 &&
    playerCities > 0;
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
  const next = withFogUpdate(state, 'player');
  const result = checkVictory(next);
  if (result) return { ...next, phase: 'result', result };
  return next;
}
