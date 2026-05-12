import { hexesInRange, key, parseKey } from './hex.js';

export const SIGHT_RANGE = 2;

function unitHexKey(state, unitId) {
  for (const k in state.hexes) {
    if (state.hexes[k].unitId === unitId) return k;
  }
  return null;
}

// Set of hex keys currently visible to `civId`, derived from its units
// and cities (sight range is symmetric in axial steps).
export function computeVisible(state, civId) {
  const visible = new Set();
  for (const u of Object.values(state.units)) {
    if (u.civId !== civId) continue;
    const k = unitHexKey(state, u.id);
    if (!k) continue;
    const { q, r } = parseKey(k);
    for (const h of hexesInRange(q, r, SIGHT_RANGE)) {
      visible.add(key(h.q, h.r));
    }
  }
  for (const k in state.hexes) {
    if (state.hexes[k].cityOwnerId !== civId) continue;
    const { q, r } = parseKey(k);
    for (const h of hexesInRange(q, r, SIGHT_RANGE)) {
      visible.add(key(h.q, h.r));
    }
  }
  return visible;
}

// Merge a civ's currently visible hexes into its persistent `explored`
// memory. Explored only grows; returns the original state unchanged when
// no new hexes were seen so Zustand selectors don't churn.
export function withFogUpdate(state, civId) {
  const civ = state.civs?.[civId];
  if (!civ) return state;
  const visible = computeVisible(state, civId);
  const prev = civ.explored || [];
  const merged = new Set(prev);
  for (const v of visible) merged.add(v);
  if (merged.size === prev.length) return state;
  return {
    ...state,
    civs: {
      ...state.civs,
      [civId]: { ...civ, explored: [...merged] },
    },
  };
}
