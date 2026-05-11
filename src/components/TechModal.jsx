import { useGame } from '../store.js';
import {
  canResearch,
  currentEra,
  ERA_COSTS,
  isAvailable,
  TECHS,
  TECHS_BY_ERA,
} from '../lib/tech.js';
import { eraName } from '../lib/era.js';

const ERA_LABELS = ['Ancient', 'Medieval', 'Industrial'];

export default function TechModal() {
  const open = useGame((s) => s.techModalOpen);
  const setOpen = useGame((s) => s.setTechModalOpen);
  const civ = useGame((s) => s.civs.player);
  const research = useGame((s) => s.researchTech);

  if (!open || !civ) return null;
  const era = currentEra(civ);

  return (
    <div className="modal-backdrop" onClick={() => setOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Tech Tree</div>
            <div className="modal-sub">
              Era: {eraName(civ.techs.length)} · Gold: {civ.gold}
            </div>
          </div>
          <button className="btn secondary" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
        <div className="modal-body">
          {TECHS_BY_ERA.map((ids, idx) => (
            <div key={idx} className="tech-era">
              <div className="tech-era-label">
                {ERA_LABELS[idx]} · {ERA_COSTS[idx]}g
                {idx > era && <span className="locked"> · Locked</span>}
              </div>
              <div className="tech-grid">
                {ids.map((id) => {
                  const t = TECHS[id];
                  const owned = civ.techs.includes(id);
                  const available = isAvailable(civ, id);
                  const affordable = canResearch(civ, id);
                  return (
                    <div
                      key={id}
                      className={`tech-card${owned ? ' owned' : ''}${
                        available ? ' available' : ''
                      }`}
                    >
                      <div className="tech-name">{t.name}</div>
                      <div className="tech-desc">{t.desc}</div>
                      <div className="tech-foot">
                        {owned ? (
                          <span className="tech-tag owned">Researched</span>
                        ) : (
                          <button
                            className="btn"
                            disabled={!affordable}
                            onClick={() => research(id)}
                          >
                            Research ({ERA_COSTS[t.era]}g)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
