import { describe, expect, it } from "vitest";
import {
  FISHES,
  getFish,
  rollFish,
  FISH_BITE_WINDOW_SECONDS,
} from "../src/fishing";
import {
  PROPERTIES,
  FURNITURE,
  HOUSE_FURNITURE_SLOTS,
  comfortOf,
  getFurniture,
} from "../src/property";
import { VEHICLES, getVehicle } from "../src/vehicles";
import { reactionReward, REACTION_ENTRY_FEE } from "../src/arcade";
import { rollDice, diceMultiplier } from "../src/casino";

describe("fishing", () => {
  it("defines a spread of fish with growing rarity", () => {
    expect(FISHES.length).toBeGreaterThanOrEqual(5);
    const prices = FISHES.map((f) => f.price);
    expect(Math.min(...prices)).toBeLessThan(Math.max(...prices) / 10);
  });

  it("rolls within the pool and is deterministic", () => {
    const a = rollFish(() => 0);
    const b = rollFish(() => 0);
    expect(a).toEqual(b);
    expect(FISHES).toContain(a);
  });

  it("can roll the rarest fish with the right rng", () => {
    const whale = rollFish(() => 0.999);
    expect(whale.id).toBe("whale");
    expect(getFish("whale").price).toBe(500);
  });

  it("gives the player a fair bite window", () => {
    expect(FISH_BITE_WINDOW_SECONDS).toBeGreaterThanOrEqual(1);
  });
});

describe("property & furniture", () => {
  it("lists properties with prices", () => {
    for (const p of PROPERTIES) expect(p.price).toBeGreaterThan(0);
  });

  it("sums comfort across placed furniture", () => {
    const slots = ["sofa", "bed", null, "plant"];
    expect(comfortOf(slots)).toBe(5 + 8 + 3);
  });

  it("caps nothing but respects the slot count constant", () => {
    expect(HOUSE_FURNITURE_SLOTS).toBeGreaterThanOrEqual(3);
    expect(getFurniture("tv").comfort).toBeGreaterThan(0);
    expect(FURNITURE.length).toBeGreaterThanOrEqual(5);
  });
});

describe("vehicles", () => {
  it("sells light vehicles cheaper than luxury ones", () => {
    const light = VEHICLES.filter((v) => v.tier === "light");
    const luxury = VEHICLES.filter((v) => v.tier === "luxury");
    expect(Math.max(...light.map((v) => v.price))).toBeLessThan(
      Math.min(...luxury.map((v) => v.price)),
    );
  });

  it("looks vehicles up by id", () => {
    expect(getVehicle("sport").speedMult).toBeGreaterThan(
      getVehicle("bike").speedMult,
    );
  });
});

describe("reaction game", () => {
  it("rewards faster reactions more", () => {
    expect(reactionReward(150)).toBeGreaterThan(reactionReward(250));
    expect(reactionReward(250)).toBeGreaterThan(reactionReward(450));
    expect(reactionReward(1000)).toBeGreaterThan(0);
    expect(reactionReward(-5)).toBe(0);
    expect(REACTION_ENTRY_FEE).toBeGreaterThan(0);
  });
});

describe("dice game", () => {
  it("classifies sums into big/small/seven", () => {
    expect(rollDice(() => 0).side).toBe("small"); // 1+1=2
    expect(rollDice(() => 0.99).side).toBe("big"); // 6+6=12
  });

  it("a seven always loses regardless of the guess", () => {
    // 3+4=7 -> rng values that yield 3 and 4
    let call = 0;
    const roll = rollDice(() => (call++ === 0 ? 2 / 6 : 3 / 6));
    expect(roll.sum).toBe(7);
    expect(diceMultiplier(roll, "big")).toBe(0);
    expect(diceMultiplier(roll, "small")).toBe(0);
  });

  it("pays a correct guess and not a wrong one", () => {
    const roll = rollDice(() => 0); // sum 2 = small
    expect(diceMultiplier(roll, "small")).toBeGreaterThan(1);
    expect(diceMultiplier(roll, "big")).toBe(0);
  });
});
