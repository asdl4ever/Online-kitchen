export interface FishSpecies {
  id: string;
  name: string;
  emoji: string;
  /** Spawn weight (rarer fish weigh less). */
  weight: number;
  /** Sell price per fish. */
  price: number;
}

export const FISHES: FishSpecies[] = [
  { id: "sardine", name: "沙丁鱼", emoji: "🐟", weight: 40, price: 8 },
  { id: "coral", name: "珊瑚鱼", emoji: "🐠", weight: 25, price: 15 },
  { id: "squid", name: "鱿鱼", emoji: "🦑", weight: 12, price: 25 },
  { id: "puffer", name: "河豚", emoji: "🐡", weight: 12, price: 30 },
  { id: "shark", name: "小鲨鱼", emoji: "🦈", weight: 7, price: 80 },
  { id: "octopus", name: "巨型章鱼", emoji: "🐙", weight: 3, price: 150 },
  { id: "whale", name: "传说鲸鱼", emoji: "🐳", weight: 1, price: 500 },
];

export const FISH_BITE_MIN_SECONDS = 2;
export const FISH_BITE_MAX_SECONDS = 6;
export const FISH_BITE_WINDOW_SECONDS = 1.5;

export function getFish(id: string): FishSpecies {
  return FISHES.find((f) => f.id === id)!;
}

/** Roll a random catch; deterministic for a given rng. */
export function rollFish(rng: () => number): FishSpecies {
  const total = FISHES.reduce((n, f) => n + f.weight, 0);
  let roll = rng() * total;
  for (const fish of FISHES) {
    roll -= fish.weight;
    if (roll < 0) return fish;
  }
  return FISHES[FISHES.length - 1];
}
