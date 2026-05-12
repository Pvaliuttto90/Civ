import { UNIT, UNIT_DEFS, createUnit } from './units.js';
import { TERRAIN, TERRAIN_COST } from './terrain.js';
import { effectiveAtk, effectiveDef, rollCombat } from './combat.js';
import { inBounds, key, NEIGHBORS, parseKey } from './hex.js';

const ATTACK_FUEL_COST = 2;
const DEPLOY_COSTS = {
  [UNIT.WARRIOR]: 3,
  [UNIT.RECLAIMER]: 8,
};
const STATION_BASE_SCRAP = 4;
const REPAIR_SCRAP_COST = 2;
const REPAIR_HP_GAIN = 2;
const BOMB_FUEL_COST = 12;
const BOMB_FUSE_TURNS = 3;

function cascadeMul(state) {
  return state.scrapCascadeUntil != null && state.turn <= state.scrapCascadeUntil
    ? 2
    : 1;
}

export function moveUnit(state, unit, fromKey, toKey, cost) {
  const newUnits = { ...state.units };
  newUnits[unit.id] = { ...unit, moved: unit.moved + cost };
  const newHexes = { ...state.hexes };
  const fromHex = newHexes[fromKey];
  const targetHex = newHexes[toKey];

  let fromAfter = { ...fromHex, unitId: null };
  if (unit.type === UNIT.RECLAIMER) {
    const p = fromAfter.pollution ?? 0;
    if (p > 0) fromAfter.pollution = p - 1;
  }
  newHexes[fromKey] = fromAfter;

  const nextTarget = { ...targetHex, unitId: unit.id };
  if (targetHex.cityOwnerId && targetHex.cityOwnerId !== unit.civId) {
    nextTarget.cityOwnerId = unit.civId;
    nextTarget.cityProgress = 0;
  }
  newHexes[toKey] = nextTarget;
  return { ...state, units: newUnits, hexes: newHexes };
}

export function resolveAttack(state, attacker, defender, fromKey, toKey) {
  const atkCivId = attacker.civId;
  const defCivId = defender.civId;
  const atkCiv = state.civs[atkCivId];
  if (!atkCiv) return state;
  if ((atkCiv.fuel ?? 0) < ATTACK_FUEL_COST) return state;

  const atkDef = UNIT_DEFS[attacker.type];
  const atkValue = effectiveAtk(attacker, state.civs, fromKey, state.hexes);
  const defValue = effectiveDef(defender, state.hexes[toKey], state.civs);
  const attackerWins = rollCombat(atkValue, defValue);
  const ranged = !!atkDef.ranged;

  const newUnits = { ...state.units };
  const newHexes = { ...state.hexes };
  const newCivs = { ...state.civs };
  newCivs[atkCivId] = { ...atkCiv, fuel: (atkCiv.fuel ?? 0) - ATTACK_FUEL_COST };
  newUnits[attacker.id] = { ...attacker, moved: atkDef.move };

  if (attackerWins) {
    delete newUnits[defender.id];
    const mul = cascadeMul(state);
    const drop = (1 + Math.floor(Math.random() * 3)) * mul;

    const traits = atkCiv.traits || {};
    if (traits.fuelGeneration === 'theft' && traits.stealOnAttack) {
      const defCiv = newCivs[defCivId];
      const available = Math.max(0, defCiv?.fuel ?? 0);
      const stolen = Math.min(traits.stealOnAttack, available);
      if (stolen > 0 && defCiv) {
        newCivs[atkCivId] = {
          ...newCivs[atkCivId],
          fuel: newCivs[atkCivId].fuel + stolen,
          stolenFuelTotal: (newCivs[atkCivId].stolenFuelTotal || 0) + stolen,
        };
        newCivs[defCivId] = {
          ...defCiv,
          fuel: defCiv.fuel - stolen,
        };
      }
    }

    if (ranged) {
      const t = newHexes[toKey];
      newHexes[toKey] = {
        ...t,
        unitId: null,
        scrapPile: (t.scrapPile || 0) + drop,
      };
    } else {
      newHexes[fromKey] = { ...newHexes[fromKey], unitId: null };
      const targetHex = newHexes[toKey];
      const captured = {
        ...targetHex,
        unitId: attacker.id,
        scrapPile: (targetHex.scrapPile || 0) + drop,
      };
      if (targetHex.cityOwnerId && targetHex.cityOwnerId !== atkCivId) {
        captured.cityOwnerId = atkCivId;
        captured.cityProgress = 0;
      }
      newHexes[toKey] = captured;
    }
  } else {
    delete newUnits[attacker.id];
    newHexes[fromKey] = { ...newHexes[fromKey], unitId: null };
  }
  return { ...state, units: newUnits, hexes: newHexes, civs: newCivs };
}

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

export function extractOil(state, hexKey, civId) {
  const hex = state.hexes[hexKey];
  if (!hex || hex.terrain !== TERRAIN.OIL) return state;
  if (hex.wasExtractedThisTurn) return state;
  const unit = hex.unitId ? state.units[hex.unitId] : null;
  if (!unit || unit.civId !== civId) return state;
  const civ = state.civs[civId];
  if (!civ) return state;
  return {
    ...state,
    civs: { ...state.civs, [civId]: { ...civ, fuel: (civ.fuel ?? 0) + 3 } },
    hexes: { ...state.hexes, [hexKey]: { ...hex, wasExtractedThisTurn: civId } },
  };
}

function findBaseHex(state, civId) {
  for (const [k, h] of Object.entries(state.hexes)) {
    if (!h.unitId) continue;
    const u = state.units[h.unitId];
    if (u && u.civId === civId && u.type === UNIT.BASE) return k;
  }
  return null;
}

export function deployUnit(state, civId, type) {
  const cost = DEPLOY_COSTS[type];
  if (cost == null) return state;
  const civ = state.civs[civId];
  if (!civ || (civ.fuel ?? 0) < cost) return state;
  const baseKey = findBaseHex(state, civId);
  if (!baseKey) return state;
  const { q, r } = parseKey(baseKey);
  const allowSlag = !!civ.traits?.slagMoveCost;
  let spawnKey = null;
  for (const n of NEIGHBORS) {
    const nq = q + n.q;
    const nr = r + n.r;
    if (!inBounds(nq, nr)) continue;
    const k = key(nq, nr);
    const h = state.hexes[k];
    if (!h || h.unitId) continue;
    if (!allowSlag && h.terrain === TERRAIN.SLAG) continue;
    spawnKey = k;
    break;
  }
  if (!spawnKey) return state;
  const newUnit = createUnit(type, civId);
  return {
    ...state,
    units: { ...state.units, [newUnit.id]: newUnit },
    civs: { ...state.civs, [civId]: { ...civ, fuel: civ.fuel - cost } },
    hexes: {
      ...state.hexes,
      [spawnKey]: { ...state.hexes[spawnKey], unitId: newUnit.id },
    },
  };
}

export function buildStation(state, hexKey, civId) {
  const hex = state.hexes[hexKey];
  if (!hex) return state;
  if (hex.station) return state;
  const civ = state.civs[civId];
  if (!civ) return state;
  const mod = civ.traits?.stationCostMod;
  if (mod == null && civ.traits?.canBuildStation === false) return state;
  const unit = hex.unitId ? state.units[hex.unitId] : null;
  if (!unit || unit.civId !== civId) return state;
  const cost = Math.max(1, Math.ceil(STATION_BASE_SCRAP * (mod ?? 1)));
  if ((civ.scrap ?? 0) < cost) return state;
  return {
    ...state,
    civs: { ...state.civs, [civId]: { ...civ, scrap: civ.scrap - cost } },
    hexes: { ...state.hexes, [hexKey]: { ...hex, station: { hp: 3, civId } } },
  };
}

export function repairUnit(state, hexKey, civId) {
  const hex = state.hexes[hexKey];
  if (!hex || !hex.unitId) return state;
  const unit = state.units[hex.unitId];
  if (!unit || unit.civId !== civId) return state;
  const civ = state.civs[civId];
  if (!civ || (civ.scrap ?? 0) < REPAIR_SCRAP_COST) return state;
  const def = UNIT_DEFS[unit.type];
  const maxHp = def?.hp ?? 3;
  if ((unit.hp ?? maxHp) >= maxHp) return state;
  const newHp = Math.min(maxHp, (unit.hp ?? 0) + REPAIR_HP_GAIN);
  return {
    ...state,
    units: { ...state.units, [unit.id]: { ...unit, hp: newHp } },
    civs: { ...state.civs, [civId]: { ...civ, scrap: civ.scrap - REPAIR_SCRAP_COST } },
  };
}

export function reclamationBomb(state, hexKey, civId) {
  const hex = state.hexes[hexKey];
  if (!hex || hex.terrain !== TERRAIN.SLAG) return state;
  const civ = state.civs[civId];
  if (!civ || civ.bombUsed) return state;
  if ((civ.fuel ?? 0) < BOMB_FUEL_COST) return state;
  if (hex.bombFuse) return state;
  return {
    ...state,
    civs: { ...state.civs, [civId]: { ...civ, fuel: civ.fuel - BOMB_FUEL_COST, bombUsed: true } },
    hexes: { ...state.hexes, [hexKey]: { ...hex, bombFuse: BOMB_FUSE_TURNS } },
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
