import { describe, expect, it } from "vitest";
import {
  GameBridge,
  GAME_BRIDGE_KEY,
  type GameUiState,
} from "../src/game/bridge";

function makeBridge(): GameBridge {
  return new GameBridge({
    bindings: { openInventory: "KeyE" },
    audio: { master: 1, music: 1, sfx: 1 },
  });
}

function snap(bridge: GameBridge): GameUiState {
  return bridge.getSnapshot();
}

describe("game bridge contract", () => {
  it("exposes a stable registry key for handing the bridge to the scene", () => {
    expect(GAME_BRIDGE_KEY).toBe("game-bridge");
  });

  it("defaults initial UI state to empty resources and closed panels", () => {
    const s = snap(makeBridge());
    expect(s.logs).toBe(0);
    expect(s.money).toBe(0);
    expect(s.hasPhone).toBe(false);
    expect(s.inventoryOpen).toBe(false);
    expect(s.prompt).toBeNull();
  });

  it("routes commands to registered handlers and reports no-handler otherwise", () => {
    const bridge = makeBridge();
    let caught = false;
    bridge.on("toggle-inventory", () => {
      caught = true;
    });
    expect(bridge.send({ type: "toggle-inventory" }).ok).toBe(true);
    expect(caught).toBe(true);
    const unknown = bridge.send({ type: "close-menu" });
    expect(unknown.ok).toBe(false);
    expect(unknown.reason).toBe("no-handler");
  });

  it("notifies subscribers on patch", () => {
    const bridge = makeBridge();
    let notified = 0;
    bridge.subscribe(() => {
      notified += 1;
    });
    bridge.patch({ logs: 3 });
    expect(snap(bridge).logs).toBe(3);
    expect(notified).toBeGreaterThan(0);
  });
});