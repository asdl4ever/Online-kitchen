export interface FoodEntry {
  dishId: string;
  timesEaten: number;
  firstEatenAtSeconds: number;
  lastEatenAtSeconds: number;
}

export interface FoodCollection {
  entries: Record<string, FoodEntry>;
}

export function makeFoodCollection(): FoodCollection {
  return { entries: {} };
}

export interface RecordEatInput {
  collection: FoodCollection;
  dishId: string;
  nowSeconds: number;
}

export function recordEat(input: RecordEatInput): FoodEntry {
  const existing = input.collection.entries[input.dishId];
  if (!existing) {
    const entry: FoodEntry = {
      dishId: input.dishId,
      timesEaten: 1,
      firstEatenAtSeconds: input.nowSeconds,
      lastEatenAtSeconds: input.nowSeconds,
    };
    input.collection.entries[input.dishId] = entry;
    return entry;
  }
  existing.timesEaten += 1;
  existing.lastEatenAtSeconds = input.nowSeconds;
  return existing;
}

export function sortedCollection(
  collection: FoodCollection,
): FoodEntry[] {
  return Object.values(collection.entries).sort((a, b) =>
    a.lastEatenAtSeconds - b.lastEatenAtSeconds,
  );
}