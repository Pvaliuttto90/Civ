import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../store.js';
import {
  axialToPixel,
  HEX_HEIGHT,
  HEX_RADIUS,
  HEX_WIDTH,
  hexPoints,
  parseKey,
} from '../lib/hex.js';
import { TERRAIN_COLORS } from '../lib/terrain.js';
import { UNIT_DEFS } from '../lib/units.js';
import { computeVisible } from '../lib/fog.js';

function mapExtents(hexes) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const k of Object.keys(hexes)) {
    const { q, r } = parseKey(k);
    const { x, y } = axialToPixel(q, r);
    minX = Math.min(minX, x - HEX_WIDTH / 2);
    maxX = Math.max(maxX, x + HEX_WIDTH / 2);
    minY = Math.min(minY, y - HEX_HEIGHT / 2);
    maxY = Math.max(maxY, y + HEX_HEIGHT / 2);
  }
  const pad = HEX_RADIUS * 0.5;
  return {
    x: minX - pad,
    y: minY - pad,
    w: maxX - minX + pad * 2,
    h: maxY - minY + pad * 2,
  };
}

export default function HexMap() {
  const hexes = useGame((s) => s.hexes);
  const units = useGame((s) => s.units);
  const civs = useGame((s) => s.civs);
  const selectedHex = useGame((s) => s.selectedHex);
  const tapHex = useGame((s) => s.tapHex);
  const playerCivId = useGame((s) => s.playerCivId);

  const visibleSet = useMemo(
    () =>
      playerCivId
        ? computeVisible({ hexes, units, civs }, playerCivId)
        : new Set(),
    [hexes, units, civs, playerCivId]
  );
  const exploredSet = useMemo(
    () =>
      new Set(
        playerCivId ? civs[playerCivId]?.explored || [] : []
      ),
    [civs, playerCivId]
  );

  const extents = mapExtents(hexes);

  const [view, setView] = useState({ x: extents.x, y: extents.y, scale: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;

  const containerRef = useRef(null);
  const pointers = useRef(new Map());
  const dragState = useRef(null);
  const pinchState = useRef(null);
  const didDrag = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const scale = Math.min(rect.width / extents.w, rect.height / extents.h);
    const w = rect.width / scale;
    const h = rect.height / scale;
    setView({
      x: extents.x + (extents.w - w) / 2,
      y: extents.y + (extents.h - h) / 2,
      scale,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    didDrag.current = false;
    if (pointers.current.size === 1) {
      dragState.current = {
        startX: e.clientX,
        startY: e.clientY,
        viewX: viewRef.current.x,
        viewY: viewRef.current.y,
      };
      pinchState.current = null;
    } else if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      pinchState.current = {
        dist: Math.hypot(dx, dy),
        scale: viewRef.current.scale,
        viewX: viewRef.current.x,
        viewY: viewRef.current.y,
        midX: (pts[0].x + pts[1].x) / 2,
        midY: (pts[0].y + pts[1].y) / 2,
      };
      dragState.current = null;
    }
  }

  function onPointerMove(e) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 1 && dragState.current) {
      const dx = e.clientX - dragState.current.startX;
      const dy = e.clientY - dragState.current.startY;
      if (Math.hypot(dx, dy) > 5) didDrag.current = true;
      const s = viewRef.current.scale;
      setView({
        ...viewRef.current,
        x: dragState.current.viewX - dx / s,
        y: dragState.current.viewY - dy / s,
      });
    } else if (pointers.current.size === 2 && pinchState.current) {
      const pts = [...pointers.current.values()];
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / pinchState.current.dist;
      const newScale = Math.max(0.4, Math.min(2.5, pinchState.current.scale * ratio));
      const rect = containerRef.current.getBoundingClientRect();
      const mx = pinchState.current.midX - rect.left;
      const my = pinchState.current.midY - rect.top;
      const worldX = pinchState.current.viewX + mx / pinchState.current.scale;
      const worldY = pinchState.current.viewY + my / pinchState.current.scale;
      setView({
        scale: newScale,
        x: worldX - mx / newScale,
        y: worldY - my / newScale,
      });
      didDrag.current = true;
    }
  }

  function onPointerUp(e) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchState.current = null;
    if (pointers.current.size === 0) dragState.current = null;
  }

  function onHexClick(k) {
    if (didDrag.current) return;
    tapHex(k);
  }

  const rect = containerRef.current?.getBoundingClientRect();
  const vw = rect ? rect.width / view.scale : extents.w;
  const vh = rect ? rect.height / view.scale : extents.h;

  return (
    <div
      className="map-area"
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <svg viewBox={`${view.x} ${view.y} ${vw} ${vh}`} preserveAspectRatio="xMidYMid meet">
        {Object.entries(hexes).map(([k, hex]) => {
          const { q, r } = parseKey(k);
          const { x, y } = axialToPixel(q, r);
          const isVisible = visibleSet.has(k);
          const isExplored = isVisible || exploredSet.has(k);
          const isSelected = selectedHex === k;

          if (!isExplored) {
            return (
              <g key={k} onClick={() => onHexClick(k)}>
                <polygon
                  className={`hex${isSelected ? ' selected' : ''}`}
                  points={hexPoints(x, y)}
                  fill="#0b0b18"
                />
              </g>
            );
          }

          const unit = isVisible && hex.unitId ? units[hex.unitId] : null;
          const unitCiv = unit ? civs[unit.civId] : null;
          const def = unit ? UNIT_DEFS[unit.type] : null;
          const exhausted = unit && def ? unit.moved >= def.move : false;
          const pollution = Math.max(0, Math.min(5, hex.pollution ?? 0));
          const scrapPile = isVisible ? (hex.scrapPile ?? 0) : 0;
          const showHp = unit && def && (unit.hp ?? def.hp) < def.hp;
          const station = isVisible ? hex.station : null;
          const bombFuse = isVisible ? (hex.bombFuse ?? 0) : 0;
          const isBase = def?.immobile;
          const unitRadius = isBase ? 22 : 18;

          return (
            <g key={k} onClick={() => onHexClick(k)} opacity={isVisible ? 1 : 0.55}>
              <polygon
                className={`hex${isSelected ? ' selected' : ''}`}
                points={hexPoints(x, y)}
                fill={TERRAIN_COLORS[hex.terrain]}
              />
              {pollution > 0 && (
                <g pointerEvents="none">
                  {Array.from({ length: pollution }).map((_, i) => (
                    <circle
                      key={i}
                      cx={x - 12 + i * 6}
                      cy={y + 22}
                      r={2}
                      fill={pollution >= 4 ? '#b14aff' : '#ff8a3a'}
                      stroke="#000"
                      strokeOpacity="0.4"
                      strokeWidth={0.5}
                    />
                  ))}
                </g>
              )}
              {scrapPile > 0 && (
                <g pointerEvents="none">
                  <rect
                    x={x + 12}
                    y={y - 6}
                    width={14}
                    height={12}
                    rx={2}
                    fill="#9a9ab0"
                    stroke="#000"
                    strokeOpacity="0.5"
                  />
                  <text
                    x={x + 19}
                    y={y + 3}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight={800}
                    fill="#1a1a2e"
                  >
                    {scrapPile}
                  </text>
                </g>
              )}
              {station && (
                <g pointerEvents="none">
                  <circle
                    cx={x - 18}
                    cy={y - 18}
                    r={7}
                    fill="#5fb55f"
                    stroke="#000"
                    strokeOpacity="0.5"
                    strokeWidth={1}
                  />
                  <text
                    x={x - 18}
                    y={y - 14}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight={800}
                    fill="#0a1a0a"
                  >
                    S
                  </text>
                </g>
              )}
              {bombFuse > 0 && (
                <g pointerEvents="none">
                  <circle
                    cx={x}
                    cy={y - 26}
                    r={10}
                    fill="#ff8a3a"
                    stroke="#000"
                    strokeOpacity="0.5"
                    strokeWidth={1}
                  />
                  <text
                    x={x}
                    y={y - 22}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={800}
                    fill="#1a1a2e"
                  >
                    {bombFuse}
                  </text>
                </g>
              )}
              {unit && unitCiv && def && (
                <g pointerEvents="none" opacity={exhausted ? 0.55 : 1}>
                  <circle
                    cx={x}
                    cy={y}
                    r={unitRadius}
                    fill={unitCiv.color}
                    stroke="#000"
                    strokeOpacity="0.5"
                    strokeWidth={isBase ? 2.5 : 1.5}
                  />
                  <text
                    x={x}
                    y={y + 5}
                    textAnchor="middle"
                    fontSize={isBase ? 20 : 18}
                    fontWeight={800}
                    fill="#fff"
                  >
                    {def.glyph}
                  </text>
                  {showHp && (
                    <text
                      x={x}
                      y={y + unitRadius + 10}
                      textAnchor="middle"
                      fontSize={9}
                      fontWeight={700}
                      fill="#ff8a8a"
                      stroke="#000"
                      strokeOpacity="0.5"
                      strokeWidth={0.3}
                    >
                      {unit.hp}/{def.hp}
                    </text>
                  )}
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
