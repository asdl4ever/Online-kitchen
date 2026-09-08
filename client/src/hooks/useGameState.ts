import { useSyncExternalStore } from "react";
import type { GameBridge, GameUiState } from "../game/bridge";

export function useGameState(bridge: GameBridge): GameUiState {
  return useSyncExternalStore(
    (cb) => bridge.subscribe(cb),
    () => bridge.getSnapshot(),
  );
}