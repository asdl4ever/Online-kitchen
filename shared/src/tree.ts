import type { Vec2 } from "./types";

export type TreeState = "standing" | "stump";

export interface Tree {
  id: string;
  position: Vec2;
  maxHp: number;
  hp: number;
  state: TreeState;
  /** When a standing tree is fully chopped, it drops this many logs. */
  logDrop: number;
  /** Stump regeneration: seconds until fully regrown. */
  regrowSeconds: number;
  /** Timestamp (game seconds at server/clock) when regrowth completes. */
  regrowAt: number | null;
}

export interface ForestState {
  trees: Tree[];
}

export interface ChopResult {
  completed: boolean;
  logDropped: number;
}

export const TREE_DEFAULT_MAX_HP = 5;
export const TREE_DEFAULT_LOG_DROP = 1;
export const TREE_DEFAULT_REGROW_SECONDS = 10;

export function makeTree(
  id: string,
  position: Vec2,
  overrides: Partial<Tree> = {},
): Tree {
  return {
    id,
    position,
    maxHp: overrides.maxHp ?? TREE_DEFAULT_MAX_HP,
    hp: overrides.hp ?? overrides.maxHp ?? TREE_DEFAULT_MAX_HP,
    state: overrides.state ?? "standing",
    logDrop: overrides.logDrop ?? TREE_DEFAULT_LOG_DROP,
    regrowSeconds: overrides.regrowSeconds ?? TREE_DEFAULT_REGROW_SECONDS,
    regrowAt: overrides.regrowAt ?? null,
  };
}

/** Constant damage-rate helper: chops a fixed amount of hp during one tick. */
export function chopTree(tree: Tree, damage: number): ChopResult {
  if (tree.state !== "standing") return { completed: false, logDropped: 0 };
  tree.hp = Math.max(0, tree.hp - damage);
  if (tree.hp > 0) return { completed: false, logDropped: 0 };
  tree.state = "stump";
  tree.regrowAt = null; // set by tick with an absolute time
  return { completed: true, logDropped: tree.logDrop };
}

/** Advance forest time: regrow stumps once their time has passed. */
export function tickForest(forest: ForestState, nowSeconds: number): void {
  for (const tree of forest.trees) {
    if (tree.state === "stump" && tree.regrowAt !== null && nowSeconds >= tree.regrowAt) {
      tree.state = "standing";
      tree.hp = tree.maxHp;
      tree.regrowAt = null;
    }
  }
}

/** Mark a stump to regrow after `nowSeconds + tree.regrowSeconds`. */
export function scheduleRegrow(tree: Tree, nowSeconds: number): void {
  if (tree.state === "stump") {
    tree.regrowAt = nowSeconds + tree.regrowSeconds;
  }
}