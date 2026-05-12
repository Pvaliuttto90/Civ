import { CIV_IDS } from './civs.js';
import { hexDistance, inBounds, key as hexKey, NEIGHBORS, parseKey } from './hex.js';
import { TERRAIN } from './terrain.js';
import { UNIT, UNIT_DEFS } from './units.js';
import {
  canEnter,
  findUnitLocation,
  foundCityAt,
  moveUnit,
  resolveAttack,
  terrainCost,
} from './actions.js';
import { effectiveAtk, effectiveDef } from './combat.js';
import { canResearch, currentEra, ERA_COSTS, TECHS_BY_ERA } from './tech.js';

// Legacy tech priorities — dormant once tech tree is stripped, but
// kept keyed by the new faction ids so research doesn't crash.
const AI_TECH_PRIORITY = {
  syndicate: ['agriculture', 'trade', 'commerce', 'masonry', 'fortification', 'archery', 'chivalry', 'industrialism', 'nationalism'],
  blight: ['archery', 'masonry', 'agriculture', 'chivalry', 'fortification', 'trade', 'industrialism', 'nationalism', 'commerce'],
  engineers: ['agriculture', 'masonry', 'archery', 'trade', 'fortification', 'chivalry', 'commerce', 'industrialism', 'nationalism'],
  runners: ['archery', 'chivalry', 'nationalism', 'agriculture', 'masonry', 'trade', 'fortification', 'industrialism', 'commerce'],
};

function settlerTarget(state, unit) {
  const loc = findUnitLocation(state.hexes, unit.id);
  if (!loc) return null;
  const here = state.hexes[loc];
  if (here.terrain === TERRAIN.WILDERNESS && !here.cityOwnerId) return loc;
  const from = parseKey(loc);
  let best = null;
  let bestDist = Infinity;
  for (const [k, hex] of Object.entries(state.hexes)) {
    if (hex.terrain !== TERRAIN.WILDERNESS) continue;
    if (hex.cityOwnerId) continue;
    if (hex.unitId && hex.unitId !== unit.id) continue;
    const d = hexDistance(from, parseKey(k));
    if (d < bestDist) {
      bestDist = d;
      best = k;
    }
  }
  return best;
}

function combatTarget(state, unit) {
  const loc = findUnitLocation(state.hexes, unit.id);
  if (!loc) return null;
  const from = parseKey(loc);
  let best = null;
  let bestDist = Infinity;
  for (const [k, hex] of Object.entries(state.hexes)) {
    if (!hex.cityOwnerId || hex.cityOwnerId === unit.civId) continue;
    const d = hexDistance(from, parseKey(k));
    if (d < bestDist) {
      bestDist = d;
      best = k;
    }
  }
  if (best) return best;
  for (const u of Object.values(state.units)) {
    if (u.civId === unit.civId) continue;
    const oloc = findUnitLocation(state.hexes, u.id);
    if (!oloc) continue;
    const d = hexDistance(from, parseKey(oloc));
    if (d < bestDist) {
      bestDist = d;
      best = oloc;
    }
  }
  return best;
}

function stepToward(state, unitId, targetKey) {
  let s = state;
  let guard = 8;
  while (guard-- > 0) {
    const u = s.units[unitId];
    if (!u) return s;
    const def = UNIT_DEFS[u.type];
    const moveLeft = def.move - u.moved;
    if (moveLeft <= 0) return s;
    const fromKey = findUnitLocation(s.hexes, unitId);
    if (!fromKey || fromKey === targetKey) return s;
    const from = parseKey(fromKey);
    const tgt = parseKey(targetKey);

    let best = null;
    let bestScore = Infinity;
    for (const n of NEIGHBORS) {
      const c = { q: from.q + n.q, r: from.r + n.r };
      if (!inBounds(c.q, c.r)) continue;
      const k = hexKey(c.q, c.r);
      const hex = s.hexes[k];
      if (!hex) continue;
      const cost = terrainCost(hex, u, s);
      if (!isFinite(cost)) continue;
      const occupant = hex.unitId ? s.units[hex.unitId] : null;
      if (occupant && occupant.civId === u.civId) continue;
      const isEnemy = !!(occupant && occupant.civId !== u.civId);
      if (!isEnemy && cost > moveLeft) continue;
      const d = hexDistance(c, tgt);
      const score = d * 10 + cost;
      if (score < bestScore) {
        bestScore = score;
        best = { key: k, hex, occupant, isEnemy, cost };
      }
    }
    if (!best) return s;

    if (best.isEnemy) {
      if (u.type === UNIT.SETTLER) return s;
      const atk = effectiveAtk(u, s.civs);
      const defVal = effectiveDef(best.occupant, best.hex, s.civs);
      if (atk >= defVal * 0.85) {
        s = resolveAttack(s, u, best.occupant, fromKey, best.key);
      }
      return s;
    }
    if (!canEnter(s, best.hex, u)) return s;
    s = moveUnit(s, u, fromKey, best.key, best.cost);
  }
  return s;
}

function researchIfPossible(state, civId) {
  const civ = state.civs[civId];
  if (!civ || civ.isEliminated) return state;
  const era = currentEra(civ);
  const cost = ERA_COSTS[era];
  if (civ.gold < cost) return state;
  const priority = AI_TECH_PRIORITY[civId] || TECHS_BY_ERA[era];
  const next = priority.find((t) => canResearch(civ, t));
  if (!next) return state;
  return {
    ...state,
    civs: {
      ...state.civs,
      [civId]: {
        ...civ,
        gold: civ.gold - cost,
        techs: [...civ.techs, next],
      },
    },
  };
}

export function runAI(state) {
  let s = state;
  const playerCivId = s.playerCivId;
  for (const civId of CIV_IDS) {
    if (civId === playerCivId) continue;
    const civ = s.civs[civId];
    if (!civ || civ.isEliminated) continue;

    const unitIds = Object.values(s.units)
      .filter((u) => u.civId === civId)
      .map((u) => u.id);
    for (const uid of unitIds) {
      let u = s.units[uid];
      if (!u) continue;
      if (u.type === UNIT.SETTLER) {
        const loc = findUnitLocation(s.hexes, uid);
        const hex = loc ? s.hexes[loc] : null;
        if (hex && hex.terrain === TERRAIN.WILDERNESS && !hex.cityOwnerId) {
          s = foundCityAt(s, loc, civId);
          continue;
        }
        const tgt = settlerTarget(s, u);
        if (tgt && tgt !== loc) s = stepToward(s, uid, tgt);
        u = s.units[uid];
        if (u) {
          const loc2 = findUnitLocation(s.hexes, uid);
          const hex2 = loc2 ? s.hexes[loc2] : null;
          if (hex2 && hex2.terrain === TERRAIN.WILDERNESS && !hex2.cityOwnerId) {
            s = foundCityAt(s, loc2, civId);
          }
        }
      } else {
        const tgt = combatTarget(s, u);
        if (tgt) s = stepToward(s, uid, tgt);
      }
    }

    s = researchIfPossible(s, civId);
  }
  return s;
}
