import { describe, expect, it } from "vitest";
import { GameBridge } from "../src/game/bridge";
import { GameSession, CHOP_RANGE } from "../src/game/session";
import { getDish, PHONE_PRICE } from "shared";

function makeSession(): GameSession {
  const bridge = new GameBridge({
    bindings: { openInventory: "KeyE" },
    audio: { master: 1, music: 1, sfx: 1 },
  });
  return new GameSession(bridge);
}

describe("GameSession", () => {
  it("chops the nearest standing tree within range and adds logs", () => {
    const s = makeSession();
    const tree = s.forest.trees[0];
    // 6 hp at 5 dps -> a bit more than one second of chopping
    let outcome = null;
    for (let i = 0; i < 100; i++) {
      outcome = s.chopAt({ x: tree.position.x, y: tree.position.y }, 0.1);
      if (outcome?.completed) break;
    }
    expect(outcome?.completed).toBe(true);
    expect(s.inventory.logs).toBe(1);
    expect(tree.state).toBe("stump");
  });

  it("does not chop trees out of range", () => {
    const s = makeSession();
    const tree = s.forest.trees[0];
    const far = { x: tree.position.x + CHOP_RANGE + 500, y: tree.position.y };
    expect(s.chopAt(far, 1)).toBeNull();
  });

  it("sells logs for money", () => {
    const s = makeSession();
    s.inventory.logs = 3;
    s.sellAllLogs();
    expect(s.inventory.logs).toBe(0);
    expect(s.inventory.money).toBe(30);
  });

  it("orders food when affordable and cooks it over time", () => {
    const s = makeSession();
    s.inventory.money = 1000;
    s.orderFood("salad");
    expect(s.orders).toHaveLength(1);
    expect(s.orders[0].status).toBe("cooking");
    // salad takes 2s
    s.tick(2000);
    expect(s.orders[0].status).toBe("ready");
  });

  it("delivers a ready order to a seated player and records the collection", () => {
    const s = makeSession();
    s.inventory.money = 1000;
    s.orderFood("salad");
    s.tick(2000);
    const ready = s.peekReadyOrder();
    expect(ready).not.toBeNull();
    s.sitAt(0);
    expect(s.seatedTable).toBe(0);
    s.finishOrder(ready!);
    expect(ready!.status).toBe("served");
    expect(s.collection.entries["salad"].timesEaten).toBe(1);
    expect(s.bridge.getSnapshot().collection).toHaveLength(1);
  });

  it("rejects orders without enough money", () => {
    const s = makeSession();
    s.orderFood("steak");
    expect(s.orders).toHaveLength(0);
  });

  it("buys the phone once with enough money", () => {
    const s = makeSession();
    s.inventory.money = PHONE_PRICE;
    s.buyPhoneNow();
    expect(s.inventory.hasPhone).toBe(true);
    s.buyPhoneNow();
    expect(s.inventory.money).toBe(0);
  });

  it("standUp clears the seat", () => {
    const s = makeSession();
    s.sitAt(2);
    expect(s.seatedTable).toBe(2);
    s.standUp();
    expect(s.seatedTable).toBeNull();
  });

  it("routes order-food commands through the bridge", () => {
    const s = makeSession();
    s.inventory.money = 1000;
    s.bridge.send({ type: "order-food", dishId: "noodles" });
    expect(s.orders).toHaveLength(1);
    expect(getDish("noodles")!.price).toBe(35);
  });

  it("starts with an axe in slot 1 of a 10-slot hotbar", () => {
    const s = makeSession();
    const ui = s.bridge.getSnapshot();
    expect(ui.hotbar).toHaveLength(10);
    expect(ui.hotbar[0]).toBe("axe");
    expect(ui.hotbar.slice(1).every((i) => i === null)).toBe(true);
    expect(ui.selectedSlot).toBe(0);
  });

  it("selects hotbar slots via commands and clamps the index", () => {
    const s = makeSession();
    s.bridge.send({ type: "select-slot", index: 4 });
    expect(s.bridge.getSnapshot().selectedSlot).toBe(4);
    s.bridge.send({ type: "select-slot", index: -5 });
    expect(s.bridge.getSnapshot().selectedSlot).toBe(0);
    s.bridge.send({ type: "select-slot", index: 99 });
    expect(s.bridge.getSnapshot().selectedSlot).toBe(9);
  });
});