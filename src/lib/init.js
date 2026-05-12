import { CIV_IDS, CIVS } from './civs.js';
import { generateMap, TERRAIN } from './terrain.js';
import { hexDistance, inBounds, key, NEIGHBORS, parseKey } from './hex.js';
import { createUnit, UNIT } from './units.js';

const STARTABLE = new Set([
  TERRAIN.WILDERNESS,
  TERRAIN.RUINS,
  TERRAIN.OIL,
  TERRAIN.BADLANDS,
]);

const STARTING_FUEL = 10;
const STARTING_SCRAP = 4;

function findAdjacentEmpty(hexes, hexKey, allowSlag = false) {
  const { q, r } = parseKey(hexKey);
  for (const n of NEIGHBORS) {
    const nq = q + n.q;
    const nr = r + n.r;
    if (!inBounds(nq, nr)) continue;
    const k = key(nq, nr);
    const h = hexes[k];
    if (!h || h.unitId) continue;
    if (!allowSlag && h.terrain === TERRAIN.SLAG) continue;
    return k;
  }
  return null;
}

export function buildInitialState() {
  for (let attempt = 0; attempt < 30; attempt++) {
    const hexes = generateMap();
    const startable = Object.entries(hexes)
      .filter(([, h]) => STARTABLE.has(h.terrain))
      .map(([k]) => k);
    if (startable.length < CIV_IDS.length * 4) continue;

    const picks = [];
    const pool = [...startable];
    let ok = true;
    for (let i = 0; i < CIV_IDS.length; i++) {
      let chosen = null;
      for (let tries = 0; tries < 80 && pool.length; tries++) {
        const idx = Math.floor(Math.random() * pool.length);
        const candidate = pool[idx];
        const c = parseKey(candidate);
        const tooClose = picks.some(
          (p) => hexDistance(parseKey(p), c) < 3
        );
        if (!tooClose) {
          chosen = candidate;
          pool.splice(idx, 1);
          break;
        }
        pool.splice(idx, 1);
      }
      if (!chosen) { ok = false; break; }
      picks.push(chosen);
    }
    if (!ok) continue;

    const units = {};
    const civs = {};
    for (let i = 0; i < CIV_IDS.length; i++) {
      const civId = CIV_IDS[i];
      const def = CIVS[civId];
      civs[civId] = {
        id: civId,
        name: def.name,
        color: def.color,
        isPlayer: false,
        gold: 0,
        techs: [],
        isEliminated: false,
        explored: [],
        fuel: STARTING_FUEL,
        scrap: STARTING_SCRAP,
        ichor: 0,
        sightRange: def.sightRange ?? 2,
        stolenFuelTotal: 0,
        bombUsed: false,
        traits: { ...def.traits },
      };
      const base = createUnit(UNIT.BASE, civId);
      units[base.id] = base;
      hexes[picks[i]] = { ...hexes[picks[i]], unitId: base.id };

      const adj = findAdjacentEmpty(hexes, picks[i], !!def.traits?.slagMoveCost);
      if (adj) {
        const warrior = createUnit(UNIT.WARRIOR, civId);
        units[warrior.id] = warrior;
        hexes[adj] = { ...hexes[adj], unitId: warrior.id };
      }
    }
    return { hexes, units, civs };
  }
  return { hexes: generateMap(), units: {}, civs: {} };
}
