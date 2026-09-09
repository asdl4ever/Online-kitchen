import { describe, expect, it } from "vitest";
import { GameBridge } from "../src/game/bridge";
import { GameSession, CHOP_RANGE } from "../src/game/session";
import {
  getDish,
  getSnack,
  MAX_LOGS,
  PET_EGG_PRICE,
  petBonusPct,
  PHONE_PRICE,
  type Pet,
} from "shared";

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

  it("stops chopping when the wood slots are full", () => {
    const s = makeSession();
    s.inventory.logs = MAX_LOGS;
    const tree = s.forest.trees[0];
    expect(s.chopAt({ x: tree.position.x, y: tree.position.y }, 1)).toBeNull();
    expect(tree.state).toBe("standing");
  });

  it("sells street snacks instantly into the collection", () => {
    const s = makeSession();
    s.inventory.money = 100;
    s.orderSnack("skewer");
    expect(s.inventory.money).toBe(100 - getSnack("skewer")!.price);
    expect(s.collection.entries["skewer"].timesEaten).toBe(1);
  });

  it("rejects snacks without enough money", () => {
    const s = makeSession();
    s.orderSnack("boba");
    expect(s.collection.entries["boba"]).toBeUndefined();
  });

  it("pays arcade rewards per hit after charging the entry fee", () => {
    const s = makeSession();
    s.inventory.money = 100;
    expect(s.arcadeStart()).toBe(true);
    expect(s.inventory.money).toBe(100 - 20);
    s.arcadeFinish(15);
    expect(s.inventory.money).toBe(80 + 15 * 2);
  });

  it("refuses arcade entry without enough money", () => {
    const s = makeSession();
    expect(s.arcadeStart()).toBe(false);
  });

  it("spins the slot machine deterministically with an injected rng", () => {
    const s = makeSession();
    s.inventory.money = 500;
    // Always cherry triple (multiplier 6): bet 50 -> payout 300.
    s.casinoSpin(50, () => 0);
    expect(s.inventory.money).toBe(500 - 50 + 300);
    expect(s.bridge.getSnapshot().casinoResult?.reels).toEqual([
      "🍒",
      "🍒",
      "🍒",
    ]);
  });

  it("keeps the bet when the player cannot afford it", () => {
    const s = makeSession();
    s.inventory.money = 10;
    s.casinoSpin(50, () => 0);
    expect(s.inventory.money).toBe(10);
    expect(s.bridge.getSnapshot().casinoResult).toBeNull();
  });

  it("buys an egg into an empty hotbar slot and hatches a pet", () => {
    const s = makeSession();
    s.inventory.money = 1000;
    s.buyEgg();
    expect(s.inventory.money).toBe(1000 - PET_EGG_PRICE);
    const ui = s.bridge.getSnapshot();
    expect(ui.hotbar.filter((i) => i === "egg")).toHaveLength(1);

    // Deterministic hatch: rng 0 -> first species & common quality.
    s.hatchEgg(() => 0);
    expect(s.pets).toHaveLength(1);
    expect(s.activePetId).toBe(s.pets[0].id);
    expect(s.bridge.getSnapshot().hotbar.filter((i) => i === "egg")).toHaveLength(0);
    expect(s.bridge.getSnapshot().pets).toHaveLength(1);
  });

  it("adds a pet selling bonus to wood", () => {
    const s = makeSession();
    s.inventory.logs = 10;
    s.pets.push({ id: "pet-x", species: "dragon", quality: "legendary", stars: 1 });
    s.activePetId = "pet-x";
    s.sellAllLogs();
    // legendary 20% bonus: 10 * 10 * 1.2 = 120
    expect(s.inventory.money).toBe(120);
    expect(s.woodBonusPct()).toBe(20);
  });

  it("upgrades pet stars with money", () => {
    const s = makeSession();
    s.inventory.money = 1000;
    const pet: Pet = { id: "pet-u", species: "cat", quality: "rare", stars: 1 };
    s.pets.push(pet);
    s.activePetId = "pet-u";
    s.upgradePet("pet-u");
    expect(pet.stars).toBe(2);
    expect(s.inventory.money).toBe(1000 - 200);
    expect(s.woodBonusPct()).toBe(petBonusPct(pet));
  });

  it("switches the active pet", () => {
    const s = makeSession();
    s.pets.push(
      { id: "a", species: "dog", quality: "common", stars: 1 },
      { id: "b", species: "cat", quality: "epic", stars: 1 },
    );
    s.activePetId = "a";
    s.selectPet("b");
    expect(s.activePetId).toBe("b");
    expect(s.woodBonusPct()).toBe(10);
  });

  it("runs the fishing minigame: start, bite, catch, sell", () => {
    const s = makeSession();
    s.startFishing(() => 0); // 2s until bite
    expect(s.fishing?.phase).toBe("waiting");
    s.tick(2000); // clock reaches biteAt
    expect(s.fishing?.phase).toBe("bite");
    // Catch with rng 0 -> first fish (sardine)
    s.fishingAction(() => 0);
    expect(s.fishing).toBeNull();
    expect(s.fishBag["sardine"]).toBe(1);

    s.sellFish();
    expect(s.inventory.money).toBe(8);
  });

  it("escapes the fish if the bite window is missed", () => {
    const s = makeSession();
    s.startFishing(() => 0);
    s.tick(2000); // bite
    s.tick(2000); // 1.5s window passed
    expect(s.fishing).toBeNull();
    expect(Object.keys(s.fishBag)).toHaveLength(0);
  });

  it("applies furniture comfort as a fish price bonus", () => {
    const s = makeSession();
    s.inventory.money = 5000;
    s.buyHouse("maple");
    expect(s.ownedHouseIds).toContain("maple");
    s.buyFurniture("bed"); // comfort 8
    s.buyFurniture("sofa"); // comfort 5
    expect(s.comfort()).toBe(13);
    s.fishBag["sardine"] = 10; // raw 80 -> 80 * 1.13
    s.sellFish();
    expect(s.inventory.money).toBe(5000 - 2000 - 500 - 300 + Math.floor(80 * 1.13));
  });

  it("blocks furniture without a house", () => {
    const s = makeSession();
    s.inventory.money = 1000;
    s.buyFurniture("bed");
    expect(s.comfort()).toBe(0);
  });

  it("buys vehicles and applies speed multipliers", () => {
    const s = makeSession();
    s.inventory.money = 1000;
    s.buyVehicle("bike");
    expect(s.speedMult()).toBeCloseTo(1.3);
    expect(s.inventory.money).toBe(500);
    s.selectVehicle("bike"); // toggles off
    expect(s.speedMult()).toBe(1);
    s.selectVehicle("bike");
    expect(s.speedMult()).toBeCloseTo(1.3);
  });

  it("settles dice bets deterministically with an injected rng", () => {
    const s = makeSession();
    s.inventory.money = 1000;
    // Direct rule check: rng 0 -> 1+1=2 => small wins x2.2
    s.diceBetWithRng("small", 50, () => 0);
    expect(s.inventory.money).toBe(1000 - 50 + Math.floor(50 * 2.2));
    expect(s.bridge.getSnapshot().diceResult?.sum).toBe(2);
  });

  it("pays reaction rewards by speed", () => {
    const s = makeSession();
    s.inventory.money = 100;
    expect(s.reactionStart()).toBe(true);
    expect(s.inventory.money).toBe(90);
    s.reactionFinish(180);
    expect(s.inventory.money).toBe(90 + 100);
  });
});