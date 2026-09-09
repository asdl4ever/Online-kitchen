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

/* ============ 骰子猜大小 ============ */

export type DiceChoice = "big" | "small";

export const DICE_PAYOUT_MULTIPLIER = 2.2;

export interface DiceRoll {
  dice: [number, number];
  sum: number;
  /** "big" (8-12), "small" (2-6), or "seven" (always loses). */
  side: DiceChoice | "seven";
}

export function rollDice(rng: () => number): DiceRoll {
  const d1 = 1 + Math.floor(rng() * 6);
  const d2 = 1 + Math.floor(rng() * 6);
  const sum = d1 + d2;
  const side: DiceRoll["side"] =
    sum === 7 ? "seven" : sum <= 6 ? "small" : "big";
  return { dice: [d1, d2], sum, side };
}

/** Multiplier for a correct guess; wrong guess or a seven pays nothing. */
export function diceMultiplier(roll: DiceRoll, choice: DiceChoice): number {
  if (roll.side === "seven" || roll.side !== choice) return 0;
  return DICE_PAYOUT_MULTIPLIER;
}