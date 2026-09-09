import { useGameState } from "../hooks/useGameState";
import type { GameBridge } from "../game/bridge";

export function FishMarketOverlay({ bridge }: { bridge: GameBridge }) {
  const state = useGameState(bridge);
  if (!state.fishMarketOpen) return null;

  const total = state.fishBag.reduce((n, f) => n + f.count, 0);
  const raw = state.fishBag.reduce((n, f) => n + f.count * f.price, 0);
  const value = Math.floor(raw * (1 + state.comfort / 100));

  return (
    <div className="overlay-backdrop" onClick={() => bridge.send({ type: "close-fish-market" })}>
      <div className="panel panel-lg" onClick={(e) => e.stopPropagation()}>
        <h2>🐟 渔获收购</h2>
        {state.comfort > 0 && (
          <p className="panel-hint">🛋️ 家具舒适度加成 +{state.comfort}%</p>
        )}
        {total === 0 ? (
          <p>鱼篓空空，去码头 🎣 钓点鱼吧！</p>
        ) : (
          <ul className="dish-list">
            {state.fishBag.map((f) => (
              <li key={f.id} className="dish-row">
                <span className="dish-emoji">{f.emoji}</span>
                <div className="dish-info">
                  <div className="dish-name">{f.name}</div>
                  <div className="dish-meta">单价 {f.price} 元</div>
                </div>
                <span className="dish-price">x{f.count}</span>
              </li>
            ))}
          </ul>
        )}
        {total > 0 && (
          <p className="panel-balance">
            共 {total} 条，可卖 <b>{value}</b> 元
          </p>
        )}
        <button
          className="btn"
          disabled={total === 0}
          onClick={() => bridge.send({ type: "sell-fish" })}
        >
          {total > 0 ? `💰 全部出售 (+${value})` : "🪣 没有渔获"}
        </button>
        <button className="btn btn-ghost" onClick={() => bridge.send({ type: "close-fish-market" })}>
          离开
        </button>
      </div>
    </div>
  );
}