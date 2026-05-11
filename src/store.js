import { create } from 'zustand';
import { buildInitialState } from './lib/init.js';
import { createUnit, pickBestUnitType, UNIT, UNIT_DEFS } from './lib/units.js';
import { TERRAIN, TERRAIN_COST } from './lib/terrain.js';
import { hexDistance, parseKey } from './lib/hex.js';
import { effectiveAtk, effectiveDef, rollCombat } from './lib/combat.js';
import { canResearch, ERA_COSTS, TECHS } from './lib/tech.js';

function goldPerCity(civ) {
  let g = 1;
  if (civ.techs.includes('agriculture')) g += 1;
  if (civ.techs.includes('trade')) g += 2;
  if (civ.techs.includes('commerce')) g += 3;
  return g;
}

function productionRate(civ) {
  return civ.techs.includes('industrialism') ? 1.5 : 1;
}

function moveUnit(state, unit, fromKey, toKey, cost) {
  const newUnits = { ...state.units };
  newUnits[unit.id] = { ...unit, moved: unit.moved + cost };
  const newHexes = { ...state.hexes };
  const fromHex = newHexes[fromKey];
  const targetHex = newHexes[toKey];
  newHexes[fromKey] = { ...fromHex, unitId: null };
  const nextTarget = { ...targetHex, unitId: unit.id };
  if (targetHex.cityOwnerId && targetHex.cityOwnerId !== unit.civId) {
    nextTarget.cityOwnerId = unit.civId;
    nextTarget.cityProgress = 0;
  }
  newHexes[toKey] = nextTarget;
  return { units: newUnits, hexes: newHexes };
}

function resolveAttack(state, attacker, defender, fromKey, toKey) {
  const atkDef = UNIT_DEFS[attacker.type];
  const atk = effectiveAtk(attacker, state.civs);
  const def = effectiveDef(defender, state.hexes[toKey], state.civs);
  const attackerWins = rollCombat(atk, def);
  const ranged = !!atkDef.ranged;

  const newUnits = { ...state.units };
  const newHexes = { ...state.hexes };
  newUnits[attacker.id] = { ...attacker, moved: atkDef.move };

  let nextSelected = state.selectedHex;
  if (attackerWins) {
    delete newUnits[defender.id];
    if (ranged) {
      newHexes[toKey] = { ...newHexes[toKey], unitId: null };
      nextSelected = fromKey;
    } else {
      newHexes[fromKey] = { ...newHexes[fromKey], unitId: null };
      const targetHex = newHexes[toKey];
      const captured = { ...targetHex, unitId: attacker.id };
      if (targetHex.cityOwnerId && targetHex.cityOwnerId !== attacker.civId) {
        captured.cityOwnerId = attacker.civId;
        captured.cityProgress = 0;
      }
      newHexes[toKey] = captured;
      nextSelected = toKey;
    }
  } else {
    delete newUnits[attacker.id];
    newHexes[fromKey] = { ...newHexes[fromKey], unitId: null };
    nextSelected = null;
  }
  return { units: newUnits, hexes: newHexes, selectedHex: nextSelected };
}

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
                set(resolveAttack(s, myUnit, targetUnit, fromKey, toKey));
                return;
              }
            } else if (!targetUnit && target.terrain !== TERRAIN.WATER) {
              const cost = TERRAIN_COST[target.terrain];
              if (moveLeft >= cost) {
                const result = moveUnit(s, myUnit, fromKey, toKey, cost);
                set({ ...result, selectedHex: toKey });
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
      if (!hex) return s;
      if (hex.terrain !== TERRAIN.PLAINS) return s;
      const unit = hex.unitId ? s.units[hex.unitId] : null;
      if (!unit || unit.type !== UNIT.SETTLER) return s;
      if (hex.cityOwnerId) return s;
      const civ = s.civs[unit.civId];
      if (!civ || civ.isEliminated) return s;

      const newUnits = { ...s.units };
      delete newUnits[unit.id];
      return {
        units: newUnits,
        hexes: {
          ...s.hexes,
          [hexKey]: {
            ...hex,
            unitId: null,
            cityOwnerId: unit.civId,
            cityProgress: 0,
          },
        },
      };
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
    set({ phase: 'ai' });
    const civs = { ...get().civs };
    let units = { ...get().units };
    let hexes = { ...get().hexes };

    for (const [k, hex] of Object.entries(hexes)) {
      if (!hex.cityOwnerId) continue;
      const owner = civs[hex.cityOwnerId];
      if (!owner) continue;
      civs[owner.id] = { ...owner, gold: owner.gold + goldPerCity(owner) };
      let progress = (hex.cityProgress ?? 0) + productionRate(civs[owner.id]);
      const occupied = !!hex.unitId;
      if (progress >= 3 && !occupied) {
        const type = pickBestUnitType(civs[owner.id].techs);
        const u = createUnit(type, owner.id);
        units = { ...units, [u.id]: u };
        hexes[k] = { ...hex, unitId: u.id, cityProgress: 0 };
      } else {
        if (progress > 3) progress = 3;
        hexes[k] = { ...hex, cityProgress: progress };
      }
    }

    for (const uId of Object.keys(units)) {
      units[uId] = { ...units[uId], moved: 0 };
    }

    set({
      civs,
      units,
      hexes,
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
