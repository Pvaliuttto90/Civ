// Diesel & Slag factions. Each civ instance in state.civs is built
// from these defaults in init.js with isPlayer/gold/fuel/etc. filled in.
export const CIV_IDS = ['syndicate', 'blight', 'engineers', 'runners'];

export const CIVS = {
  syndicate: {
    id: 'syndicate',
    name: 'Syndicate',
    color: '#d96b1f',
    sightRange: 2,
    traits: {
      fuelYield: 2,
      pollutionPerExtract: 2,
      canBuildStation: false,
      winCondition: 'syndicate',
    },
  },
  blight: {
    id: 'blight',
    name: 'Blight',
    color: '#7a4a8c',
    sightRange: 2,
    traits: {
      ichorImmune: true,
      slagMoveCost: 1,
      bonusAttackPerAdjacentSlag: 1,
      canBuildStation: false,
      winCondition: 'blight',
    },
  },
  engineers: {
    id: 'engineers',
    name: 'Engineers',
    color: '#4a90e2',
    sightRange: 2,
    traits: {
      stationCostMod: 0.5,
      railCostMod: 0.75,
      reclaimerLimit: 2,
      winCondition: 'engineers',
    },
  },
  runners: {
    id: 'runners',
    name: 'Runners',
    color: '#e2d24a',
    sightRange: 3,
    traits: {
      fuelGeneration: 'theft',
      stealOnAttack: 2,
      passthroughEnemyHex: true,
      winCondition: 'runners',
    },
  },
};
