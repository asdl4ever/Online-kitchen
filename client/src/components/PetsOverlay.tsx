import { PET_MAX_STARS, starUpgradeCost } from "shared";
import { useGameState } from "../hooks/useGameState";
import type { GameBridge } from "../game/bridge";

export function PetsOverlay({ bridge }: { bridge: GameBridge }) {
  const state = useGameState(bridge);
  if (!state.petsOpen) return null;

  const active = state.pets.find((p) => p.id === state.activePetId);

  void active;

  return (
    <div className="overlay-backdrop" onClick={() => bridge.send({ type: "close-pets" })}>
      <div className="panel panel-lg" onClick={(e) => e.stopPropagation()}>
        <h2>🐶 我的宠物</h2>

        {state.pets.length === 0 && (
          <>
            <p>你还没有宠物，去 🐾 宠物店买一颗蛋吧！</p>
            <button className="btn btn-ghost" onClick={() => bridge.send({ type: "close-pets" })}>
              关闭
            </button>
          </>
        )}

        {state.pets.length > 0 && (
          <>
            <p className="panel-hint">
              🪵 卖木材加成：当前出战宠物 <b>+{state.petBonusPct}%</b>
            </p>
            <ul className="pet-list">
              {state.pets.map((pet) => {
                const isActive = pet.id === state.activePetId;
                const cost = starUpgradeCost({
                  id: pet.id,
                  species: pet.species,
                  quality: pet.quality,
                  stars: pet.stars,
                });
                return (
                  <li
                    key={pet.id}
                    className={`pet-card ${isActive ? "active" : ""}`}
                    style={{ borderColor: pet.qualityCss }}
                  >
                    <span className="pet-emoji">{pet.emoji}</span>
                    <div className="pet-info">
                      <div className="pet-name">
                        {pet.speciesName}
                        <span
                          className="pet-quality"
                          style={{ background: pet.qualityCss }}
                        >
                          {pet.qualityName}
                        </span>
                      </div>
                      <div className="pet-stars">
                        {"⭐".repeat(pet.stars)}
                        {"☆".repeat(Math.max(0, PET_MAX_STARS - pet.stars))}
                      </div>
                      <div className="pet-bonus">🪵 卖木加成 +{pet.bonusPct}%</div>
                    </div>
                    <div className="pet-actions">
                      {!isActive && (
                        <button
                          className="btn btn-sm"
                          onClick={() => bridge.send({ type: "select-pet", petId: pet.id })}
                        >
                          出战
                        </button>
                      )}
                      {isActive && <span className="pet-active-tag">出战中</span>}
                      {cost !== null ? (
                        <button
                          className="btn btn-sm btn-ghost"
                          disabled={state.money < cost}
                          onClick={() => bridge.send({ type: "upgrade-pet", petId: pet.id })}
                        >
                          升星 {cost}元
                        </button>
                      ) : (
                        <span className="pet-max">满星 ✨</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <button className="btn btn-ghost" onClick={() => bridge.send({ type: "close-pets" })}>
              关闭
            </button>
          </>
        )}
      </div>
    </div>
  );
}