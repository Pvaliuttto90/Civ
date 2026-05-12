import { CIV_IDS } from './civs.js';
import { hexDistance, inBounds, key as hexKey, NEIGHBORS, parseKey } from './hex.js';
import { TERRAIN } from './terrain.js';
import { UNIT, UNIT_DEFS } from './units.js';
import {
  buildStation,
  canEnter,
  deployUnit,
  extractOil,
  findUnitLocation,
  moveUnit,
  reclamationBomb,
  repairUnit,
  resolveAttack,
  terrainCost,
} from './actions.js';
import { effectiveAtk, effectiveDef } from './combat.js';

const AI_UNIT_CAP = 4;

function combatTarget(state, unit) {
  const loc = findUnitLocation(state.hexes, unit.id);
  if (!loc) return null;
  const from = parseKey(loc);
  let best = null;
  let bestDist = Infinity;

  // Prefer enemy Bases first — destroying an HQ wins a faction war.
  for (const u of Object.values(state.units)) {
    if (u.civId === unit.civId) continue;
    if (u.type !== UNIT.BASE) continue;
    const oloc = findUnitLocation(state.hexes, u.id);
    if (!oloc) continue;
    const d = hexDistance(from, parseKey(oloc));
    if (d < bestDist) {
      bestDist = d;
      best = oloc;
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

function oilTarget(state, unit) {
  const loc = findUnitLocation(state.hexes, unit.id);
  if (!loc) return null;
  const from = parseKey(loc);
  let best = null;
  let bestDist = Infinity;
  for (const [k, hex] of Object.entries(state.hexes)) {
    if (hex.terrain !== TERRAIN.OIL) continue;
    if (hex.unitId && hex.unitId !== unit.id) continue;
    const d = hexDistance(from, parseKey(k));
    if (d < bestDist) {
      bestDist = d;
      best = k;
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
    if (def?.immobile) return s;
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
      const atk = effectiveAtk(u, s.civs, fromKey, s.hexes);
      const defVal = effectiveDef(best.occupant, best.hex, s.civs);
      const civ = s.civs[u.civId];
      if (atk >= defVal * 0.85 && (civ?.fuel ?? 0) >= 2) {
        s = resolveAttack(s, u, best.occupant, fromKey, best.key);
      }
      return s;
    }
    if (!canEnter(s, best.hex, u)) return s;
    s = moveUnit(s, u, fromKey, best.key, best.cost);
  }
  return s;
}

export function runAI(state) {
  let s = state;
  const playerCivId = s.playerCivId;
  for (const civId of CIV_IDS) {
    if (civId === playerCivId) continue;
    const civ = s.civs[civId];
    if (!civ || civ.isEliminated) continue;

    // Deploy a Warrior if there's fuel and not too many units already.
    const ownNonBase = Object.values(s.units).filter(
      (u) => u.civId === civId && u.type !== UNIT.BASE
    ).length;
    if (ownNonBase < AI_UNIT_CAP && (s.civs[civId]?.fuel ?? 0) >= 3) {
      s = deployUnit(s, civId, UNIT.WARRIOR);
    }

    // Engineers: build a station on a high-pollution hex they occupy.
    if (civ.traits?.stationCostMod) {
      for (const [k, h] of Object.entries(s.hexes)) {
        if (!h.unitId) continue;
        const u = s.units[h.unitId];
        if (!u || u.civId !== civId) continue;
        if (h.station) continue;
        if ((h.pollution ?? 0) < 2) continue;
        s = buildStation(s, k, civId);
        break;
      }
    }

    // Extract oil on every owned oil hex.
    for (const [k, h] of Object.entries(s.hexes)) {
      if (h.terrain !== TERRAIN.OIL || h.wasExtractedThisTurn) continue;
      if (!h.unitId) continue;
      const u = s.units[h.unitId];
      if (!u || u.civId !== civId) continue;
      s = extractOil(s, k, civId);
    }

    // Repair badly hurt units.
    for (const [k, h] of Object.entries(s.hexes)) {
      if (!h.unitId) continue;
      const u = s.units[h.unitId];
      if (!u || u.civId !== civId) continue;
      const def = UNIT_DEFS[u.type];
      if ((u.hp ?? def.hp) <= 1 && (s.civs[civId]?.scrap ?? 0) >= 2) {
        s = repairUnit(s, k, civId);
      }
    }

    // Reclamation Bomb on the worst-polluted slag if we can afford it.
    if (!s.civs[civId]?.bombUsed && (s.civs[civId]?.fuel ?? 0) >= 12) {
      let worst = null;
      for (const [k, h] of Object.entries(s.hexes)) {
        if (h.terrain !== TERRAIN.SLAG) continue;
        if (h.bombFuse) continue;
        worst = k;
        break;
      }
      if (worst) s = reclamationBomb(s, worst, civId);
    }

    // Walk units toward enemy bases / oil.
    const unitIds = Object.values(s.units)
      .filter((u) => u.civId === civId && u.type !== UNIT.BASE)
      .map((u) => u.id);
    for (const uid of unitIds) {
      const u = s.units[uid];
      if (!u) continue;
      const wantOil = (s.civs[civId]?.fuel ?? 0) < 6;
      const tgt = wantOil
        ? oilTarget(s, u) || combatTarget(s, u)
        : combatTarget(s, u) || oilTarget(s, u);
      if (tgt) s = stepToward(s, uid, tgt);
    }
  }
  return s;
}
