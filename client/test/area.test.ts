import { describe, expect, it } from "vitest";
import { areaAt } from "shared";

describe("client area mapping", () => {
  it("maps a player position inside the restaurant to the restaurant area", () => {
    const area = areaAt({ x: 0, y: 500 });
    expect(area?.kind).toBe("restaurant");
  });

  it("maps the forest position used by the scene to the forest area", () => {
    const area = areaAt({ x: 800, y: -750 });
    expect(area?.kind).toBe("forest");
  });
});