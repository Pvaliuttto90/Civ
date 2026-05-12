import { key, MAP_COLS, MAP_ROWS } from './hex.js';

export const TERRAIN = {
  WILDERNESS: 'wilderness',
  BADLANDS: 'badlands',
  RIVER: 'river',
  OIL: 'oil',
  RUINS: 'ruins',
  SLAG: 'slag',
};

export const TERRAIN_COLORS = {
  [TERRAIN.WILDERNESS]: '#5a6b3f',
  [TERRAIN.BADLANDS]: '#7a5c40',
  [TERRAIN.RIVER]: '#3a5a7a',
  [TERRAIN.OIL]: '#2a2a1f',
  [TERRAIN.RUINS]: '#6b6b6b',
  [TERRAIN.SLAG]: '#3a1a1a',
};

export const TERRAIN_COST = {
  [TERRAIN.WILDERNESS]: 1,
  [TERRAIN.BADLANDS]: 2,
  [TERRAIN.RIVER]: 1.5,
  [TERRAIN.OIL]: 1,
  [TERRAIN.RUINS]: 1,
  [TERRAIN.SLAG]: Infinity,
};

// Weighted bag matching the spec: 30/20/10/20/12/8.
const BAG = [
  ...Array(30).fill(TERRAIN.WILDERNESS),
  ...Array(20).fill(TERRAIN.BADLANDS),
  ...Array(10).fill(TERRAIN.RIVER),
  ...Array(20).fill(TERRAIN.OIL),
  ...Array(12).fill(TERRAIN.RUINS),
  ...Array(8).fill(TERRAIN.SLAG),
];

export function generateMap() {
  const hexes = {};
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let q = 0; q < MAP_COLS; q++) {
      const t = BAG[Math.floor(Math.random() * BAG.length)];
      hexes[key(q, r)] = {
        terrain: t,
        cityOwnerId: null,
        unitId: null,
        pollution: t === TERRAIN.SLAG ? 5 : 0,
        wasExtractedThisTurn: false,
        bombFuse: null,
        preSlagTerrain: t === TERRAIN.SLAG ? TERRAIN.RUINS : null,
        station: null,
        rail: false,
      };
    }
  }
  return hexes;
}
