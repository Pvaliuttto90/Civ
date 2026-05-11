import { useGame } from '../store.js';

export default function TopBar() {
  const turn = useGame((s) => s.turn);
  return (
    <div className="top-bar">
      <div className="stat">
        <div className="stat-label">Turn</div>
        <div className="stat-value">{turn}</div>
      </div>
      <div className="stat">
        <div className="stat-label">Gold</div>
        <div className="stat-value">0</div>
      </div>
      <div className="stat">
        <div className="stat-label">Era</div>
        <div className="stat-value">Ancient</div>
      </div>
    </div>
  );
}
