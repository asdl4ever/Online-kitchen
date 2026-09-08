import { useGameState } from "../hooks/useGameState";
import type { GameBridge } from "../game/bridge";

export function BackpackOverlay({ bridge }: { bridge: GameBridge }) {
  const state = useGameState(bridge);
  if (!state.inventoryOpen) return null;

  return (
    <div className="overlay-backdrop" onClick={() => bridge.send({ type: "toggle-inventory" })}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <h2>🎒 我的背包</h2>
        <ul className="inv-list">
          <li>
            🪵 木材 <b>{state.logs}</b> 根
          </li>
          <li>
            💰 金币 <b>{state.money}</b> 元
          </li>
          {state.hasPhone && <li>📱 手机（可远程点餐）</li>}
        </ul>
        <p className="panel-hint">🌲 砍树获得木材，去 🏪 木材店出售换钱。</p>
        <button className="btn" onClick={() => bridge.send({ type: "toggle-inventory" })}>
          关闭
        </button>
      </div>
    </div>
  );
}