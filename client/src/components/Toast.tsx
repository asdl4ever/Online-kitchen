import { useGameState } from "../hooks/useGameState";
import type { GameBridge } from "../game/bridge";

export function Toast({ bridge }: { bridge: GameBridge }) {
  const state = useGameState(bridge);
  if (!state.toast) return null;
  return (
    <div className="toast" key={state.toast.id}>
      <span className="toast-emoji">{state.toast.emoji ?? "💬"}</span>
      <span>{state.toast.text}</span>
    </div>
  );
}