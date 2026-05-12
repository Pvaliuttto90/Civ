import { useGame } from '../store.js';
import { CIV_IDS } from '../lib/civs.js';
import { eventLabel } from '../lib/events.js';

const FRIENDLY_LABEL = {
  industrial_surge: 'Industrial Surge',
  collapse: 'Collapse',
};

function labelFor(id) {
  return FRIENDLY_LABEL[id] || eventLabel(id);
}

export default function TopBar() {
  const turn = useGame((s) => s.turn);
  const phase = useGame((s) => s.phase);
  const civs = useGame((s) => s.civs);
  const playerCivId = useGame((s) => s.playerCivId);
  const pendingEvent = useGame((s) => s.pendingEvent);
  const lastEvent = useGame((s) => s.lastEvent);
  const units = useGame((s) => s.units);
  const player = playerCivId ? civs[playerCivId] : null;

  const unitCount = {};
  for (const u of Object.values(units)) {
    unitCount[u.civId] = (unitCount[u.civId] || 0) + 1;
  }

  if (phase === 'faction-pick') return null;

  return (
    <div className="top-bar">
      <div className="stat">
        <div className="stat-label">Turn</div>
        <div className="stat-value">{turn}</div>
      </div>
      <div className="stat">
        <div className="stat-label">Fuel</div>
        <div className="stat-value">{player?.fuel ?? 0}</div>
      </div>
      <div className="stat">
        <div className="stat-label">Scrap</div>
        <div className="stat-value">{player?.scrap ?? 0}</div>
      </div>
      <div className="stat">
        <div className="stat-label">Ichor</div>
        <div className="stat-value">{player?.ichor ?? 0}</div>
      </div>
      <div className="civ-legend">
        {CIV_IDS.map((id) => {
          const civ = civs[id];
          if (!civ) return null;
          return (
            <div
              key={id}
              className={`civ-chip${civ.isEliminated ? ' dead' : ''}`}
              title={`${civ.name}: ${unitCount[id] || 0} units`}
            >
              <span className="civ-dot" style={{ background: civ.color }} />
              <span className="civ-count">{unitCount[id] || 0}</span>
            </div>
          );
        })}
      </div>
      {phase === 'ai' && <div className="ai-pill">AI thinking…</div>}
      {phase !== 'ai' && lastEvent && (
        <div className="event-pill event-pill-last">
          ⚡ {labelFor(lastEvent)}
        </div>
      )}
      {phase !== 'ai' && pendingEvent && !lastEvent && (
        <div className="event-pill event-pill-next">
          Next: {labelFor(pendingEvent)}
        </div>
      )}
    </div>
  );
}
