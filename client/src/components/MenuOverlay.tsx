import { DISHES } from "shared";
import { useGameState } from "../hooks/useGameState";
import type { GameBridge } from "../game/bridge";

export function MenuOverlay({ bridge }: { bridge: GameBridge }) {
  const state = useGameState(bridge);
  if (!state.menuOpen) return null;

  return (
    <div className="overlay-backdrop" onClick={() => bridge.send({ type: "close-menu" })}>
      <div className="panel panel-lg" onClick={(e) => e.stopPropagation()}>
        <h2>🍜 今日菜单</h2>
        <p className="panel-balance">余额：💰 {state.money}</p>
        <ul className="dish-list">
          {DISHES.map((dish) => {
            const affordable = state.money >= dish.price;
            return (
              <li key={dish.id} className="dish-row">
                <span className="dish-emoji">{dish.emoji}</span>
                <div className="dish-info">
                  <div className="dish-name">{dish.name}</div>
                  <div className="dish-meta">出菜约 {dish.cookSeconds}s</div>
                </div>
                <span className="dish-price">💰 {dish.price}</span>
                <button
                  className="btn btn-sm"
                  disabled={!affordable}
                  onClick={() =>
                    bridge.send({ type: "order-food", dishId: dish.id })
                  }
                >
                  {affordable ? "点单" : "钱不够"}
                </button>
              </li>
            );
          })}
        </ul>
        <button className="btn" onClick={() => bridge.send({ type: "close-menu" })}>
          离开
        </button>
      </div>
    </div>
  );
}