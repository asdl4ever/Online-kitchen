import { describe, expect, it } from "vitest";
import {
  chopTree,
  makeTree,
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