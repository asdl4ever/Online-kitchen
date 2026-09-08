import { describe, expect, it } from "vitest";
import { areaAt, clampToWorld, WORLD_BOUNDS } from "../src/index";

describe("clampToWorld", () => {
  it("keeps positions inside the world bounds untouched", () => {
    expect(clampToWorld({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it("clamps positions beyond the northern-east corner", () => {
    const result = clampToWorld({ x: 9999, y: -9999 });
    expect(result.x).toBe(WORLD_BOUNDS.x + WORLD_BOUNDS.width);
    expect(result.y).toBe(WORLD_BOUNDS.x); // y is clamped to top edge = WORLD_BOUNDS.y
  });

  it("clamps positions beyond the southern-west corner", () => {
    const result = clampToWorld({ x: -9999, y: 9999 });
    expect(result.x).toBe(WORLD_BOUNDS.x);
    expect(result.y).toBe(WORLD_BOUNDS.y + WORLD_BOUNDS.height);
  });
});

describe("areaAt", () => {
  it("finds the spawn area at origin", () => {
    const area = areaAt({ x: 0, y: 0 });
    expect(area?.kind).toBe("spawn");
  });

  it("finds the forest area", () => {
    const area = areaAt({ x: 400, y: -300 });
    expect(area?.kind).toBe("forest");
  });

  it("returns undefined outside any area", () => {
    expect(areaAt({ x: 0, y: 200 })).toBeUndefined();
  });
});