export type SlotSymbol = "🍒" | "🍋" | "🍇" | "🔔" | "⭐" | "7️⃣";

export const SLOT_SYMBOLS: SlotSymbol[] = ["🍒", "🍋", "🍇", "🔔", "⭐", "7️⃣"];

/** Rarer symbols are less likely: total weight = 20. */
export const SLOT_WEIGHTS: Record<SlotSymbol, number> = {
  "🍒": 5,
  "🍋": 5,
  "🍇": 4,
  "🔔": 3,
  "⭐": 2,
  "7️⃣": 1,
};

export const SLOT_TRIPLE_MULTIPLIER = 6;
export const SLOT_TRIPLE_SEVEN_MULTIPLIER = 15;
export const SLOT_PAIR_MULTIPLIER = 1.5;

export const CASINO_BET_OPTIONS = [50, 200];

export interface SpinResult {
  reels: SlotSymbol[];
  /** Payout multiplier for the bet (0 = lose). */
  multiplier: number;
}

function weightedPick(rng: () => number): SlotSymbol {
  const total = SLOT_SYMBOLS.reduce((n, s) => n + SLOT_WEIGHTS[s], 0);
  let roll = rng() * total;
  for (const symbol of SLOT_SYMBOLS) {
    roll -= SLOT_WEIGHTS[symbol];
    if (roll < 0) return symbol;
  }
  return SLOT_SYMBOLS[SLOT_SYMBOLS.length - 1];
}

/** Spin the 3-reel slot machine; deterministic for a given rng. */
export function spinSlots(rng: () => number): SpinResult {
  const reels: SlotSymbol[] = [
    weightedPick(rng),
    weightedPick(rng),
    weightedPick(rng),
  ];
  const [a, b, c] = reels;
  let multiplier = 0;
  if (a === b && b === c) {
    multiplier =
      a === "7️⃣" ? SLOT_TRIPLE_SEVEN_MULTIPLIER : SLOT_TRIPLE_MULTIPLIER;
  } else if (a === b || b === c || a === c) {
    multiplier = SLOT_PAIR_MULTIPLIER;
  }
  return { reels, multiplier };
}