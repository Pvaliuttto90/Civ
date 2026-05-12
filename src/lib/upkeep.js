import { createUnit, pickBestUnitType } from './units.js';
import { TERRAIN } from './terrain.js';

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

// Diesel & Slag Income Phase (turn structure spec Phase 1).
// For each civ, accumulate fuel/scrap/ichor from occupied hexes, then
// apply ichor damage on pollution-4+ tiles and kill units that hit 0
// hp (dropping 1–3 scrap on the hex they died on).
export function resolveIncomePhase(state) {
  let units = { ...state.units };
  const hexes = { ...state.hexes };
  const civs = { ...state.civs };

  for (const civId of Object.keys(civs)) {
    const civ = civs[civId];
    if (civ.isEliminated) continue;
    const traits = civ.traits || {};
    const fuelYield = traits.fuelYield ?? 1;
    const ichorImmune = !!traits.ichorImmune;
    const isThief = traits.fuelGeneration === 'theft';

    let fuel = civ.fuel ?? 0;
    let scrap = civ.scrap ?? 0;
    let ichor = civ.ichor ?? 0;

    for (const [k, hex] of Object.entries(hexes)) {
      if (!hex.unitId) continue;
      const u = units[hex.unitId];
      if (!u || u.civId !== civId) continue;

      if (hex.terrain === TERRAIN.OIL && !isThief) {
        fuel += fuelYield;
      }
      if (hex.terrain === TERRAIN.RUINS) {
        scrap += 1;
      }
      if (hex.scrapPile && hex.scrapPile > 0) {
        scrap += hex.scrapPile;
        hexes[k] = { ...hexes[k], scrapPile: 0 };
      }

      const poll = hex.pollution ?? 0;
      if (poll >= 4) {
        ichor += 1;
        if (!ichorImmune) {
          const newHp = (u.hp ?? 3) - 1;
          if (newHp <= 0) {
            const drop = 1 + Math.floor(Math.random() * 3);
            const cur = hexes[k];
            hexes[k] = {
              ...cur,
              unitId: null,
              scrapPile: (cur.scrapPile ?? 0) + drop,
            };
            delete units[u.id];
          } else {
            units[u.id] = { ...u, hp: newHp };
          }
        }
      }
    }

    civs[civId] = { ...civ, fuel, scrap, ichor };
  }

  return { ...state, units, hexes, civs };
}

// Pollution Phase (spec Phase 3). Oil hexes that were extracted this
// turn add pollutionPerExtract; anything reaching 5 converts to slag
// and stores its previous terrain so a Reclamation Bomb can restore
// it later. wasExtractedThisTurn is cleared on the way out. Commit 3
// will wire extractOil to flip the flag with the extracting civId.
export function resolvePollutionPhase(state) {
  const hexes = { ...state.hexes };

  for (const [k, hex] of Object.entries(hexes)) {
    let pollution = hex.pollution ?? 0;
    let terrain = hex.terrain;
    let preSlagTerrain = hex.preSlagTerrain;
    const flag = hex.wasExtractedThisTurn;

    if (terrain === TERRAIN.OIL && flag) {
      const extractor = typeof flag === 'string' ? state.civs?.[flag] : null;
      const ppe = extractor?.traits?.pollutionPerExtract ?? 1;
      pollution = Math.min(5, pollution + ppe);
    }

    if (pollution >= 5 && terrain !== TERRAIN.SLAG) {
      preSlagTerrain = terrain;
      terrain = TERRAIN.SLAG;
      pollution = 5;
    }

    hexes[k] = {
      ...hex,
      terrain,
      pollution,
      preSlagTerrain,
      wasExtractedThisTurn: false,
    };
  }

  return { ...state, hexes };
}

// Legacy Civ upkeep — gold per city, city production, move-budget
// reset, elimination flag. Still firing during graft so AI civs that
// keep founding cities don't break. Will be deleted in the strip pass
// (or refactored to handle Base production instead).
export function applyUpkeep(state) {
  const civs = { ...state.civs };
  let units = { ...state.units };
  let hexes = { ...state.hexes };

  for (const [k, hex] of Object.entries(hexes)) {
    if (!hex.cityOwnerId) continue;
    const owner = civs[hex.cityOwnerId];
    if (!owner || owner.isEliminated) continue;
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

  for (const civId of Object.keys(civs)) {
    const c = civs[civId];
    const hasUnits = Object.values(units).some((u) => u.civId === civId);
    const hasCities = Object.values(hexes).some((h) => h.cityOwnerId === civId);
    if (!hasUnits && !hasCities && !c.isEliminated) {
      civs[civId] = { ...c, isEliminated: true };
    }
  }

  return { ...state, civs, units, hexes };
}
