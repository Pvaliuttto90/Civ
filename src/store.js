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
import {
  applyUpkeep,
  resolveIncomePhase,
  resolvePollutionPhase,
} from './lib/upkeep.js';
import { withVictoryCheck } from './lib/victory.js';
import { withFogUpdate } from './lib/fog.js';

const AI_DELAY_MS = 220;

export const useGame = create((set, get) => ({
  ...buildInitialState(),
  turn: 1,
  phase: 'faction-pick',
  selectedHex: null,
  techModalOpen: false,
  result: null,
  playerCivId: null,

  pickFaction: (factionId) => {
    const s = get();
    if (s.phase !== 'faction-pick') return;
    if (!s.civs[factionId]) return;
    const civs = { ...s.civs };
    for (const id of Object.keys(civs)) {
      civs[id] = { ...civs[id], isPlayer: id === factionId };
    }
    let startingHex = null;
    for (const [k, h] of Object.entries(s.hexes)) {
      if (h.unitId && s.units[h.unitId]?.civId === factionId) {
        startingHex = k;
        break;
      }
    }
    let next = { ...s, civs, playerCivId: factionId, phase: 'player' };
    // Turn 1's income phase fires before the player gets to act.
    next = resolveIncomePhase(next);
    next = withFogUpdate(next, factionId);
    set({ ...next, selectedHex: startingHex });
  },

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
                set(
                  withVictoryCheck({
                    ...next,
                    selectedHex: attackerSurvived
                      ? ranged
                        ? fromKey
                        : toKey
                      : null,
                  })
                );
                return;
              }
            } else if (!targetUnit && target.terrain !== TERRAIN.SLAG) {
              const cost = TERRAIN_COST[target.terrain];
              if (moveLeft >= cost) {
                const next = moveUnit(s, myUnit, fromKey, toKey, cost);
                set(withVictoryCheck({ ...next, selectedHex: toKey }));
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
      return withVictoryCheck(foundCityAt(s, hexKey, unit.civId));
    }),

  setTechModalOpen: (open) => set({ techModalOpen: open }),

  researchTech: (techId) =>
    set((s) => {
      const playerCivId = s.playerCivId;
      const civ = playerCivId ? s.civs[playerCivId] : null;
      if (!civ || !canResearch(civ, techId)) return s;
      const cost = ERA_COSTS[TECHS[techId].era];
      return {
        civs: {
          ...s.civs,
          [playerCivId]: {
            ...civ,
            gold: civ.gold - cost,
            techs: [...civ.techs, techId],
          },
        },
      };
    }),

  // End-of-turn pipeline. Order:
  //   1. AI Action phase (player has just finished theirs).
  //   2. Pollution Phase — oil ticks, slag conversion at 5.
  //   3. Legacy upkeep — gold/production/move reset/elimination.
  //   4. Advance turn counter.
  //   5. Event Phase (commit 4 will wire this slot).
  //   6. Income Phase for the new turn — fuel/scrap/ichor and ichor damage.
  //   7. Victory check + player fog update.
  endTurn: () => {
    const s = get();
    if (s.phase !== 'player') return;
    set({ phase: 'ai', selectedHex: null });
    setTimeout(() => {
      const cur = get();
      if (cur.phase !== 'ai') return;

      let next = cur;
      next = runAI(next);
      next = resolvePollutionPhase(next);
      next = applyUpkeep(next);
      next = { ...next, turn: cur.turn + 1 };
      // resolveEventPhase slot — commit 4.
      next = resolveIncomePhase(next);
      next = withVictoryCheck({
        ...next,
        phase: 'player',
        selectedHex: null,
      });
      set(next);
    }, AI_DELAY_MS);
  },

  reset: () =>
    set({
      ...buildInitialState(),
      turn: 1,
      phase: 'faction-pick',
      selectedHex: null,
      techModalOpen: false,
      result: null,
      playerCivId: null,
    }),
}));
