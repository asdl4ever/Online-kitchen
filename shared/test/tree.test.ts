import { describe, expect, it } from "vitest";
import {
  chopTree,
  generateForestTrees,
  makeTree,
  mulberry32,
  scheduleRegrow,
  tickForest,
  TREE_DEFAULT_MAX_HP,
  type ForestState,
} from "../src/tree";

describe("tree rules", () => {
  it("chops a tree down after enough damage and drops logs", () => {
    const tree = makeTree("t1", { x: 0, y: 0 });
    const first = chopTree(tree, 2);
    expect(first).toEqual({ completed: false, logDropped: 0 });
    expect(tree.hp).toBe(TREE_DEFAULT_MAX_HP - 2);

    const last = chopTree(tree, TREE_DEFAULT_MAX_HP);
    expect(last.completed).toBe(true);
    expect(last.logDropped).toBe(1);
    expect(tree.state).toBe("stump");
    expect(tree.hp).toBe(0);
  });

  it("does not chop a stump", () => {
    const tree = makeTree("t1", { x: 0, y: 0 }, { state: "stump" });
    expect(chopTree(tree, 10)).toEqual({ completed: false, logDropped: 0 });
  });

  it("schedules regrowth and restores the tree after the timer", () => {
    const tree = makeTree("t1", { x: 0, y: 0 });
    chopTree(tree, TREE_DEFAULT_MAX_HP);
    scheduleRegrow(tree, 100);
    expect(tree.regrowAt).toBe(110);

    const forest: ForestState = { trees: [tree] };
    tickForest(forest, 109.9);
    expect(tree.state).toBe("stump");

    tickForest(forest, 110);
    expect(tree.state).toBe("standing");
    expect(tree.hp).toBe(TREE_DEFAULT_MAX_HP);
    expect(tree.regrowAt).toBeNull();
  });

  it("honors custom log drop amount", () => {
    const tree = makeTree("t2", { x: 5, y: 5 }, { logDrop: 3 });
    chopTree(tree, tree.maxHp);
    expect(tree.logDrop).toBe(3);
  });
});

describe("natural forest generation", () => {
  const area = { x: 0, y: 0, width: 330, height: 280 };

  it("generates the requested number of trees inside the area", () => {
    const trees = generateForestTrees(area, { seed: 1, count: 30 });
    expect(trees).toHaveLength(30);
    for (const t of trees) {
      expect(t.x).toBeGreaterThanOrEqual(area.x);
      expect(t.x).toBeLessThanOrEqual(area.x + area.width);
      expect(t.y).toBeGreaterThanOrEqual(area.y);
      expect(t.y).toBeLessThanOrEqual(area.y + area.height);
    }
  });

  it("keeps trees from crowding each other", () => {
    const trees = generateForestTrees(area, { seed: 1, count: 30, minDistance: 44 });
    for (let i = 0; i < trees.length; i++) {
      for (let j = i + 1; j < trees.length; j++) {
        const d = Math.hypot(trees[i].x - trees[j].x, trees[i].y - trees[j].y);
        expect(d).toBeGreaterThanOrEqual(20);
      }
    }
  });

  it("is deterministic for the same seed", () => {
    const a = generateForestTrees(area, { seed: 99, count: 20 });
    const b = generateForestTrees(area, { seed: 99, count: 20 });
    expect(a).toEqual(b);
  });

  it("mulberry32 yields a stable sequence", () => {
    const r1 = mulberry32(7);
    const r2 = mulberry32(7);
    const seq1 = [r1(), r1(), r1()];
    const seq2 = [r2(), r2(), r2()];
    expect(seq1).toEqual(seq2);
    expect(new Set(seq1).size).toBe(3);
  });
});