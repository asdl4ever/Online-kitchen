import { describe, expect, it } from "vitest";
import {
  DEFAULT_BINDINGS,
  effectiveVolume,
  makeAudioSettings,
  rebind,
} from "../src/settings";

describe("audio settings", () => {
  it("clamps volumes into [0,1]", () => {
    const audio = makeAudioSettings({ master: 2, music: -3 });
    expect(audio.master).toBe(1);
    expect(audio.music).toBe(0);
  });

  it("computes effective volume as product", () => {
    const audio = makeAudioSettings({ master: 1, music: 0.5, sfx: 0.5 });
    expect(effectiveVolume(audio)).toBe(0.25);
  });
});

describe("key rebinding", () => {
  it("rebinds an action to a new key", () => {
    const result = rebind({
      bindings: { ...DEFAULT_BINDINGS },
      action: "interact",
      key: "KeyQ",
    });
    expect(result.ok).toBe(true);
    expect(result.bindings.interact).toBe("KeyQ");
    expect(result.stolenFrom).toEqual([]);
  });

  it("resolves conflicts by resetting the stolen action to default", () => {
    const result = rebind({
      bindings: { ...DEFAULT_BINDINGS },
      action: "interact",
      key: "KeyE", // openInventory default
    });
    expect(result.stolenFrom).toContain("openInventory");
    expect(result.bindings.openInventory).toBe(DEFAULT_BINDINGS.openInventory);
  });

  it("does not mutate the input bindings object", () => {
    const original = { ...DEFAULT_BINDINGS };
    rebind({ bindings: original, action: "interact", key: "KeyQ" });
    expect(original.interact).toBe(DEFAULT_BINDINGS.interact);
  });
});