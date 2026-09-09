import { SNACKS } from "shared";
import { useGameState } from "../hooks/useGameState";
import type { GameBridge } from "../game/bridge";

export function SnackStreetOverlay({ bridge }: { bridge: GameBridge }) {
  const state = useGameState(bridge);
  if (!state.snackStreetOpen) return null;

  return (
    <div className="overlay-backdrop" onClick={() => bridge.send({ type: "close-snacks" })}>
      <div className="panel panel-lg" onClick={(e) => e.stopPropagation()}>
        <h2>🍢 小吃街</h2>
        <p className="panel-balance">💰 余额 {state.money} 元</p>
        <p className="panel-hint">即买即吃，边走边吃，同样计入美食图鉴！</p>
        <ul className="dish-list">
          {SNACKS.map((snack) => {
            const affordable = state.money >= snack.price;
            return (
              <li key={snack.id} className="dish-row">
                <span className="dish-emoji">{snack.emoji}</span>
                <div className="dish-info">
                  <div className="dish-name">{snack.name}</div>
                  <div className="dish-meta">🏃 现买现吃</div>
                </div>
                <span className="dish-price">{snack.price} 元</span>
                <button
                  className="btn btn-sm"
                  disabled={!affordable}
                  onClick={() =>
                    bridge.send({ type: "order-snack", snackId: snack.id })
                  }
                >
                  {affordable ? "来一份" : "钱不够"}
                </button>
              </li>
            );
          })}
        </ul>
        <button className="btn btn-ghost" onClick={() => bridge.send({ type: "close-snacks" })}>
          🚪 离开
        </button>
      </div>
    </div>
  );
}