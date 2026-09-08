import { useEffect } from "react";
import { useGameState } from "../hooks/useGameState";
import type { GameBridge } from "../game/bridge";

export const ITEM_INFO: Record<string, { emoji: string; name: string }> = {
  axe: { emoji: "🪓", name: "斧头" },
};

const SLOT_KEYS = ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0"];

export function Hotbar({ bridge }: { bridge: GameBridge }) {
  const state = useGameState(bridge);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const idx = SLOT_KEYS.indexOf(e.code);
      if (idx >= 0) {
        bridge.send({ type: "select-slot", index: idx });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bridge]);

  return (
    <div className="hotbar">
      {state.hotbar.map((item, i) => {
        const selected = state.selectedSlot === i;
        const info = item ? ITEM_INFO[item] : null;
        return (
          <button
            key={i}
            className={`hotbar-slot ${selected ? "selected" : ""} ${item ? "" : "empty"}`}
            title={info ? info.name : "空格子"}
            onClick={() => bridge.send({ type: "select-slot", index: i })}
          >
            {info ? <span className="hotbar-emoji">{info.emoji}</span> : <span className="hotbar-none">·</span>}
            <span className="hotbar-key">{(i + 1) % 10}</span>
          </button>
        );
      })}
    </div>
  );
}