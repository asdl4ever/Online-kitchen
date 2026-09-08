import { describe, expect, it } from "vitest";
import {
  getDish,
  placeOrder,
  serveOrder,
  tickOrders,
  DISHES,
} from "../src/menu";
import { makeInventory } from "../src/economy";

describe("menu & orders", () => {
  it("defines a non-empty menu with prices", () => {
    expect(DISHES.length).toBeGreaterThan(0);
    for (const dish of DISHES) {
      expect(dish.price).toBeGreaterThan(0);
      expect(dish.cookSeconds).toBeGreaterThan(0);
    }
  });

  it("places a paid order and takes money", () => {
    const inv = makeInventory({ money: 100 });
    const seq = () => 7;
    const result = placeOrder({
      inventory: inv,
      dishId: "steak",
      customerId: "p1",
      nowSeconds: 0,
      nextOrderSeq: seq,
    });
    expect(result.ok).toBe(true);
    expect(result.order?.status).toBe("cooking");
    expect(result.order?.readyAtSeconds).toBe(getDish("steak")!.cookSeconds);
    expect(inv.money).toBe(100 - getDish("steak")!.price);
  });

  it("rejects unknown dishes", () => {
    const result = placeOrder({
      inventory: makeInventory({ money: 999 }),
      dishId: "nope",
      customerId: "p1",
      nowSeconds: 0,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("unknown-dish");
  });

  it("rejects orders the player cannot afford", () => {
    const result = placeOrder({
      inventory: makeInventory({ money: 5 }),
      dishId: "steak",
      customerId: "p1",
      nowSeconds: 0,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("insufficient-funds");
  });

  it("marks orders ready after cook time elapses", () => {
    const inv = makeInventory({ money: 999 });
    const result = placeOrder({
      inventory: inv,
      dishId: "salad",
      customerId: "p1",
      nowSeconds: 0,
    });
    const orders = result.ok ? [result.order!] : [];
    expect(orders[0].status).toBe("cooking");
    tickOrders(orders, 1.9);
    expect(orders[0].status).toBe("cooking");
    tickOrders(orders, 2);
    expect(orders[0].status).toBe("ready");
  });

  it("serves only ready orders", () => {
    const inv = makeInventory({ money: 999 });
    const cooking = placeOrder({
      inventory: inv,
      dishId: "salad",
      customerId: "p1",
      nowSeconds: 0,
    });
    expect(cooking.ok && serveOrder(cooking.order!)).toBe(false);

    const cooked = placeOrder({
      inventory: inv,
      dishId: "salad",
      customerId: "p1",
      nowSeconds: 0,
    });
    const orders = cooked.ok ? [cooked.order!] : [];
    tickOrders(orders, 99);
    expect(serveOrder(orders[0])).toBe(true);
    expect(orders[0].status).toBe("served");
  });
});