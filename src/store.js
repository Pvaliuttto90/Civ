import { create } from 'zustand';
import { buildInitialState } from './lib/init.js';
import { UNIT } from './lib/units.js';
import { TERRAIN } from './lib/terrain.js';

export const useGame = create((set, get) => ({
  ...buildInitialState(),
  turn: 1,
  phase: 'player', // 'player' | 'ai' | 'result'
  selectedHex: null,

  selectHex: (k) =>
    set((s) => ({ selectedHex: s.selectedHex === k ? null : k })),

  foundCity: (hexKey) =>
    set((s) => {
      const hex = s.hexes[hexKey];
      if (!hex) return s;
      if (hex.terrain !== TERRAIN.PLAINS) return s;
      const unit = hex.unitId ? s.units[hex.unitId] : null;
      if (!unit || unit.type !== UNIT.SETTLER) return s;
      if (!unit.civId || s.civs[unit.civId]?.isEliminated) return s;
      if (hex.cityOwnerId) return s;

      // Consume the settler; place a city owned by the settler's civ.
      const newUnits = { ...s.units };
      delete newUnits[unit.id];
      return {
        units: newUnits,
        hexes: {
          ...s.hexes,
          [hexKey]: { ...hex, unitId: null, cityOwnerId: unit.civId },
        },
      };
    }),

  reset: () =>
    set({
      ...buildInitialState(),
      turn: 1,
      phase: 'player',
      selectedHex: null,
    }),
}));
