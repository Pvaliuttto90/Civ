// Era is derived from how many techs the player civ has researched.
export const ERAS = ['Ancient', 'Medieval', 'Industrial'];

export function eraIndex(techCount) {
  if (techCount >= 6) return 2;
  if (techCount >= 3) return 1;
  return 0;
}

export function eraName(techCount) {
  return ERAS[eraIndex(techCount)];
}
