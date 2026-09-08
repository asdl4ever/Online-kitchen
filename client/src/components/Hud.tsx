import { DISHES } from "shared";
import { useGameState } from "../hooks/useGameState";
import type { GameBridge } from "../game/bridge";

export function Hud({
  bridge,
  areaLabel,
}: {
  bridge: GameBridge;
  areaLabel: string;
}) {
  const state = useGameState(bridge);

  const done = state.collection.reduce((n, e) => n + e.timesEaten, 0);
  const bindKey = state.bindings.openInventory ?? "KeyE";

  return (
    <div className="hud-top">
      <div className="hud-area">
        <span className="chip chip-area">📍 {areaLabel}</span>
      </div>
      <div className="hud-resources">
        <span className="chip" title="木材">🪵 {state.logs}</span>
        <span className="chip" title="金钱">💰 {state.money}</span>
        <button
          className="chip chip-btn"
          onClick={() => bridge.send({ type: "toggle-collection" })}
          title="美食收藏"
        >
          🍴 {done}/{DISHES.length}
        </button>
        {state.hasPhone && (
          <button
            className="chip chip-btn chip-phone"
            onClick={() => bridge.send({ type: "open-phone-app" })}
            title="打开餐厅 App 远程点餐"
          >
            📲 点餐
          </button>
        )}
      </div>
      <div className="hud-help">
        <p>按 {prettyKey(bindKey)} 打开背包 · Esc 设置</p>
        {!state.hasPhone && <p className="hud-tip">去 📱 手机店买手机，可远程点餐</p>}
        {state.prompt && <p className="hud-prompt">{state.prompt}</p>}
      </div>
    </div>
  );
}

function prettyKey(key: string): string {
  return key.replace(/^Key/, "").replace(/^Mouse0$/, "鼠标左键");
}