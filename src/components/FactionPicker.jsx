import { useGame } from '../store.js';
import { CIV_IDS, CIVS } from '../lib/civs.js';

const FACTION_BLURBS = {
  syndicate: {
    desc: 'Fuel barons. 2× fuel from oil hexes, 2× pollution from extraction.',
    win: 'Win: bank 50 fuel.',
  },
  blight: {
    desc: 'Slag-touched. Ichor-immune; combat bonus near slag; move freely on slag.',
    win: 'Win: 40% of the board turns to slag.',
  },
  engineers: {
    desc: 'Builders. Cheaper rail and stations; can remediate pollution.',
    win: 'Win: hold the most clean hexes at turn 30.',
  },
  runners: {
    desc: 'Thieves. No fuel income — steal on attack. +1 sight, pass through enemies.',
    win: 'Win: steal 80 fuel total.',
  },
};

export default function FactionPicker() {
  const phase = useGame((s) => s.phase);
  const pickFaction = useGame((s) => s.pickFaction);
  if (phase !== 'faction-pick') return null;

  return (
    <div className="faction-picker">
      <div className="faction-picker-title">Choose Your Faction</div>
      <div className="faction-picker-grid">
        {CIV_IDS.map((id) => {
          const civ = CIVS[id];
          const blurb = FACTION_BLURBS[id];
          return (
            <button
              key={id}
              className="faction-card"
              onClick={() => pickFaction(id)}
              style={{ borderColor: civ.color }}
            >
              <div className="faction-card-header">
                <div
                  className="faction-card-swatch"
                  style={{ background: civ.color }}
                />
                <div className="faction-card-name">{civ.name}</div>
              </div>
              <div className="faction-card-desc">{blurb.desc}</div>
              <div className="faction-card-win">{blurb.win}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
