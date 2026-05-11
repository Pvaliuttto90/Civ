import { create } from 'zustand';
import { generateMap } from './lib/terrain.js';

export const useGame = create((set) => ({
  hexes: generateMap(),
  units: {},
  civs: {},
  turn: 1,
  phase: 'player',
  selectedHex: null,

  selectHex: (key) =>
    set((s) => ({ selectedHex: s.selectedHex === key ? null : key })),

  regenerate: () =>
    set({
      hexes: generateMap(),
      units: {},
      civs: {},
      turn: 1,
      phase: 'player',
      selectedHex: null,
    }),
}));
