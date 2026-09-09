import {
  AREAS,
  type ForestState,
  type Order,
  ARCADE_ENTRY_FEE,
  ARCADE_REWARD_PER_HIT,
  addLogs,
  buyPhone,
  chopTree,
  generateForestTrees,
  getDish,
  getSnack,
  makeFoodCollection,
  makeInventory,
  makeTree,
  MAX_LOGS,
  placeOrder,
  recordEat,
  rebind,
  scheduleRegrow,
  sellLogs,
  serveOrder,
  spinSlots,
  tickForest,
  tickOrders,
  CASINO_BET_OPTIONS,
  type Dish,
} from "shared";
import {
  GameBridge,
  type BridgeCommand,
  type OrderView,
} from "./bridge";
import { spendMoney, addMoney } from "shared";

export const SESSION_KEY = "game-session";

export interface ChopOutcome {
  treeId: string;
  /** 0..1 how fully the tree has been chopped. */
  progress: number;
  completed: boolean;
  logDropped: number;
}

/** How far (px) the player can be from a tree to chop it. */
export const CHOP_RANGE = 110;
/** Damage per second while holding the mouse button near a tree. */
export const CHOP_DPS = 5;

function makeForestTrees(): ForestState["trees"] {
  const forestArea = AREAS.find((a) => a.kind === "forest")!;
  const points = generateForestTrees(forestArea.bounds, {
    seed: 20260908,
    count: 24,
    minDistance: 95,
    clusters: 3,
  });
  return points.map((p, i) =>
    makeTree(`tree-${i}`, p, { maxHp: 6, logDrop: 1, regrowSeconds: 12 }),
  );
}

/**
 * Owns all rule state (inventory, forest, orders, collection) and the
 * bridge command handlers. Scenes are views: they render and feed input,
 * but never own game data, so switching between map and indoor rooms
 * keeps progress intact.
 */
export class GameSession {
  readonly bridge: GameBridge;
  readonly inventory = makeInventory();
  readonly orders: Order[] = [];
  readonly collection = makeFoodCollection();
  readonly forest: ForestState;

  gameClock = 0;
  seatedTable: number | null = null;

  private orderSeq = 0;
  private lastFullToastAt = -999;

  constructor(bridge: GameBridge, forest?: ForestState) {
    this.bridge = bridge;
    this.forest = forest ?? { trees: makeForestTrees() };
    this.registerCommands();
  }

  /** Advance the world clock and settle forest regrowth / cooking orders. */
  tick(dtMs: number): void {
    this.gameClock += dtMs / 1000;
    tickForest(this.forest, this.gameClock);
    tickOrders(this.orders, this.gameClock);
  }

  chopAt(
    playerPos: { x: number; y: number },
    dtSeconds: number,
  ): ChopOutcome | null {
    if (this.inventory.logs >= MAX_LOGS) {
      if (this.gameClock - this.lastFullToastAt > 3) {
        this.lastFullToastAt = this.gameClock;
        this.bridge.showToast("背包满了，先去木材店卖掉木材吧", "🎒");
      }
      return null;
    }
    let nearest: (typeof this.forest.trees)[number] | null = null;
    let nearestDist = CHOP_RANGE;
    for (const tree of this.forest.trees) {
      if (tree.state !== "standing") continue;
      const d = Math.hypot(tree.position.x - playerPos.x, tree.position.y - playerPos.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = tree;
      }
    }
    if (!nearest) return null;
    const result = chopTree(nearest, CHOP_DPS * dtSeconds);
    const progress = 1 - nearest.hp / nearest.maxHp;
    if (result.completed) {
      addLogs(this.inventory, result.logDropped);
      scheduleRegrow(nearest, this.gameClock);
      this.bridge.showToast(`获得木材 x${result.logDropped}`, "🪵");
      this.publishSnapshot();
    }
    return {
      treeId: nearest.id,
      progress,
      completed: result.completed,
      logDropped: result.logDropped,
    };
  }

  sellAllLogs(): void {
    const result = sellLogs(this.inventory, this.inventory.logs);
    this.publishSnapshot();
    if (result.sold > 0) {
      this.bridge.showToast(`卖出 ${result.sold} 根木材 +${result.earned} 元`, "💰");
    } else {
      this.bridge.showToast("还没有木材可卖", "🧺");
    }
  }

  buyPhoneNow(): void {
    const bought = buyPhone(this.inventory);
    this.publishSnapshot();
    if (bought) {
      this.bridge.patch({ phoneShopOpen: false });
      this.bridge.showToast("已购入手机，可随时远程点餐", "📱");
    } else if (this.inventory.hasPhone) {
      this.bridge.showToast("你已经有手机啦", "📱");
    } else {
      this.bridge.showToast("钱不够买手机", "😢");
    }
  }

  orderFood(dishId: string): void {
    const dish = getDish(dishId);
    const result = placeOrder({
      inventory: this.inventory,
      dishId,
      customerId: "local",
      nowSeconds: this.gameClock,
    });
    this.publishSnapshot();
    if (!result.ok || !result.order) {
      this.bridge.showToast(
        result.reason === "insufficient-funds" ? "钱不够哦" : "菜品不存在",
        "😢",
      );
      return;
    }
    this.orders.push(result.order);
    this.publishSnapshot();
    const wasPhone = this.bridge.getSnapshot().phoneAppOpen;
    this.bridge.patch({ menuOpen: false, phoneAppOpen: false });
    this.bridge.showToast(
      wasPhone
        ? `手机下单成功：${dish?.name ?? ""}，请就座等待`
        : `已下单 ${dish?.name ?? ""}，请就座等待`,
      "🧾",
    );
  }

  sitAt(tableIndex: number): void {
    this.seatedTable = tableIndex;
    this.bridge.patch({ seated: true });
    this.bridge.showToast(`已入座 ${tableIndex + 1} 号桌`, "💺");
  }

  standUp(silent = false): void {
    if (this.seatedTable === null) return;
    this.seatedTable = null;
    this.bridge.patch({ seated: false });
    if (!silent) this.bridge.showToast("已起身", "🚶");
  }

  /** First ready order, if any (delivery claims it with serveOrder). */
  peekReadyOrder(): Order | null {
    return this.orders.find((o) => o.status === "ready") ?? null;
  }

  /** Mark the order served and record it into the food collection. */
  finishOrder(order: Order): void {
    serveOrder(order);
    const dish = getDish(order.dishId);
    if (dish) {
      recordEat({
        collection: this.collection,
        dishId: dish.id,
        nowSeconds: this.gameClock,
      });
      this.bridge.showToast(`上菜啦：${dish.name}，请享用！`, dish.emoji);
    }
    this.publishSnapshot();
  }

  publishSnapshot(): void {
    const orders: OrderView[] = this.orders.map((o) => ({
      id: o.id,
      dish: getDish(o.dishId)!,
      status: o.status,
      placedAt: o.placedAtSeconds,
      readyAt: o.readyAtSeconds,
    }));
    this.bridge.updateSnapshot({
      logs: this.inventory.logs,
      money: this.inventory.money,
      hasPhone: this.inventory.hasPhone,
      orders,
      collection: Object.values(this.collection.entries),
    });
  }

  dishOf(order: Order): Dish {
    return getDish(order.dishId)!;
  }

  /** Street snack: pay & eat instantly, counts into the collection. */
  orderSnack(snackId: string): void {
    const snack = getSnack(snackId);
    if (!snack) return;
    if (!spendMoney(this.inventory, snack.price)) {
      this.bridge.showToast("钱不够哦", "😢");
      return;
    }
    recordEat({
      collection: this.collection,
      dishId: snack.id,
      nowSeconds: this.gameClock,
    });
    this.publishSnapshot();
    this.bridge.showToast(`吃掉 ${snack.name} ${snack.emoji}，真香！`, snack.emoji);
  }

  /** Pay the entry fee for whack-a-mole; the overlay runs the game. */
  arcadeStart(): boolean {
    if (!spendMoney(this.inventory, ARCADE_ENTRY_FEE)) {
      this.bridge.showToast(`入场费要 ${ARCADE_ENTRY_FEE} 元哦`, "🕹️");
      return false;
    }
    this.publishSnapshot();
    return true;
  }

  /** Reward the player for their whack-a-mole score. */
  arcadeFinish(score: number): void {
    const payout = Math.max(0, Math.floor(score)) * ARCADE_REWARD_PER_HIT;
    addMoney(this.inventory, payout);
    this.publishSnapshot();
    this.bridge.showToast(
      `打地鼠命中 ${score} 只，赢得 ${payout} 元 🕹️`,
      "🎉",
    );
  }

  /** Spin the slot machine; result is stored for the overlay to reveal. */
  casinoSpin(bet: number, rng: () => number = Math.random): void {
    if (!CASINO_BET_OPTIONS.includes(bet)) return;
    if (!spendMoney(this.inventory, bet)) {
      this.bridge.showToast("赌本不够哦，量力而行", "🎰");
      return;
    }
    const { reels, multiplier } = spinSlots(rng);
    const payout = Math.floor(bet * multiplier);
    if (payout > 0) addMoney(this.inventory, payout);
    this.publishSnapshot();
    this.bridge.patch({
      casinoResult: { reels: [...reels], bet, payout },
    });
  }

  private registerCommands(): void {
    const handler = (c: BridgeCommand) => this.handleCommand(c);
    for (const type of [
      "toggle-inventory",
      "toggle-settings",
      "open-menu",
      "close-menu",
      "open-depot",
      "close-depot",
      "open-phone-shop",
      "close-phone-shop",
      "buy-phone",
      "open-phone-app",
      "close-phone-app",
      "toggle-collection",
      "order-food",
      "sell-all-logs",
      "sit-at-table",
      "press-interact",
      "set-audio",
      "rebind",
      "select-slot",
      "open-snacks",
      "close-snacks",
      "order-snack",
      "open-arcade",
      "close-arcade",
      "arcade-start",
      "arcade-finish",
      "open-casino",
      "close-casino",
      "casino-spin",
    ] as const) {
      this.bridge.on(type, handler);
    }
  }

  private handleCommand(c: BridgeCommand): void {
    const ui = this.bridge.getSnapshot();
    switch (c.type) {
      case "toggle-inventory":
        this.bridge.patch({ inventoryOpen: !ui.inventoryOpen });
        break;
      case "toggle-settings":
        this.bridge.patch({ settingsOpen: !ui.settingsOpen });
        break;
      case "open-menu":
        this.bridge.patch({ menuOpen: true });
        break;
      case "close-menu":
        this.bridge.patch({ menuOpen: false });
        break;
      case "open-depot":
        this.bridge.patch({ depotOpen: true });
        break;
      case "close-depot":
        this.bridge.patch({ depotOpen: false });
        break;
      case "open-phone-shop":
        this.bridge.patch({ phoneShopOpen: true });
        break;
      case "close-phone-shop":
        this.bridge.patch({ phoneShopOpen: false });
        break;
      case "buy-phone":
        this.buyPhoneNow();
        break;
      case "open-phone-app":
        if (!this.inventory.hasPhone) {
          this.bridge.showToast("还没有手机，去手机店买一部吧", "📵");
          break;
        }
        this.bridge.patch({ phoneAppOpen: !ui.phoneAppOpen });
        break;
      case "close-phone-app":
        this.bridge.patch({ phoneAppOpen: false });
        break;
      case "toggle-collection":
        this.bridge.patch({ collectionOpen: !ui.collectionOpen });
        break;
      case "order-food":
        this.orderFood(c.dishId);
        break;
      case "sell-all-logs":
        this.sellAllLogs();
        break;
      case "sit-at-table":
        // Scene-side interactions handle seating precisely; no-op fallback.
        break;
      case "press-interact":
        // F key is handled by the active scene; no-op for remote triggers.
        break;
      case "set-audio":
        this.bridge.patch({ audio: c.audio });
        break;
      case "rebind": {
        const result = rebind({
          bindings: ui.bindings,
          action: c.action as never,
          key: c.key,
        });
        this.bridge.patch({ bindings: result.bindings });
        break;
      }
      case "select-slot": {
        const index = Math.max(0, Math.min(9, Math.floor(c.index)));
        this.bridge.patch({ selectedSlot: index });
        break;
      }
      case "open-snacks":
        this.bridge.patch({ snackStreetOpen: true });
        break;
      case "close-snacks":
        this.bridge.patch({ snackStreetOpen: false });
        break;
      case "order-snack":
        this.orderSnack(c.snackId);
        break;
      case "open-arcade":
        this.bridge.patch({ arcadeOpen: true });
        break;
      case "close-arcade":
        this.bridge.patch({ arcadeOpen: false });
        break;
      case "arcade-start":
        this.arcadeStart();
        break;
      case "arcade-finish":
        this.arcadeFinish(c.score);
        break;
      case "open-casino":
        this.bridge.patch({ casinoOpen: true });
        break;
      case "close-casino":
        this.bridge.patch({ casinoOpen: false });
        break;
      case "casino-spin":
        this.casinoSpin(c.bet);
        break;
    }
  }
}