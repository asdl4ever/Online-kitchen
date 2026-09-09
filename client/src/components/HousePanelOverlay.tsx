import { useGameState } from "../hooks/useGameState";
import type { GameBridge } from "../game/bridge";

/** Buy-a-house confirmation panel shown at a for-sale door. */
export function HousePanelOverlay({ bridge }: { bridge: GameBridge }) {
  const state = useGameState(bridge);
  const panel = state.housePanel;
  if (!panel) return null;

  return (
    <div className="overlay-backdrop" onClick={() => bridge.send({ type: "close-house-panel" })}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <h2>
          {panel.emoji} {panel.name}
        </h2>
        <p>
          售价 <b>{panel.price}</b> 元
        </p>
        <p className="panel-balance">💰 余额 {state.money} 元</p>
        <p className="panel-hint">
          💡 买房后可以入住，从 🛋️ 家具店买家具装点新家；舒适度还能加成鱼价！
        </p>
        <button
          className="btn"
          disabled={state.money < panel.price}
          onClick={() => bridge.send({ type: "buy-house", houseId: panel.houseId })}
        >
          {state.money >= panel.price ? "🔑 买下入住" : "钱不够哦"}
        </button>
        <button className="btn btn-ghost" onClick={() => bridge.send({ type: "close-house-panel" })}>
          再逛逛
        </button>
      </div>
    </div>
  );
}