import { createUnit, pickBestUnitType } from './units.js';
import { TERRAIN } from './terrain.js';
import { key, neighbors, parseKey } from './hex.js';

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

function cascadeMultiplier(state) {
  return state.scrapCascadeUntil != null && state.turn <= state.scrapCascadeUntil
    ? 2
    : 1;
}

export function resolveIncomePhase(state) {
  let units = { ...state.units };
  const hexes = { ...state.hexes };
  const civs = { ...state.civs };
  const mul = cascadeMultiplier(state);

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

      if (hex.terrain === TERRAIN.OIL && !isThief) fuel += fuelYield;
      if (hex.terrain === TERRAIN.RUINS) scrap += 1;
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
            const drop = (1 + Math.floor(Math.random() * 3)) * mul;
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

export function resolvePollutionPhase(state) {
  const hexes = { ...state.hexes };
  let units = { ...state.units };
  const explosions = [];
  const mul = cascadeMultiplier(state);

  for (const k of Object.keys(hexes)) {
    const hex = hexes[k];
    let pollution = hex.pollution ?? 0;
    let terrain = hex.terrain;
    let preSlagTerrain = hex.preSlagTerrain;
    let bombFuse = hex.bombFuse;
    const flag = hex.wasExtractedThisTurn;

    if (terrain === TERRAIN.OIL && flag) {
      const extractor = typeof flag === 'string' ? state.civs?.[flag] : null;
      const ppe = extractor?.traits?.pollutionPerExtract ?? 1;
      pollution = Math.min(5, pollution + ppe);
    }

    if (hex.station && (hex.station.hp ?? 0) > 0) {
      pollution = Math.max(0, pollution - 1);
    }

    let exploded = false;
    if (bombFuse != null && bombFuse > 0) {
      bombFuse -= 1;
      if (bombFuse === 0) {
        exploded = true;
        terrain = preSlagTerrain || TERRAIN.WILDERNESS;
        pollution = 2;
        preSlagTerrain = null;
        bombFuse = null;
      }
    }

    if (!exploded && pollution >= 5 && terrain !== TERRAIN.SLAG) {
      preSlagTerrain = terrain;
      terrain = TERRAIN.SLAG;
      pollution = 5;
    }

    hexes[k] = {
      ...hex,
      terrain,
      pollution,
      preSlagTerrain,
      bombFuse,
      wasExtractedThisTurn: false,
    };

    if (exploded) explosions.push(k);
  }

  for (const k of explosions) {
    const { q, r } = parseKey(k);
    for (const n of neighbors(q, r)) {
      const nk = key(n.q, n.r);
      const nh = hexes[nk];
      if (!nh || !nh.unitId) continue;
      const u = units[nh.unitId];
      if (!u) continue;
      const newHp = (u.hp ?? 3) - 2;
      if (newHp <= 0) {
        const drop = (1 + Math.floor(Math.random() * 3)) * mul;
        hexes[nk] = {
          ...nh,
          unitId: null,
          scrapPile: (nh.scrapPile || 0) + drop,
        };
        delete units[u.id];
      } else {
        units[u.id] = { ...u, hp: newHp };
      }
    }
  }

  return { ...state, hexes, units };
}

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
