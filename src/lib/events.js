import { key, NEIGHBORS, parseKey } from './hex.js';
import { TERRAIN } from './terrain.js';

const EARLY = [
  'acid_rain', 'acid_rain', 'acid_rain',
  'fuel_geyser', 'fuel_geyser',
  'scrap_cascade', 'scrap_cascade',
  'smog_blackout',
];
const MID = [
  'acid_rain', 'acid_rain',
  'toxic_surge', 'toxic_surge',
  'fuel_geyser', 'fuel_geyser',
  'smog_blackout',
  'ichor_bloom',
  'regrowth_pulse',
  'scrap_cascade',
];
const LATE = [
  'acid_rain',
  'toxic_surge', 'toxic_surge', 'toxic_surge',
  'fuel_geyser',
  'ichor_bloom', 'ichor_bloom',
  'smog_blackout',
  'regrowth_pulse',
  'scrap_cascade',
];

const EVENT_LABELS = {
  acid_rain: 'Acid Rain',
  toxic_surge: 'Toxic Surge',
  fuel_geyser: 'Fuel Geyser',
  smog_blackout: 'Smog Blackout',
  ichor_bloom: 'Ichor Bloom',
  scrap_cascade: 'Scrap Cascade',
  regrowth_pulse: 'Regrowth Pulse',
};

const NON_TELEGRAPHED = new Set(['smog_blackout']);

export function eventLabel(id) {
  return EVENT_LABELS[id] || id;
}

export function isTelegraphed(eventId) {
  return !NON_TELEGRAPHED.has(eventId);
}

export function deckForTurn(turn) {
  if (turn <= 10) return [...EARLY];
  if (turn <= 20) return [...MID];
  return [...LATE];
}

function drawCard(state) {
  let deck = state.eventDeck && state.eventDeck.length > 0
    ? state.eventDeck
    : deckForTurn(state.turn);
  const idx = Math.floor(Math.random() * deck.length);
  const id = deck[idx];
  const remaining = deck.filter((_, i) => i !== idx);
  return { id, deck: remaining };
}

function killUnitDrop(state, hexes, units, k, u) {
  const cascade = state.scrapCascadeUntil != null && state.turn <= state.scrapCascadeUntil;
  const drop = (1 + Math.floor(Math.random() * 3)) * (cascade ? 2 : 1);
  const cur = hexes[k];
  hexes[k] = { ...cur, unitId: null, scrapPile: (cur.scrapPile ?? 0) + drop };
  delete units[u.id];
}

const RESOLVERS = {
  acid_rain: (state) => {
    const keys = Object.keys(state.hexes);
    if (keys.length === 0) return state;
    const center = keys[Math.floor(Math.random() * keys.length)];
    const { q, r } = parseKey(center);
    const hexes = { ...state.hexes };
    let units = { ...state.units };
    const cluster = [{ q, r }, ...NEIGHBORS.map((n) => ({ q: q + n.q, r: r + n.r }))];
    for (const c of cluster) {
      const k = key(c.q, c.r);
      const h = hexes[k];
      if (!h) continue;
      hexes[k] = { ...h, pollution: Math.max(0, (h.pollution ?? 0) - 1) };
      if (h.unitId) {
        const u = units[h.unitId];
        if (u) {
          const civ = state.civs[u.civId];
          if (!civ?.traits?.ichorImmune) {
            const newHp = (u.hp ?? 3) - 1;
            if (newHp <= 0) killUnitDrop(state, hexes, units, k, u);
            else units[u.id] = { ...u, hp: newHp };
          }
        }
      }
    }
    return { ...state, hexes, units, lastEvent: 'acid_rain' };
  },

  toxic_surge: (state) => {
    const hexes = { ...state.hexes };
    for (const [k, h] of Object.entries(hexes)) {
      if (h.terrain === TERRAIN.SLAG) continue;
      if ((h.pollution ?? 0) >= 3) {
        hexes[k] = { ...h, pollution: Math.min(5, (h.pollution ?? 0) + 1) };
      }
    }
    return { ...state, hexes, lastEvent: 'toxic_surge' };
  },

  fuel_geyser: (state) => {
    const candidates = Object.entries(state.hexes).filter(
      ([, h]) =>
        h.terrain !== TERRAIN.SLAG &&
        h.terrain !== TERRAIN.OIL &&
        (h.pollution ?? 0) <= 2
    );
    if (candidates.length === 0) return state;
    const [k, h] = candidates[Math.floor(Math.random() * candidates.length)];
    return {
      ...state,
      hexes: {
        ...state.hexes,
        [k]: {
          ...h,
          terrain: TERRAIN.OIL,
          preSlagTerrain: h.terrain,
          pollution: 3,
        },
      },
      lastEvent: 'fuel_geyser',
    };
  },

  smog_blackout: (state) => ({
    ...state,
    smogActiveUntil: state.turn,
    lastEvent: 'smog_blackout',
  }),

  ichor_bloom: (state) => {
    const hexes = { ...state.hexes };
    for (const [k, h] of Object.entries(hexes)) {
      if (h.terrain === TERRAIN.SLAG) continue;
      if ((h.pollution ?? 0) >= 2 && Math.random() < 0.3) {
        hexes[k] = { ...h, pollution: Math.min(5, (h.pollution ?? 0) + 2) };
      }
    }
    return { ...state, hexes, lastEvent: 'ichor_bloom' };
  },

  scrap_cascade: (state) => ({
    ...state,
    scrapCascadeUntil: state.turn,
    lastEvent: 'scrap_cascade',
  }),

  regrowth_pulse: (state) => {
    const hexes = { ...state.hexes };
    for (const [k, h] of Object.entries(hexes)) {
      if ((h.pollution ?? 0) === 0) continue;
      if (h.terrain === TERRAIN.SLAG) continue;
      const { q, r } = parseKey(k);
      let hasClean = false;
      for (const n of NEIGHBORS) {
        const nh = hexes[key(q + n.q, r + n.r)];
        if (nh && (nh.pollution ?? 0) === 0) {
          hasClean = true;
          break;
        }
      }
      if (hasClean) {
        hexes[k] = { ...h, pollution: Math.max(0, (h.pollution ?? 0) - 1) };
      }
    }
    const civs = { ...state.civs };
    for (const id of Object.keys(civs)) {
      if (civs[id].traits?.stationCostMod) {
        civs[id] = { ...civs[id], scrap: (civs[id].scrap ?? 0) + 5 };
      }
    }
    return { ...state, hexes, civs, lastEvent: 'regrowth_pulse' };
  },
};

export function applyEvent(state, eventId) {
  const fn = RESOLVERS[eventId];
  if (!fn) return state;
  return fn(state);
}

function fireThreshold(state, idx) {
  // 0 -> avg 2 crossed: Industrial Surge.
  // 1 -> avg 3 crossed: Collapse.
  if (idx === 0) {
    const civs = { ...state.civs };
    for (const id of Object.keys(civs)) {
      civs[id] = { ...civs[id], fuel: Math.max(0, (civs[id].fuel ?? 0) - 2) };
    }
    const hexes = { ...state.hexes };
    for (const [k, h] of Object.entries(hexes)) {
      if (h.terrain === TERRAIN.OIL) {
        hexes[k] = { ...h, pollution: Math.min(5, (h.pollution ?? 0) + 1) };
      }
    }
    return { ...state, civs, hexes, lastEvent: 'industrial_surge' };
  }
  if (idx === 1) {
    const hexes = { ...state.hexes };
    for (const [k, h] of Object.entries(hexes)) {
      if (h.terrain === TERRAIN.SLAG) continue;
      if ((h.pollution ?? 0) >= 3) {
        hexes[k] = {
          ...h,
          pollution: 5,
          terrain: TERRAIN.SLAG,
          preSlagTerrain: h.terrain,
        };
      }
    }
    return { ...state, hexes, lastEvent: 'collapse' };
  }
  return state;
}

function avgPollution(state) {
  const hexes = Object.values(state.hexes);
  if (hexes.length === 0) return 0;
  return hexes.reduce((sum, h) => sum + (h.pollution ?? 0), 0) / hexes.length;
}

export function resolveEventPhase(state) {
  // Wipe the last-event sticker before this phase fires so it only
  // hangs around for the turn it actually applies to.
  let next = { ...state, lastEvent: null };

  // 1. Resolve telegraphed event from previous draw.
  if (next.pendingEvent) {
    const id = next.pendingEvent;
    next = { ...next, pendingEvent: null };
    next = applyEvent(next, id);
  }

  // 2. Every 5 turns, draw a card. Smog Blackout fires immediately,
  //    everything else gets telegraphed for next turn.
  if (next.turn > 0 && next.turn % 5 === 0) {
    const { id, deck } = drawCard(next);
    next = { ...next, eventDeck: deck };
    if (NON_TELEGRAPHED.has(id)) next = applyEvent(next, id);
    else next = { ...next, pendingEvent: id };
  }

  // 3. Threshold dispatcher (avg pollution crossings, one-shot each).
  const fired = next.thresholdsFired || [false, false];
  const avg = avgPollution(next);
  let updatedFired = fired;
  if (avg >= 2 && !updatedFired[0]) {
    next = fireThreshold(next, 0);
    updatedFired = [true, updatedFired[1]];
  }
  if (avg >= 3 && !updatedFired[1]) {
    next = fireThreshold(next, 1);
    updatedFired = [updatedFired[0], true];
  }
  if (updatedFired !== fired) {
    next = { ...next, thresholdsFired: updatedFired };
  }

  return next;
}
