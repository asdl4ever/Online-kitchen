import { spendMoney, type Inventory } from "./economy";

export interface Dish {
  id: string;
  name: string;
  price: number;
  emoji: string;
  /** Seconds the kitchen takes to prepare this dish. */
  cookSeconds: number;
}

export type OrderStatus = "cooking" | "ready" | "served";

export interface Order {
  id: string;
  dishId: string;
  customerId: string;
  status: OrderStatus;
  placedAtSeconds: number;
  readyAtSeconds: number;
}

export const DISHES: Dish[] = [
  { id: "steak", name: "香煎牛排", price: 60, emoji: "🥩", cookSeconds: 6 },
  { id: "noodles", name: "番茄鸡蛋面", price: 35, emoji: "🍜", cookSeconds: 4 },
  { id: "salad", name: "田园沙拉", price: 20, emoji: "🥗", cookSeconds: 2 },
  { id: "soup", name: "奶油蘑菇汤", price: 25, emoji: "🍲", cookSeconds: 3 },
  { id: "cake", name: "草莓蛋糕", price: 30, emoji: "🍰", cookSeconds: 3 },
];

export function getDish(dishId: string): Dish | undefined {
  return DISHES.find((d) => d.id === dishId);
}

export interface PlaceOrderInput {
  inventory: Inventory;
  dishId: string;
  customerId: string;
  nowSeconds: number;
  /** Overridable sequence for deterministic order ids in tests. */
  nextOrderSeq?: () => number;
}

export interface PlaceOrderResult {
  ok: boolean;
  reason?: "unknown-dish" | "insufficient-funds";
  order?: Order;
}

let orderSeq = 0;

export function placeOrder(input: PlaceOrderInput): PlaceOrderResult {
  const dish = getDish(input.dishId);
  if (!dish) return { ok: false, reason: "unknown-dish" };
  if (!spendMoney(input.inventory, dish.price)) {
    return { ok: false, reason: "insufficient-funds" };
  }
  const seq = input.nextOrderSeq ? input.nextOrderSeq() : orderSeq++;
  const order: Order = {
    id: `order-${input.customerId}-${seq}`,
    dishId: dish.id,
    customerId: input.customerId,
    status: "cooking",
    placedAtSeconds: input.nowSeconds,
    readyAtSeconds: input.nowSeconds + dish.cookSeconds,
  };
  return { ok: true, order };
}

/** Advance pending orders: cooking -> ready once cook time passes. */
export function tickOrders(
  orders: Order[],
  nowSeconds: number,
): Order[] {
  for (const order of orders) {
    if (order.status === "cooking" && nowSeconds >= order.readyAtSeconds) {
      order.status = "ready";
    }
  }
  return orders;
}

/** Server (or host) marks a ready order as served, e.g. delivered to a table. */
export function serveOrder(order: Order): boolean {
  if (order.status !== "ready") return false;
  order.status = "served";
  return true;
}