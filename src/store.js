import { create } from 'zustand';
import { buildInitialState } from './lib/init.js';
import { UNIT, UNIT_DEFS } from './lib/units.js';
import { TERRAIN, TERRAIN_COST } from './lib/terrain.js';
import { hexDistance, parseKey } from './lib/hex.js';
import {
  foundCityAt,
  moveUnit,
  resolveAttack,
} from './lib/actions.js';
import { canResearch, ERA_COSTS, TECHS } from './lib/tech.js';
import { runAI } from './lib/ai.js';
import { applyUpkeep } from './lib/upkeep.js';

export const useGame = create((set, get) => ({
  ...buildInitialState(),
  turn: 1,
  phase: 'player',
  selectedHex: null,
  techModalOpen: false,

  tapHex: (toKey) => {
    const s = get();
    if (s.phase !== 'player') return;
    const target = s.hexes[toKey];
    if (!target) return;

    const fromKey = s.selectedHex;
    if (fromKey && fromKey !== toKey) {
      const fromHex = s.hexes[fromKey];
      const myUnit = fromHex?.unitId ? s.units[fromHex.unitId] : null;
      if (myUnit && s.civs[myUnit.civId]?.isPlayer) {
        const dist = hexDistance(parseKey(fromKey), parseKey(toKey));
        if (dist === 1) {
          const def = UNIT_DEFS[myUnit.type];
          const moveLeft = def.move - myUnit.moved;
          if (moveLeft > 0) {
            const targetUnit = target.unitId ? s.units[target.unitId] : null;
            if (targetUnit && targetUnit.civId !== myUnit.civId) {
              if (myUnit.type !== UNIT.SETTLER) {
                const next = resolveAttack(s, myUnit, targetUnit, fromKey, toKey);
                const attackerSurvived = !!next.units[myUnit.id];
                const ranged = !!def.ranged;
                set({
                  ...next,
                  selectedHex: attackerSurvived ? (ranged ? fromKey : toKey) : null,
                });
                return;
              }
            } else if (!targetUnit && target.terrain !== TERRAIN.WATER) {
              const cost = TERRAIN_COST[target.terrain];
              if (moveLeft >= cost) {
                const next = moveUnit(s, myUnit, fromKey, toKey, cost);
                set({ ...next, selectedHex: toKey });
                return;
              }
            }
          }
        }
      }
    }
    set({ selectedHex: toKey === s.selectedHex ? null : toKey });
  },

  foundCity: (hexKey) =>
    set((s) => {
      const hex = s.hexes[hexKey];
      const unit = hex?.unitId ? s.units[hex.unitId] : null;
      if (!unit) return s;
      return foundCityAt(s, hexKey, unit.civId);
    }),

  setTechModalOpen: (open) => set({ techModalOpen: open }),

  researchTech: (techId) =>
    set((s) => {
      const civ = s.civs.player;
      if (!civ || !canResearch(civ, techId)) return s;
      const cost = ERA_COSTS[TECHS[techId].era];
      return {
        civs: {
          ...s.civs,
          player: {
            ...civ,
            gold: civ.gold - cost,
            techs: [...civ.techs, techId],
          },
        },
      };
    }),

  endTurn: () => {
    const s = get();
    if (s.phase !== 'player') return;
    set({ phase: 'ai', selectedHex: null });
    const afterAI = runAI(get());
    const afterUpkeep = applyUpkeep(afterAI);
    set({
      ...afterUpkeep,
      turn: s.turn + 1,
      phase: 'player',
      selectedHex: null,
    });
  },

  reset: () =>
    set({
      ...buildInitialState(),
      turn: 1,
      phase: 'player',
      selectedHex: null,
      techModalOpen: false,
    }),
}));
