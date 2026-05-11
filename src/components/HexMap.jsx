import { useEffect, useRef, useState } from 'react';
import { useGame } from '../store.js';
import {
  axialToPixel,
  HEX_HEIGHT,
  HEX_RADIUS,
  HEX_WIDTH,
  hexPoints,
  key as hexKey,
  parseKey,
} from '../lib/hex.js';
import { TERRAIN_COLORS } from '../lib/terrain.js';

// Compute map extents so we can frame the viewBox.
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
  const selectedHex = useGame((s) => s.selectedHex);
  const selectHex = useGame((s) => s.selectHex);

  const extents = mapExtents(hexes);

  // Pan + zoom state.
  const [view, setView] = useState({ x: extents.x, y: extents.y, scale: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;

  const containerRef = useRef(null);
  const pointers = useRef(new Map());
  const dragState = useRef(null);
  const pinchState = useRef(null);
  const didDrag = useRef(false);

  // Fit-to-screen on mount when the container has measured size.
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
      // Keep pinch midpoint stable in world space.
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
    selectHex(k);
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
          const isSelected = selectedHex === k;
          return (
            <polygon
              key={k}
              className={`hex${isSelected ? ' selected' : ''}`}
              points={hexPoints(x, y)}
              fill={TERRAIN_COLORS[hex.terrain]}
              onClick={() => onHexClick(k)}
            />
          );
        })}
      </svg>
    </div>
  );
}
