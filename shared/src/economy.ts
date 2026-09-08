export interface Inventory {
  logs: number;
  money: number;
}

export const STARTING_LOGS = 0;
export const STARTING_MONEY = 0;
export const WOOD_PRICE_PER_LOG = 10;

export function makeInventory(
  overrides: Partial<Inventory> = {},
): Inventory {
  return {
    logs: overrides.logs ?? STARTING_LOGS,
    money: overrides.money ?? STARTING_MONEY,
  };
}

export function addLogs(inv: Inventory, amount: number): void {
  inv.logs = Math.max(0, inv.logs + amount);
}

export interface SellResult {
  sold: number;
  earned: number;
  rejected: number;
}

/** Sell up to `maxSell` logs at the wood price. Returns what happened. */
export function sellLogs(inv: Inventory, maxSell: number): SellResult {
  const toSell = Math.min(inv.logs, maxSell);
  if (toSell <= 0) return { sold: 0, earned: 0, rejected: maxSell };
  const earned = toSell * WOOD_PRICE_PER_LOG;
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