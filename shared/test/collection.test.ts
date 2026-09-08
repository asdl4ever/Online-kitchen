import { describe, expect, it } from "vitest";
import {
  makeFoodCollection,
  recordEat,
  sortedCollection,
} from "../src/collection";

describe("food collection", () => {
  it("records a first taste", () => {
    const collection = makeFoodCollection();
    const entry = recordEat({
      collection,
      dishId: "steak",
      nowSeconds: 10,
    });
    expect(entry.timesEaten).toBe(1);
    expect(entry.firstEatenAtSeconds).toBe(10);
    expect(entry.lastEatenAtSeconds).toBe(10);
  });

  it("increments repeated tastes", () => {
    const collection = makeFoodCollection();
    recordEat({ collection, dishId: "soup", nowSeconds: 1 });
    const second = recordEat({ collection, dishId: "soup", nowSeconds: 5 });
    expect(second.timesEaten).toBe(2);
    expect(second.lastEatenAtSeconds).toBe(5);
    expect(second.firstEatenAtSeconds).toBe(1);
  });

  it("sorts entries by last eaten time", () => {
    const collection = makeFoodCollection();
    recordEat({ collection, dishId: "b", nowSeconds: 20 });
    recordEat({ collection, dishId: "a", nowSeconds: 5 });
    recordEat({ collection, dishId: "c", nowSeconds: 30 });
    const sorted = sortedCollection(collection);
    expect(sorted.map((e) => e.dishId)).toEqual(["a", "b", "c"]);
  });
});