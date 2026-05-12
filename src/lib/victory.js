import { withFogUpdate } from './fog.js';
import { TERRAIN } from './terrain.js';
import { UNIT } from './units.js';

const ENGINEER_DEADLINE_TURN = 30;
const SLAG_SURVIVAL_RATIO = 0.7;

function getPlayerCivId(state) {
  if (state.playerCivId) return state.playerCivId;
  const civ = Object.values(state.civs || {}).find((c) => c.isPlayer);
  return civ ? civ.id : null;
}

function slagRatio(state) {
  const hexes = Object.values(state.hexes);
  if (hexes.length === 0) return 0;
  const slag = hexes.filter((h) => h.terrain === TERRAIN.SLAG).length;
  return slag / hexes.length;
}

function cleanHexCountByCiv(state) {
  const counts = {};
  for (const h of Object.values(state.hexes)) {
    if ((h.pollution ?? 0) !== 0) continue;
    if (h.station?.civId) {
      counts[h.station.civId] = (counts[h.station.civId] || 0) + 1;
      continue;
    }
    if (h.unitId) {
      const u = state.units[h.unitId];
      if (u) counts[u.civId] = (counts[u.civId] || 0) + 1;
    }
  }
  return counts;
}

function hasBase(state, civId) {
  return Object.values(state.units).some(
    (u) => u.civId === civId && u.type === UNIT.BASE
  );
}

function faction(state, civId) {
  return state.civs[civId]?.name || civId;
}

export function checkVictory(state) {
  const playerCivId = getPlayerCivId(state);
  if (!playerCivId) return null;
  const player = state.civs[playerCivId];
  if (!player) return null;

  // Defeat — Base destroyed = run over.
  if (!hasBase(state, playerCivId)) {
    return {
      won: false,
      turn: state.turn,
      faction: player.name,
      reason: 'Your Base was destroyed.',
    };
  }

  const slag = slagRatio(state);
  const clean = cleanHexCountByCiv(state);

  for (const civId of Object.keys(state.civs)) {
    const civ = state.civs[civId];
    if (civ.isEliminated) continue;
    const cond = civ.traits?.winCondition;

    if (cond === 'syndicate' && (civ.fuel ?? 0) >= 50) {
      return {
        won: civId === playerCivId,
        turn: state.turn,
        faction: civ.name,
        reason: `${faction(state, civId)} banked 50 fuel.`,
      };
    }
    if (cond === 'blight' && slag >= 0.4) {
      return {
        won: civId === playerCivId,
        turn: state.turn,
        faction: civ.name,
        reason: `${faction(state, civId)} turned 40% of the world to slag.`,
      };
    }
    if (cond === 'engineers' && state.turn >= ENGINEER_DEADLINE_TURN) {
      const own = clean[civId] || 0;
      const otherMax = Math.max(
        0,
        ...Object.entries(clean)
          .filter(([id]) => id !== civId)
          .map(([, v]) => v)
      );
      if (own > 0 && own > otherMax) {
        return {
          won: civId === playerCivId,
          turn: state.turn,
          faction: civ.name,
          reason: `${faction(state, civId)} held the most clean ground at turn ${ENGINEER_DEADLINE_TURN}.`,
        };
      }
    }
    if (cond === 'runners' && (civ.stolenFuelTotal ?? 0) >= 80) {
      return {
        won: civId === playerCivId,
        turn: state.turn,
        faction: civ.name,
        reason: `${faction(state, civId)} stole 80 fuel.`,
      };
    }
  }

  // Survival fallback: too much slag, last faction standing with fuel wins.
  if (slag >= SLAG_SURVIVAL_RATIO) {
    const alive = Object.values(state.civs)
      .filter((c) => !c.isEliminated && (c.fuel ?? 0) > 0)
      .sort((a, b) => (b.fuel ?? 0) - (a.fuel ?? 0));
    if (alive.length >= 1) {
      const winner = alive[0];
      return {
        won: winner.id === playerCivId,
        turn: state.turn,
        faction: winner.name,
        reason: `${winner.name} outlasted the poisoning of the world.`,
      };
    }
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
