import { useGame } from '../store.js';

export default function ResultScreen() {
  const phase = useGame((s) => s.phase);
  const result = useGame((s) => s.result);
  const reset = useGame((s) => s.reset);
  if (phase !== 'result' || !result) return null;
  return (
    <div className="result-screen">
      <div className="result-card">
        <div className={`result-title ${result.won ? 'win' : 'lose'}`}>
          {result.won ? 'Victory!' : 'Defeat'}
        </div>
        <div className="result-stats">
          <div>Turn reached: {result.turn}</div>
          <div>Cities held: {result.cities}</div>
          <div>Techs researched: {result.techs}</div>
        </div>
        <button className="btn" onClick={reset}>
          Play Again
        </button>
      </div>
    </div>
  );
}
