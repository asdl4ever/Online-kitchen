import type { Rect, Vec2 } from "./types";

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

/** Deterministic PRNG (mulberry32) so world layouts are stable across runs. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ForestGenOptions {
  seed?: number;
  count?: number;
  minDistance?: number;
  clusters?: number;
}

/**
 * Generates a naturally scattered forest: a few cluster centers with
 * gaussian-spread trees, rejecting positions that crowd existing ones.
 * Deterministic for a given seed.
 */
export function generateForestTrees(
  area: Rect,
  options: ForestGenOptions = {},
): Vec2[] {
  const seed = options.seed ?? 1337;
  const count = options.count ?? 30;
  const minDistance = options.minDistance ?? 44;
  const clusters = options.clusters ?? 3;

  const rand = mulberry32(seed);
  const points: Vec2[] = [];

  const centers: Vec2[] = [];
  for (let i = 0; i < clusters; i++) {
    centers.push({
      x: area.x + area.width * (0.2 + rand() * 0.6),
      y: area.y + area.height * (0.2 + rand() * 0.6),
    });
  }

  const spreadX = area.width * 0.16;
  const spreadY = area.height * 0.16;
  const maxAttempts = count * 60;

  for (let i = 0; i < count; i++) {
    let placed = false;
    for (let attempt = 0; attempt < maxAttempts && !placed; attempt++) {
      const center = centers[Math.floor(rand() * centers.length)];
      // Box-Muller gaussian spread around the cluster center.
      const u1 = Math.max(rand(), 1e-9);
      const u2 = rand();
      const g = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const x = center.x + g * spreadX;
      const u3 = Math.max(rand(), 1e-9);
      const u4 = rand();
      const g2 = Math.sqrt(-2 * Math.log(u3)) * Math.cos(2 * Math.PI * u4);
      const y = center.y + g2 * spreadY;

      if (x < area.x + 12 || x > area.x + area.width - 12) continue;
      if (y < area.y + 12 || y > area.y + area.height - 12) continue;

      // Crowding: allow a relaxed distance after many attempts so the
      // forest always fills even in tight areas.
      const required = attempt > maxAttempts * 0.7 ? minDistance * 0.55 : minDistance;
      const crowded = points.some(
        (p) => Math.hypot(p.x - x, p.y - y) < required,
      );
      if (crowded) continue;

      points.push({ x, y });
      placed = true;
    }
  }
  return points;
}