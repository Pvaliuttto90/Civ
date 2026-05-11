import { useGame } from '../store.js';

export default function EndTurnButton() {
  const phase = useGame((s) => s.phase);
  const endTurn = useGame((s) => s.endTurn);
  const disabled = phase !== 'player';
  return (
    <button
      className="fab fab-left"
      onClick={endTurn}
      disabled={disabled}
      aria-label="End turn"
    >
      End Turn
    </button>
  );
}
