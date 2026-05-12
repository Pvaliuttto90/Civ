export const UNIT = {
  SETTLER: 'settler',
  WARRIOR: 'warrior',
  ARCHER: 'archer',
  KNIGHT: 'knight',
};

// hp added so ichor damage in the income phase actually means something.
// Combat is still one-roll-decisive in actions.js — hp only changes via
// non-combat damage sources for now (ichor seep, reclaimer death).
export const UNIT_DEFS = {
  [UNIT.SETTLER]: { name: 'Settler', atk: 0, def: 1, move: 2, hp: 2, glyph: 'S' },
  [UNIT.WARRIOR]: { name: 'Warrior', atk: 2, def: 2, move: 2, hp: 3, glyph: 'W' },
  [UNIT.ARCHER]: { name: 'Archer', atk: 3, def: 1, move: 2, hp: 2, ranged: true, glyph: 'A' },
  [UNIT.KNIGHT]: { name: 'Knight', atk: 4, def: 3, move: 3, hp: 4, glyph: 'K' },
};

let nextUnitId = 1;
export function newUnitId() {
  return `u${nextUnitId++}`;
}

export function createUnit(type, civId) {
  const def = UNIT_DEFS[type];
  return {
    id: newUnitId(),
    type,
    civId,
    hp: def?.hp ?? 3,
    moved: 0,
  };
}

export function pickBestUnitType(techs) {
  if (techs.includes('chivalry')) return UNIT.KNIGHT;
  if (techs.includes('archery')) return UNIT.ARCHER;
  return UNIT.WARRIOR;
}
