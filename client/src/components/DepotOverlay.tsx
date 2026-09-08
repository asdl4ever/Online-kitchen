import { WOOD_PRICE_PER_LOG } from "shared";
import { useGameState } from "../hooks/useGameState";
import type { GameBridge } from "../game/bridge";

export function DepotOverlay({ bridge }: { bridge: GameBridge }) {
  const state = useGameState(bridge);
  if (!state.depotOpen) return null;
  const value = state.logs * WOOD_PRICE_PER_LOG;

  return (
    <div className="overlay-backdrop" onClick={() => bridge.send({ type: "close-depot" })}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <h2>🏪 木材收购站</h2>
        <p>
          收购价：💰 <b>{WOOD_PRICE_PER_LOG}</b> 元 / 根 🪵
        </p>
        <p>
          你持有 🪵 <b>{state.logs}</b> 根，可卖 <b>{value}</b> 元
        </p>
        <button
          className="btn"
          disabled={state.logs <= 0}
          onClick={() => bridge.send({ type: "sell-all-logs" })}
        >
          {state.logs > 0 ? `💰 全部出售 (+${value})` : "🧺 没有木材可卖"}
        </button>
        <button className="btn btn-ghost" onClick={() => bridge.send({ type: "close-depot" })}>
          离开
        </button>
      </div>
    </div>
  );
}