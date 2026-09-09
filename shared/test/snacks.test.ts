import { describe, expect, it } from "vitest";
import { SNACKS, getEdible, getDish, getSnack } from "../src/menu";

describe("street snacks", () => {
  it("defines cheap instant snacks", () => {
    expect(SNACKS.length).toBeGreaterThan(0);
    for (const snack of SNACKS) {
      expect(snack.price).toBeGreaterThan(0);
      expect(snack.cookSeconds).toBe(0);
    }
  });

  it("looks up snacks and edible items separately from dishes", () => {
    expect(getSnack("skewer")?.name).toBe("烤串");
    expect(getDish("skewer")).toBeUndefined();
    expect(getEdible("skewer")?.name).toBe("烤串");
    expect(getEdible("steak")?.name).toBe("香煎牛排");
    expect(getEdible("nope")).toBeUndefined();
  });
});
