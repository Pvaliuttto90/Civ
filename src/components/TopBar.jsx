import { useGame } from '../store.js';
import { eraName } from '../lib/era.js';
import { CIV_IDS } from '../lib/civs.js';

export default function TopBar() {
  const turn = useGame((s) => s.turn);
  const phase = useGame((s) => s.phase);
  const civs = useGame((s) => s.civs);
  const hexes = useGame((s) => s.hexes);
  const playerGold = civs.player?.gold ?? 0;
  const techCount = civs.player?.techs.length ?? 0;

  const cityCount = {};
  for (const h of Object.values(hexes)) {
    if (h.cityOwnerId) cityCount[h.cityOwnerId] = (cityCount[h.cityOwnerId] || 0) + 1;
  }

  return (
    <div className="top-bar">
      <div className="stat">
        <div className="stat-label">Turn</div>
        <div className="stat-value">{turn}</div>
      </div>
      <div className="stat">
        <div className="stat-label">Gold</div>
        <div className="stat-value">{playerGold}</div>
      </div>
      <div className="stat">
        <div className="stat-label">Era</div>
        <div className="stat-value">{eraName(techCount)}</div>
      </div>
      <div className="civ-legend">
        {CIV_IDS.map((id) => {
          const civ = civs[id];
          if (!civ) return null;
          return (
            <div
              key={id}
              className={`civ-chip${civ.isEliminated ? ' dead' : ''}`}
              title={`${civ.name}: ${cityCount[id] || 0} cities`}
            >
              <span className="civ-dot" style={{ background: civ.color }} />
              <span className="civ-count">{cityCount[id] || 0}</span>
            </div>
          );
        })}
      </div>
      {phase === 'ai' && <div className="ai-pill">AI thinking…</div>}
    </div>
  );
}
