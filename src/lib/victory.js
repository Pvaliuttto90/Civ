import { withFogUpdate } from './fog.js';

function getPlayerCivId(state) {
  if (state.playerCivId) return state.playerCivId;
  const civ = Object.values(state.civs || {}).find((c) => c.isPlayer);
  return civ ? civ.id : null;
}

// Legacy Civ-style victory check. Phase-4 commit will replace this
// with per-faction win conditions keyed off civ.traits.winCondition.
export function checkVictory(state) {
  const playerCivId = getPlayerCivId(state);
  if (!playerCivId) return null;
  const player = state.civs[playerCivId];
  if (!player) return null;

  const cityOwners = Object.values(state.hexes)
    .map((h) => h.cityOwnerId)
    .filter(Boolean);
  const totalCities = cityOwners.length;
  const playerCities = cityOwners.filter((o) => o === playerCivId).length;
  const playerUnits = Object.values(state.units).filter(
    (u) => u.civId === playerCivId
  ).length;
  const enemyUnits = Object.values(state.units).filter(
    (u) => u.civId !== playerCivId
  ).length;

  if (playerUnits === 0 && playerCities === 0) {
    return {
      won: false,
      turn: state.turn,
      cities: playerCities,
      techs: player.techs.length,
    };
  }

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
  const playerCivId = getPlayerCivId(state);
  const next = playerCivId ? withFogUpdate(state, playerCivId) : state;
  const result = checkVictory(next);
  if (result) return { ...next, phase: 'result', result };
  return next;
}
