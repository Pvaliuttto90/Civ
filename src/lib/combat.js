import { UNIT_DEFS } from './units.js';
import { TERRAIN } from './terrain.js';
import { key, neighbors, parseKey } from './hex.js';

export function effectiveAtk(attacker, civs, attackerHexKey, hexes) {
  const def = UNIT_DEFS[attacker.type];
  let atk = def.atk;
  const civ = civs[attacker.civId];
  if (civ?.techs?.includes('nationalism')) atk += 1;

  // Blight: +N attack per adjacent slag hex.
  const slagBonus = civ?.traits?.bonusAttackPerAdjacentSlag;
  if (slagBonus && attackerHexKey && hexes) {
    const { q, r } = parseKey(attackerHexKey);
    let slagAdj = 0;
    for (const n of neighbors(q, r)) {
      const k = key(n.q, n.r);
      if (hexes[k]?.terrain === TERRAIN.SLAG) slagAdj++;
    }
    atk += slagAdj * slagBonus;
  }
  return atk;
}

export function effectiveDef(defender, hex, civs) {
  const def = UNIT_DEFS[defender.type];
  let d = def.def;
  if (hex.cityOwnerId && hex.cityOwnerId === defender.civId) {
    const owner = civs[hex.cityOwnerId];
    if (owner?.techs?.includes('masonry')) d += 1;
    if (owner?.techs?.includes('fortification')) d += 2;
  }
  return d;
}

export function rollCombat(atk, def) {
  const a = atk * (0.7 + Math.random() * 0.6);
  const d = def * (0.7 + Math.random() * 0.6);
  return a > d;
}
