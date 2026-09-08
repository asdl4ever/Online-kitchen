import { describe, expect, it } from "vitest";
import { areaAt } from "shared";

describe("client area mapping", () => {
  it("maps a player position inside the restaurant to the restaurant area", () => {
    const area = areaAt({ x: 0, y: 320 });
    expect(area?.kind).toBe("restaurant");
  });

  it("maps the forest position used by the scene to the forest area", () => {
    const area = areaAt({ x: 400, y: -300 });
    expect(area?.kind).toBe("forest");
  });
});