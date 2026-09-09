export const REACTION_ENTRY_FEE = 10;
/** The light turns on after a random delay within this range (ms). */
export const REACTION_LIGHT_MIN_MS = 1500;
export const REACTION_LIGHT_MAX_MS = 4500;

/** Reward for a reaction time in milliseconds (clicking before the light = cheat). */
export function reactionReward(ms: number): number {
  if (ms < 0) return 0;
  if (ms <= 200) return 100;
  if (ms <= 300) return 60;
  if (ms <= 400) return 35;
  if (ms <= 500) return 20;
  return 5;
}
