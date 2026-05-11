import { useGame } from '../store.js';
import { eraName } from '../lib/era.js';

export default function TopBar() {
  const turn = useGame((s) => s.turn);
  const playerGold = useGame((s) => s.civs.player?.gold ?? 0);
  const techCount = useGame((s) => s.civs.player?.techs.length ?? 0);
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
    </div>
  );
}
