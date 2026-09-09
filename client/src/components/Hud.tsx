import { DISHES } from "shared";
import { useGameState } from "../hooks/useGameState";
import type { GameBridge } from "../game/bridge";

const AREA_EMOJI: Record<string, string> = {
  出生广场: "⛲",
  树林: "🌲",
  木材店: "🪵",
  餐厅: "🍽️",
  手机店: "📱",
  小镇: "🏡",
  小吃街: "🍢",
  电玩店: "🕹️",
  赌场: "🎰",
  野外地带: "🌾",
};

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
        <span className="chip chip-area">
          {AREA_EMOJI[areaLabel] ?? "📍"} {areaLabel}
        </span>
      </div>
      <div className="hud-resources">
        <span className="chip" title="木材">
          🪵 <b>{state.logs}</b>
        </span>
        <span className="chip" title="金钱">
          💰 <b>{state.money}</b>
        </span>
        <button
          className="chip chip-btn"
          onClick={() => bridge.send({ type: "toggle-collection" })}
          title="美食收藏"
        >
          🍴 <b>{done}</b>/{DISHES.length}
        </button>
        <button
          className="chip chip-btn"
          onClick={() => bridge.send({ type: "open-pets" })}
          title="我的宠物"
        >
          🐶 {state.pets.length}
          {state.petBonusPct > 0 && (
            <span className="chip-sub">+{state.petBonusPct}%</span>
          )}
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
        <p>
          <kbd>{prettyKey(bindKey)}</kbd> 背包 · <kbd>Esc</kbd> 设置 · <kbd>M</kbd> 地图
        </p>
        {!state.hasPhone && (
          <p className="hud-tip">💡 去 📱 手机店买手机，可远程点餐</p>
        )}
        {state.prompt && <p className="hud-prompt">{state.prompt}</p>}
      </div>
    </div>
  );
}

function prettyKey(key: string): string {
  return key.replace(/^Key/, "").replace(/^Mouse0$/, "鼠标左键");
}