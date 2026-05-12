// Pointy-top axial hex helpers.
// q -> column, r -> row. Stored as `${q},${r}` keys.

export const HEX_RADIUS = 60;
export const HEX_WIDTH = Math.sqrt(3) * HEX_RADIUS;
export const HEX_HEIGHT = 2 * HEX_RADIUS;

export const MAP_COLS = 15;
export const MAP_ROWS = 10;

export function key(q, r) {
  return `${q},${r}`;
}

export function parseKey(k) {
  const [q, r] = k.split(',').map(Number);
  return { q, r };
}

// Axial -> pixel (pointy-top).
export function axialToPixel(q, r) {
  const x = HEX_WIDTH * (q + r / 2);
  const y = (3 / 2) * HEX_RADIUS * r;
  return { x, y };
}

// Six axial neighbor offsets.
export const NEIGHBORS = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function neighbors(q, r) {
  return NEIGHBORS.map((n) => ({ q: q + n.q, r: r + n.r }));
}

export function hexDistance(a, b) {
  return (
    (Math.abs(a.q - b.q) +
      Math.abs(a.q + a.r - b.q - b.r) +
      Math.abs(a.r - b.r)) /
    2
  );
}

export function inBounds(q, r) {
  return q >= 0 && q < MAP_COLS && r >= 0 && r < MAP_ROWS;
}

// All in-bounds hexes within `range` steps of (q, r), inclusive.
export function hexesInRange(q, r, range) {
  const out = [];
  for (let dq = -range; dq <= range; dq++) {
    const drMin = Math.max(-range, -dq - range);
    const drMax = Math.min(range, -dq + range);
    for (let dr = drMin; dr <= drMax; dr++) {
      const nq = q + dq;
      const nr = r + dr;
      if (inBounds(nq, nr)) out.push({ q: nq, r: nr });
    }
  }
  return out;
}

// SVG polygon points string for a pointy-top hex centered at (cx, cy).
export function hexPoints(cx, cy, r = HEX_RADIUS) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return pts.join(' ');
}
