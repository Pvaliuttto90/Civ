import { useGame } from '../store.js';
import { CIV_IDS } from '../lib/civs.js';

export default function TopBar() {
  const turn = useGame((s) => s.turn);
  const phase = useGame((s) => s.phase);
  const civs = useGame((s) => s.civs);
  const hexes = useGame((s) => s.hexes);
  const playerCivId = useGame((s) => s.playerCivId);
  const player = playerCivId ? civs[playerCivId] : null;

  const unitCount = {};
  for (const u of Object.values(useGame.getState().units)) {
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
    </div>
  );
}
