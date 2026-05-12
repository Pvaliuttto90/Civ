import { UNIT, UNIT_DEFS } from './units.js';
import { TERRAIN, TERRAIN_COST } from './terrain.js';
import { effectiveAtk, effectiveDef, rollCombat } from './combat.js';

export function moveUnit(state, unit, fromKey, toKey, cost) {
  const newUnits = { ...state.units };
  newUnits[unit.id] = { ...unit, moved: unit.moved + cost };
  const newHexes = { ...state.hexes };
  const fromHex = newHexes[fromKey];
  const targetHex = newHexes[toKey];
  newHexes[fromKey] = { ...fromHex, unitId: null };
  const nextTarget = { ...targetHex, unitId: unit.id };
  if (targetHex.cityOwnerId && targetHex.cityOwnerId !== unit.civId) {
    nextTarget.cityOwnerId = unit.civId;
    nextTarget.cityProgress = 0;
  }
  newHexes[toKey] = nextTarget;
  return { ...state, units: newUnits, hexes: newHexes };
}

export function resolveAttack(state, attacker, defender, fromKey, toKey) {
  const atkDef = UNIT_DEFS[attacker.type];
  const atk = effectiveAtk(attacker, state.civs);
  const def = effectiveDef(defender, state.hexes[toKey], state.civs);
  const attackerWins = rollCombat(atk, def);
  const ranged = !!atkDef.ranged;

  const newUnits = { ...state.units };
  const newHexes = { ...state.hexes };
  newUnits[attacker.id] = { ...attacker, moved: atkDef.move };

  if (attackerWins) {
    delete newUnits[defender.id];
    if (ranged) {
      newHexes[toKey] = { ...newHexes[toKey], unitId: null };
    } else {
      newHexes[fromKey] = { ...newHexes[fromKey], unitId: null };
      const targetHex = newHexes[toKey];
      const captured = { ...targetHex, unitId: attacker.id };
      if (targetHex.cityOwnerId && targetHex.cityOwnerId !== attacker.civId) {
        captured.cityOwnerId = attacker.civId;
        captured.cityProgress = 0;
      }
      newHexes[toKey] = captured;
    }
  } else {
    delete newUnits[attacker.id];
    newHexes[fromKey] = { ...newHexes[fromKey], unitId: null };
  }
  return { ...state, units: newUnits, hexes: newHexes };
}

// Legacy city founding — will be removed when Bases replace cities.
export function foundCityAt(state, hexKey, civId) {
  const hex = state.hexes[hexKey];
  if (!hex) return state;
  if (hex.terrain !== TERRAIN.WILDERNESS) return state;
  const unit = hex.unitId ? state.units[hex.unitId] : null;
  if (!unit || unit.type !== UNIT.SETTLER) return state;
  if (unit.civId !== civId) return state;
  if (hex.cityOwnerId) return state;
  const newUnits = { ...state.units };
  delete newUnits[unit.id];
  return {
    ...state,
    units: newUnits,
    hexes: {
      ...state.hexes,
      [hexKey]: { ...hex, unitId: null, cityOwnerId: civId, cityProgress: 0 },
    },
  };
}

export function findUnitLocation(hexes, unitId) {
  for (const [k, h] of Object.entries(hexes)) {
    if (h.unitId === unitId) return k;
  }
  return null;
}

export function canEnter(state, hex, unit) {
  if (hex.terrain === TERRAIN.SLAG) {
    const civ = state.civs?.[unit.civId];
    if (!civ?.traits?.slagMoveCost) return false;
  }
  if (hex.unitId) {
    const occupant = state.units[hex.unitId];
    if (occupant && occupant.civId === unit.civId) return false;
  }
  return true;
}

export function terrainCost(hex, unit, state) {
  if (hex.terrain === TERRAIN.SLAG) {
    const civ = state?.civs?.[unit?.civId];
    return civ?.traits?.slagMoveCost ?? TERRAIN_COST[hex.terrain];
  }
  return TERRAIN_COST[hex.terrain];
}
