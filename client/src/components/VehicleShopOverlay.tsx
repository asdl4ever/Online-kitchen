import { useGameState } from "../hooks/useGameState";
import type { GameBridge, VehicleView } from "../game/bridge";

/** Shared list UI for the bike shop (light) and the 4S dealership (luxury). */
export function VehicleShopOverlay({
  bridge,
  tier,
  title,
}: {
  bridge: GameBridge;
  tier: "light" | "luxury";
  title: string;
}) {
  const state = useGameState(bridge);
  const open = tier === "light" ? state.carShopOpen : state.dealershipOpen;
  if (!open) return null;

  const stock = state.vehicles.filter((v) => v.tier === tier);

  return (
    <div
      className="overlay-backdrop"
      onClick={() =>
        bridge.send(
          tier === "light" ? { type: "close-car-shop" } : { type: "close-dealership" },
        )
      }
    >
      <div className="panel panel-lg" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p className="panel-balance">💰 余额 {state.money} 元</p>
        <p className="panel-hint">🛣️ 载具提升大地图移速；已拥有的可以直接切换上路。</p>
        <ul className="dish-list">
          {stock.map((v: VehicleView) => (
            <li key={v.id} className="dish-row">
              <span className="dish-emoji">{v.emoji}</span>
              <div className="dish-info">
                <div className="dish-name">{v.name}</div>
                <div className="dish-meta">移速 ×{v.speedMult}</div>
              </div>
              <span className="dish-price">{v.price} 元</span>
              {v.owned ? (
                <button
                  className={`btn btn-sm ${v.active ? "btn-ghost" : ""}`}
                  onClick={() => bridge.send({ type: "select-vehicle", vehicleId: v.id })}
                >
                  {v.active ? "🅿️ 收起" : "🛣️ 上路"}
                </button>
              ) : (
                <button
                  className="btn btn-sm"
                  disabled={state.money < v.price}
                  onClick={() => bridge.send({ type: "buy-vehicle", vehicleId: v.id })}
                >
                  {state.money >= v.price ? "提车" : "钱不够"}
                </button>
              )}
            </li>
          ))}
        </ul>
        <button
          className="btn btn-ghost"
          onClick={() =>
            bridge.send(
              tier === "light" ? { type: "close-car-shop" } : { type: "close-dealership" },
            )
          }
        >
          🚪 离开
        </button>
      </div>
    </div>
  );
}

export function CarShopOverlay({ bridge }: { bridge: GameBridge }) {
  return <VehicleShopOverlay bridge={bridge} tier="light" title="🛵 车行" />;
}

export function DealershipOverlay({ bridge }: { bridge: GameBridge }) {
  return <VehicleShopOverlay bridge={bridge} tier="luxury" title="🏎️ 4S 店" />;
}