import { UNIT_DEFS } from './units.js';

export function effectiveAtk(attacker, civs) {
  const def = UNIT_DEFS[attacker.type];
  let atk = def.atk;
  const civ = civs[attacker.civId];
  if (civ?.techs.includes('nationalism')) atk += 1;
  return atk;
}

export function effectiveDef(defender, hex, civs) {
  const def = UNIT_DEFS[defender.type];
  let d = def.def;
  if (hex.cityOwnerId && hex.cityOwnerId === defender.civId) {
    const owner = civs[hex.cityOwnerId];
    if (owner?.techs.includes('masonry')) d += 1;
    if (owner?.techs.includes('fortification')) d += 2;
  }
  return d;
}

// Resolve a single attack roll. Returns true if attacker wins.
export function rollCombat(atk, def) {
  const a = atk * (0.7 + Math.random() * 0.6);
  const d = def * (0.7 + Math.random() * 0.6);
  return a > d;
}
