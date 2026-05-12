import { useGame } from '../store.js';
import { UNIT, UNIT_DEFS } from '../lib/units.js';
import { TERRAIN } from '../lib/terrain.js';

export default function SelectedPanel() {
  const selectedHex = useGame((s) => s.selectedHex);
  const hexes = useGame((s) => s.hexes);
  const units = useGame((s) => s.units);
  const civs = useGame((s) => s.civs);
  const playerCivId = useGame((s) => s.playerCivId);
  const phase = useGame((s) => s.phase);

  const extractOilAt = useGame((s) => s.extractOilAt);
  const deployUnitOfType = useGame((s) => s.deployUnitOfType);
  const buildStationAt = useGame((s) => s.buildStationAt);
  const repairUnitAt = useGame((s) => s.repairUnitAt);
  const reclamationBombAt = useGame((s) => s.reclamationBombAt);

  if (phase === 'faction-pick') return null;
  if (!selectedHex) return null;
  const hex = hexes[selectedHex];
  if (!hex) return null;
  const unit = hex.unitId ? units[hex.unitId] : null;
  const unitDef = unit ? UNIT_DEFS[unit.type] : null;
  const unitCiv = unit ? civs[unit.civId] : null;
  const playerCiv = playerCivId ? civs[playerCivId] : null;
  const moveLeft = unit && unitDef ? Math.max(0, unitDef.move - unit.moved) : 0;
  const pollution = hex.pollution ?? 0;
  const isPlayerUnit = !!unit && !!unitCiv?.isPlayer;
  const isPlayerBase = isPlayerUnit && unit.type === UNIT.BASE;
  const canEngineerBuild = !!playerCiv?.traits?.stationCostMod;
  const stationCost = canEngineerBuild
    ? Math.max(1, Math.ceil(4 * playerCiv.traits.stationCostMod))
    : 4;
  const maxHp = unitDef?.hp ?? 0;
  const needsRepair = unit && unitDef && (unit.hp ?? maxHp) < maxHp;
  const onOil = hex.terrain === TERRAIN.OIL;
  const onSlag = hex.terrain === TERRAIN.SLAG;
  const fuel = playerCiv?.fuel ?? 0;
  const scrap = playerCiv?.scrap ?? 0;

  return (
    <div className="selected-panel">
      <div className="selected-row">
        <div className="selected-title">
          {hex.terrain[0].toUpperCase() + hex.terrain.slice(1)}
          {pollution > 0 && (
            <span className="selected-poll"> · pollution {pollution}</span>
          )}
          {hex.station && <span className="selected-poll"> · station</span>}
          {hex.bombFuse > 0 && (
            <span className="selected-poll"> · bomb fuse {hex.bombFuse}</span>
          )}
        </div>
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
              ATK {unitDef.atk} · DEF {unitDef.def} · HP {unit.hp ?? maxHp}/{maxHp}
              {unitDef.move > 0 && ` · MV ${moveLeft}/${unitDef.move}`}
              {unitDef.ranged ? ' · Ranged' : ''}
            </div>
            {isPlayerUnit && unit.type !== UNIT.BASE && moveLeft > 0 && (
              <div className="hint">Tap an adjacent hex to move or attack (2 fuel).</div>
            )}
            {isPlayerBase && (
              <div className="hint">Bases don't move. Deploy units below.</div>
            )}
          </div>
        </div>
      )}
      <div className="selected-actions">
        {isPlayerUnit && onOil && !hex.wasExtractedThisTurn && (
          <button className="btn" onClick={() => extractOilAt(selectedHex)}>
            Extract Oil (+3 fuel)
          </button>
        )}
        {isPlayerBase && (
          <button
            className="btn"
            disabled={fuel < 3}
            onClick={() => deployUnitOfType(UNIT.WARRIOR)}
          >
            Deploy Warrior (3 fuel)
          </button>
        )}
        {isPlayerBase && (
          <button
            className="btn secondary"
            disabled={fuel < 8}
            onClick={() => deployUnitOfType(UNIT.RECLAIMER)}
          >
            Deploy Reclaimer (8 fuel)
          </button>
        )}
        {isPlayerUnit && canEngineerBuild && !hex.station && (
          <button
            className="btn secondary"
            disabled={scrap < stationCost}
            onClick={() => buildStationAt(selectedHex)}
          >
            Build Station ({stationCost} scrap)
          </button>
        )}
        {isPlayerUnit && needsRepair && (
          <button
            className="btn secondary"
            disabled={scrap < 2}
            onClick={() => repairUnitAt(selectedHex)}
          >
            Repair (+2 hp, 2 scrap)
          </button>
        )}
        {onSlag && !playerCiv?.bombUsed && !hex.bombFuse && (
          <button
            className="btn warn"
            disabled={fuel < 12}
            onClick={() => reclamationBombAt(selectedHex)}
          >
            Reclamation Bomb (12 fuel)
          </button>
        )}
      </div>
    </div>
  );
}
