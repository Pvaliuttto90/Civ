import { useGame } from '../store.js';
import { UNIT, UNIT_DEFS } from '../lib/units.js';
import { TERRAIN } from '../lib/terrain.js';

export default function SelectedPanel() {
  const selectedHex = useGame((s) => s.selectedHex);
  const hexes = useGame((s) => s.hexes);
  const units = useGame((s) => s.units);
  const civs = useGame((s) => s.civs);
  const foundCity = useGame((s) => s.foundCity);

  if (!selectedHex) return null;
  const hex = hexes[selectedHex];
  if (!hex) return null;
  const unit = hex.unitId ? units[hex.unitId] : null;
  const unitDef = unit ? UNIT_DEFS[unit.type] : null;
  const unitCiv = unit ? civs[unit.civId] : null;
  const cityCiv = hex.cityOwnerId ? civs[hex.cityOwnerId] : null;

  const canFound =
    unit &&
    unit.type === UNIT.SETTLER &&
    unitCiv?.isPlayer &&
    hex.terrain === TERRAIN.PLAINS &&
    !hex.cityOwnerId;

  return (
    <div className="selected-panel">
      <div className="selected-row">
        <div className="selected-title">
          {hex.terrain[0].toUpperCase() + hex.terrain.slice(1)}
        </div>
        {cityCiv && (
          <div className="selected-tag" style={{ background: cityCiv.color }}>
            {cityCiv.name} City
          </div>
        )}
      </div>
      {unit && unitDef && unitCiv && (
        <div className="selected-unit">
          <div className="unit-badge" style={{ background: unitCiv.color }}>
            {unitDef.glyph}
          </div>
          <div className="unit-info">
            <div className="unit-name">
              {unitCiv.name} {unitDef.name}
            </div>
            <div className="unit-stats">
              ATK {unitDef.atk} · DEF {unitDef.def} · MV {unitDef.move}
            </div>
          </div>
        </div>
      )}
      <div className="selected-actions">
        {canFound && (
          <button className="btn" onClick={() => foundCity(selectedHex)}>
            Found City
          </button>
        )}
      </div>
    </div>
  );
}
