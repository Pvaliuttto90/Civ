import { CIV_IDS, CIVS } from './civs.js';
import { generateMap, TERRAIN } from './terrain.js';
import { hexDistance, parseKey } from './hex.js';
import { createUnit, UNIT } from './units.js';

// Terrains a starting unit can stand on. Slag/river are excluded so
// no faction begins stranded or in a deathzone.
const STARTABLE = new Set([
  TERRAIN.WILDERNESS,
  TERRAIN.RUINS,
  TERRAIN.OIL,
  TERRAIN.BADLANDS,
]);

// Build a fresh game state: map + one starter unit per faction, spaced
// out. Fog is not initialised here — the player isn't chosen until
// pickFaction runs, which then computes the player's first vision.
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
        fuel: 0,
        scrap: 0,
        ichor: 0,
        sightRange: def.sightRange ?? 2,
        stolenFuelTotal: 0,
        bombUsed: false,
        traits: { ...def.traits },
      };
      const u = createUnit(UNIT.SETTLER, civId);
      units[u.id] = u;
      hexes[picks[i]] = { ...hexes[picks[i]], unitId: u.id };
    }
    return { hexes, units, civs };
  }
  return { hexes: generateMap(), units: {}, civs: {} };
}
