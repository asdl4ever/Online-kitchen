import { describe, expect, it } from "vitest";
import {
  SLOT_SYMBOLS,
  SLOT_WEIGHTS,
  SLOT_PAIR_MULTIPLIER,
  SLOT_TRIPLE_MULTIPLIER,
  SLOT_TRIPLE_SEVEN_MULTIPLIER,
  spinSlots,
} from "../src/casino";

describe("slot machine", () => {
  it("returns three reels", () => {
    const result = spinSlots(() => 0.1);
    expect(result.reels).toHaveLength(3);
    for (const reel of result.reels) {
      expect(SLOT_SYMBOLS).toContain(reel);
    }
  });

  it("weights rare symbols less", () => {
    const total = SLOT_SYMBOLS.reduce((n, s) => n + SLOT_WEIGHTS[s], 0);
    expect(SLOT_WEIGHTS["7️⃣"]).toBeLessThan(SLOT_WEIGHTS["🍒"]);
    expect(total).toBeGreaterThan(0);
  });

  it("pays triple seven with the jackpot multiplier", () => {
    // rng values that map every pick into the 7️⃣ weight bucket (last slot).
    const result = spinSlots(() => 0.99);
    expect(result.reels).toEqual(["7️⃣", "7️⃣", "7️⃣"]);
    expect(result.multiplier).toBe(SLOT_TRIPLE_SEVEN_MULTIPLIER);
  });

  it("pays a non-seven triple with the triple multiplier", () => {
    const result = spinSlots(() => 0);
    expect(result.reels).toEqual(["🍒", "🍒", "🍒"]);
    expect(result.multiplier).toBe(SLOT_TRIPLE_MULTIPLIER);
  });

  it("pays pairs at the pair multiplier", () => {
    // First two picks 🍒 (0..5), third 🍋 (5..10).
    let call = 0;
    const rng = () => {
      call += 1;
      return call <= 2 ? 0.1 : 0.3;
    };
    const result = spinSlots(rng);
    expect(result.reels).toEqual(["🍒", "🍒", "🍋"]);
    expect(result.multiplier).toBe(SLOT_PAIR_MULTIPLIER);
  });

  it("pays nothing on a full miss", () => {
    let call = 0;
    const rng = () => {
      call += 1;
      // 🍒, 🍋, 🍇
      return call === 1 ? 0.1 : call === 2 ? 0.3 : 0.5;
    };
    const result = spinSlots(rng);
    expect(result.multiplier).toBe(0);
  });
});