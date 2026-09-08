import { DISHES, getDish } from "shared";
import { useGameState } from "../hooks/useGameState";
import type { GameBridge } from "../game/bridge";

export function CollectionOverlay({ bridge }: { bridge: GameBridge }) {
  const state = useGameState(bridge);
  if (!state.collectionOpen) return null;

  const byDish = new Map(state.collection.map((e) => [e.dishId, e]));

  return (
    <div className="overlay-backdrop" onClick={() => bridge.send({ type: "toggle-collection" })}>
      <div className="panel panel-lg" onClick={(e) => e.stopPropagation()}>
        <h2>🍴 美食收藏</h2>
        <ul className="collection-grid">
          {DISHES.map((dish) => {
            const entry = byDish.get(dish.id);
            const eaten = entry?.timesEaten ?? 0;
            return (
              <li
                key={dish.id}
                className={`collection-item ${eaten > 0 ? "eaten" : "locked"}`}
              >
                <span className="collection-emoji">{eaten > 0 ? dish.emoji : "❓"}</span>
                <span className="collection-name">
                  {eaten > 0 ? dish.name : "???"}
                </span>
                {eaten > 0 ? (
                  <span className="collection-count">已吃 x{eaten}</span>
                ) : (
                  <span className="collection-hint">{getDish(dish.id)?.price} 元解锁</span>
                )}
              </li>
            );
          })}
        </ul>
        <button className="btn" onClick={() => bridge.send({ type: "toggle-collection" })}>
          关闭
        </button>
      </div>
    </div>
  );
}