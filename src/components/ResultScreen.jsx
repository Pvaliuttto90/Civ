import { useGame } from '../store.js';

export default function ResultScreen() {
  const result = useGame((s) => s.result);
  const reset = useGame((s) => s.reset);
  const playerCivId = useGame((s) => s.playerCivId);
  const civs = useGame((s) => s.civs);
  const player = playerCivId ? civs[playerCivId] : null;
  if (!result) return null;

  return (
    <div className="result-screen">
      <div className="result-card">
        <div className={`result-title ${result.won ? 'win' : 'lose'}`}>
          {result.won ? 'Victory' : 'Defeat'}
        </div>
        <div className="result-stats">
          {result.reason && <div>{result.reason}</div>}
          <div>Turn {result.turn}</div>
          {result.faction && (
            <div>
              {result.won ? 'Winner' : 'Won by'}: {result.faction}
            </div>
          )}
          {player && (
            <div>
              {player.name} — fuel {player.fuel ?? 0} · scrap{' '}
              {player.scrap ?? 0} · ichor {player.ichor ?? 0}
            </div>
          )}
        </div>
        <button className="btn" onClick={reset}>
          Play Again
        </button>
      </div>
    </div>
  );
}
