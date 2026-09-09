import { FURNITURE, HOUSE_FURNITURE_SLOTS } from "shared";
import { useGameState } from "../hooks/useGameState";
import type { GameBridge } from "../game/bridge";

export function FurnitureOverlay({ bridge }: { bridge: GameBridge }) {
  const state = useGameState(bridge);
  if (!state.furnitureOpen) return null;

  const activeHouse = state.ownedHouses.length > 0 ? state.ownedHouses[0] : null;
  const usedSlots = state.ownedHouses.length > 0 ? Math.min(state.comfort > 0 ? 4 : 0, HOUSE_FURNITURE_SLOTS) : 0;
  void usedSlots;

  return (
    <div className="overlay-backdrop" onClick={() => bridge.send({ type: "close-furniture" })}>
      <div className="panel panel-lg" onClick={(e) => e.stopPropagation()}>
        <h2>🛋️ 家具店</h2>
        <p className="panel-balance">💰 余额 {state.money} 元</p>
        {!activeHouse ? (
          <p className="panel-hint">🏠 先买一套房子，家具才能搬进去（家具提升舒适度→鱼价加成）。</p>
        ) : (
          <p className="panel-hint">
            🏠 当前舒适度 <b>{state.comfort}%</b>（鱼价加成），家具会放进家里的空位。
          </p>
        )}
        <ul className="dish-list">
          {FURNITURE.map((item) => {
            const affordable = state.money >= item.price && !!activeHouse;
            return (
              <li key={item.id} className="dish-row">
                <span className="dish-emoji">{item.emoji}</span>
                <div className="dish-info">
                  <div className="dish-name">{item.name}</div>
                  <div className="dish-meta">舒适度 +{item.comfort}%</div>
                </div>
                <span className="dish-price">{item.price} 元</span>
                <button
                  className="btn btn-sm"
                  disabled={!affordable}
                  onClick={() => bridge.send({ type: "buy-furniture", furnitureId: item.id })}
                >
                  {affordable ? "买入" : "买不了"}
                </button>
              </li>
            );
          })}
        </ul>
        <button className="btn btn-ghost" onClick={() => bridge.send({ type: "close-furniture" })}>
          🚪 离开
        </button>
      </div>
    </div>
  );
}