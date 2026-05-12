import { hexesInRange, key, parseKey } from './hex.js';

function unitHexKey(state, unitId) {
  for (const k in state.hexes) {
    if (state.hexes[k].unitId === unitId) return k;
  }
  return null;
}

export function getSightRange(state, civId) {
  let r = state.civs?.[civId]?.sightRange ?? 2;
  // Smog Blackout dims everyone's vision for the turn it fired.
  if (state.smogActiveUntil != null && state.turn <= state.smogActiveUntil) {
    r = Math.max(1, r - 1);
  }
  return r;
}

export function computeVisible(state, civId) {
  const range = getSightRange(state, civId);
  const visible = new Set();
  for (const u of Object.values(state.units || {})) {
    if (u.civId !== civId) continue;
    const k = unitHexKey(state, u.id);
    if (!k) continue;
    const { q, r } = parseKey(k);
    for (const h of hexesInRange(q, r, range)) {
      visible.add(key(h.q, h.r));
    }
  }
  for (const k in state.hexes) {
    if (state.hexes[k].cityOwnerId !== civId) continue;
    const { q, r } = parseKey(k);
    for (const h of hexesInRange(q, r, range)) {
      visible.add(key(h.q, h.r));
    }
  }
  return visible;
}

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
