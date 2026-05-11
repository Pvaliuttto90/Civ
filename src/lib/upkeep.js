import { createUnit, pickBestUnitType } from './units.js';

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

// Apply end-of-turn upkeep: gold income, production, elimination check,
// and move-budget reset.
export function applyUpkeep(state) {
  const civs = { ...state.civs };
  let units = { ...state.units };
  let hexes = { ...state.hexes };

  // Cities: gold and production.
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

  // Reset move budgets.
  for (const uId of Object.keys(units)) {
    units[uId] = { ...units[uId], moved: 0 };
  }

  // Elimination: no units and no cities.
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
