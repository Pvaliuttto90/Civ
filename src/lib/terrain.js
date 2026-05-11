import { key, MAP_COLS, MAP_ROWS } from './hex.js';

export const TERRAIN = {
  PLAINS: 'plains',
  FOREST: 'forest',
  MOUNTAIN: 'mountain',
  WATER: 'water',
};

export const TERRAIN_COLORS = {
  [TERRAIN.PLAINS]: '#4a7c59',
  [TERRAIN.FOREST]: '#2d5a27',
  [TERRAIN.MOUNTAIN]: '#6b6b6b',
  [TERRAIN.WATER]: '#1e3a5f',
};

export const TERRAIN_COST = {
  [TERRAIN.PLAINS]: 1,
  [TERRAIN.FOREST]: 1.5,
  [TERRAIN.MOUNTAIN]: 2,
  [TERRAIN.WATER]: Infinity,
};

// Weighted bag for ~50% plains, 20% forest, 15% mountain, 15% water.
const BAG = [
  ...Array(50).fill(TERRAIN.PLAINS),
  ...Array(20).fill(TERRAIN.FOREST),
  ...Array(15).fill(TERRAIN.MOUNTAIN),
  ...Array(15).fill(TERRAIN.WATER),
];

export function generateMap() {
  const hexes = {};
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let q = 0; q < MAP_COLS; q++) {
      const t = BAG[Math.floor(Math.random() * BAG.length)];
      hexes[key(q, r)] = { terrain: t, cityOwnerId: null, unitId: null };
    }
  }
  return hexes;
}
