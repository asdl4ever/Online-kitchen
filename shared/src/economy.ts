export interface Inventory {
  logs: number;
  money: number;
  hasPhone: boolean;
}

export const STARTING_LOGS = 0;
export const STARTING_MONEY = 0;
export const WOOD_PRICE_PER_LOG = 10;
export const PHONE_PRICE = 100;
/** 9 wood slots x 9 per stack. */
export const MAX_LOGS = 81;

export function makeInventory(
  overrides: Partial<Inventory> = {},
): Inventory {
  return {
    logs: overrides.logs ?? STARTING_LOGS,
    money: overrides.money ?? STARTING_MONEY,
    hasPhone: overrides.hasPhone ?? false,
  };
}

export function buyPhone(inv: Inventory): boolean {
  if (inv.hasPhone) return false;
  if (!spendMoney(inv, PHONE_PRICE)) return false;
  inv.hasPhone = true;
  return true;
}

export function addLogs(inv: Inventory, amount: number): void {
  inv.logs = Math.max(0, inv.logs + amount);
}

export interface SellResult {
  sold: number;
  earned: number;
  rejected: number;
}

/** Sell up to `maxSell` logs at the wood price, with an optional pet bonus. */
export function sellLogs(inv: Inventory, maxSell: number, bonusPct = 0): SellResult {
  const toSell = Math.min(inv.logs, maxSell);
  if (toSell <= 0) return { sold: 0, earned: 0, rejected: maxSell };
  const earned = Math.floor(toSell * WOOD_PRICE_PER_LOG * (1 + bonusPct / 100));
  inv.logs -= toSell;
  inv.money += earned;
  return { sold: toSell, earned, rejected: maxSell - toSell };
}

export function canAfford(inv: Inventory, price: number): boolean {
  return inv.money >= price;
}

export function spendMoney(inv: Inventory, price: number): boolean {
  if (!canAfford(inv, price)) return false;
  inv.money -= price;
  return true;
}

export function addMoney(inv: Inventory, amount: number): void {
  inv.money = Math.max(0, inv.money + amount);
}

/** Arcade minigame economy. */
export const ARCADE_ENTRY_FEE = 20;
export const ARCADE_REWARD_PER_HIT = 2;