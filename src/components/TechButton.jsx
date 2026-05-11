import { useGame } from '../store.js';

export default function TechButton() {
  const setOpen = useGame((s) => s.setTechModalOpen);
  const phase = useGame((s) => s.phase);
  return (
    <button
      className="fab fab-right"
      onClick={() => setOpen(true)}
      disabled={phase !== 'player'}
      aria-label="Open tech tree"
    >
      Tech
    </button>
  );
}
