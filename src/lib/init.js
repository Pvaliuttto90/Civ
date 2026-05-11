import { CIV_IDS, CIVS } from './civs.js';
import { generateMap, TERRAIN } from './terrain.js';
import { hexDistance, key as hexKey, parseKey } from './hex.js';
import { createUnit, UNIT } from './units.js';

// Build the starting game state: terrain + one Settler per civ on a
// random plains hex, with no two starts within 3 hexes of each other.
export function buildInitialState() {
  // Try a few times to find a valid placement set; regenerate map if not.
  for (let attempt = 0; attempt < 20; attempt++) {
    const hexes = generateMap();
    const plains = Object.entries(hexes)
      .filter(([, h]) => h.terrain === TERRAIN.PLAINS)
      .map(([k]) => k);
    if (plains.length < CIV_IDS.length * 4) continue;

    const picks = [];
    const pool = [...plains];
    let ok = true;
    for (let i = 0; i < CIV_IDS.length; i++) {
      let chosen = null;
      for (let tries = 0; tries < 60 && pool.length; tries++) {
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
      if (!chosen) {
        ok = false;
        break;
      }
      picks.push(chosen);
    }
    if (!ok) continue;

    const units = {};
    const civs = {};
    for (let i = 0; i < CIV_IDS.length; i++) {
      const civId = CIV_IDS[i];
      civs[civId] = {
        id: civId,
        name: CIVS[civId].name,
        color: CIVS[civId].color,
        isPlayer: CIVS[civId].isPlayer,
        gold: 0,
        techs: [],
        isEliminated: false,
      };
      const u = createUnit(UNIT.SETTLER, civId);
      units[u.id] = u;
      hexes[picks[i]] = { ...hexes[picks[i]], unitId: u.id };
    }
    return { hexes, units, civs };
  }
  // Last-resort fallback: blank map.
  return { hexes: generateMap(), units: {}, civs: {} };
}
