import { describe, expect, it } from "vitest";
import {
  addLogs,
  buyPhone,
  canAfford,
  makeInventory,
  sellLogs,
  spendMoney,
  WOOD_PRICE_PER_LOG,
  PHONE_PRICE,
} from "../src/economy";

describe("economy", () => {
  it("starts with no logs and no money", () => {
    const inv = makeInventory();
    expect(inv.logs).toBe(0);
    expect(inv.money).toBe(0);
  });

  it("adds and clamps logs at zero", () => {
    const inv = makeInventory({ logs: 1 });
    addLogs(inv, -5);
    expect(inv.logs).toBe(0);
  });

  it("sells logs at the wood price and converts to money", () => {
    const inv = makeInventory({ logs: 3 });
    const result = sellLogs(inv, 3);
    expect(result.sold).toBe(3);
    expect(result.earned).toBe(3 * WOOD_PRICE_PER_LOG);
    expect(result.rejected).toBe(0);
    expect(inv.logs).toBe(0);
    expect(inv.money).toBe(3 * WOOD_PRICE_PER_LOG);
  });

  it("sells only what the player has", () => {
    const inv = makeInventory({ logs: 2 });
    const result = sellLogs(inv, 5);
    expect(result.sold).toBe(2);
    expect(result.rejected).toBe(3);
    expect(inv.logs).toBe(0);
  });

  it("returns no sale when the player has no logs", () => {
    const inv = makeInventory();
    expect(sellLogs(inv, 1)).toEqual({ sold: 0, earned: 0, rejected: 1 });
  });

  it("spends money only when affordable", () => {
    const inv = makeInventory({ money: 100 });
    expect(spendMoney(inv, 60)).toBe(true);
    expect(inv.money).toBe(40);
    expect(spendMoney(inv, 50)).toBe(false);
    expect(canAfford(inv, 50)).toBe(false);
  });

  it("buys a phone when the player has enough money", () => {
    const inv = makeInventory({ money: PHONE_PRICE });
    expect(buyPhone(inv)).toBe(true);
    expect(inv.hasPhone).toBe(true);
    expect(inv.money).toBe(0);
  });

  it("cannot buy a phone twice", () => {
    const inv = makeInventory({ money: 500, hasPhone: true });
    expect(buyPhone(inv)).toBe(false);
    expect(inv.money).toBe(500);
  });

  it("cannot buy a phone without enough money", () => {
    const inv = makeInventory({ money: PHONE_PRICE - 1 });
    expect(buyPhone(inv)).toBe(false);
    expect(inv.hasPhone).toBe(false);
  });
});