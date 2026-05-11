export const ERA_COSTS = [10, 20, 30];

export const TECHS = {
  archery: {
    id: 'archery',
    name: 'Archery',
    era: 0,
    desc: 'Unlocks the Archer unit.',
  },
  masonry: {
    id: 'masonry',
    name: 'Masonry',
    era: 0,
    desc: '+1 defense to your cities.',
  },
  agriculture: {
    id: 'agriculture',
    name: 'Agriculture',
    era: 0,
    desc: '+1 gold per city per turn.',
  },
  chivalry: {
    id: 'chivalry',
    name: 'Chivalry',
    era: 1,
    desc: 'Unlocks the Knight unit.',
  },
  fortification: {
    id: 'fortification',
    name: 'Fortification',
    era: 1,
    desc: '+2 defense to your cities.',
  },
  trade: {
    id: 'trade',
    name: 'Trade',
    era: 1,
    desc: '+2 gold per city per turn.',
  },
  industrialism: {
    id: 'industrialism',
    name: 'Industrialism',
    era: 2,
    desc: '+1 unit production speed.',
  },
  nationalism: {
    id: 'nationalism',
    name: 'Nationalism',
    era: 2,
    desc: '+1 attack to all of your units.',
  },
  commerce: {
    id: 'commerce',
    name: 'Commerce',
    era: 2,
    desc: '+3 gold per city per turn.',
  },
};

export const TECHS_BY_ERA = [
  ['archery', 'masonry', 'agriculture'],
  ['chivalry', 'fortification', 'trade'],
  ['industrialism', 'nationalism', 'commerce'],
];

export function currentEra(civ) {
  if (civ.techs.length >= 6) return 2;
  if (civ.techs.length >= 3) return 1;
  return 0;
}

export function isAvailable(civ, techId) {
  const tech = TECHS[techId];
  if (!tech) return false;
  if (civ.techs.includes(techId)) return false;
  return tech.era === currentEra(civ);
}

export function canResearch(civ, techId) {
  if (!isAvailable(civ, techId)) return false;
  return civ.gold >= ERA_COSTS[TECHS[techId].era];
}
